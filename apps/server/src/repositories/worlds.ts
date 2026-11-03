import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import type { WorldState } from "@chronos/contracts";
import { pool } from "../db/pool.js";
import { applyCommand, initialState, type Command } from "../domain/world.js";

const RULES_VERSION = "mvp-1";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function authorized(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const a = Buffer.from(expected, "hex"); const b = Buffer.from(hash(actual), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createWorld(name: string) {
  const id = randomUUID();
  const seed = randomBytes(8).toString("hex");
  const accessToken = randomBytes(32).toString("base64url");
  const state = initialState(seed);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO worlds (id,name,seed,owner_token_hash) VALUES ($1,$2,$3,$4)", [id,name,seed,hash(accessToken)]);
    await client.query("INSERT INTO world_revisions (world_id,revision,tick,parent_revision,state,rules_version) VALUES ($1,0,0,NULL,$2,$3)", [id,state,RULES_VERSION]);
    await client.query("INSERT INTO world_snapshots (world_id,revision,state,state_checksum) VALUES ($1,0,$2,$3)", [id,state,hash(JSON.stringify(state))]);
    await client.query("COMMIT");
    return { id, name, seed, currentRevision: 0, state, accessToken, createdAt: new Date().toISOString() };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function getWorld(id: string, token?: string) {
  const { rows } = await pool.query(`SELECT w.id,w.name,w.seed,w.current_revision,w.created_at,w.owner_token_hash,r.state
    FROM worlds w JOIN world_revisions r ON r.world_id=w.id AND r.revision=w.current_revision WHERE w.id=$1`, [id]);
  const row = rows[0];
  if (!row || !authorized(row.owner_token_hash, token)) return null;
  return { id: row.id, name: row.name, seed: row.seed, currentRevision: row.current_revision, createdAt: row.created_at, state: row.state as WorldState };
}

export async function executeCommand(id: string, token: string | undefined, idempotencyKey: string, expectedRevision: number, command: Command) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM worlds WHERE id=$1 FOR UPDATE", [id]);
    const world = rows[0];
    if (!world || !authorized(world.owner_token_hash, token)) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" as const }; }
    const duplicate = await client.query("SELECT status,result_revision,result FROM world_commands WHERE world_id=$1 AND idempotency_key=$2", [id,idempotencyKey]);
    if (duplicate.rowCount) {
      await client.query("COMMIT");
      return { duplicate: true, status: duplicate.rows[0].status, revision: duplicate.rows[0].result_revision, result: duplicate.rows[0].result };
    }
    if (world.current_revision !== expectedRevision) { await client.query("ROLLBACK"); return { error: "REVISION_CONFLICT" as const, currentRevision: world.current_revision }; }
    const stateRow = await client.query("SELECT state FROM world_revisions WHERE world_id=$1 AND revision=$2", [id,world.current_revision]);
    let applied: ReturnType<typeof applyCommand>;
    try { applied = applyCommand(stateRow.rows[0].state, command); }
    catch (error) {
      const message = error instanceof Error ? error.message : "COMMAND_INVALID";
      await client.query("INSERT INTO world_commands (id,world_id,idempotency_key,expected_revision,command_type,command_payload,status,result) VALUES ($1,$2,$3,$4,$5,$6,'rejected',$7)", [command.id,id,idempotencyKey,expectedRevision,command.type,command,{ error: message }]);
      await client.query("COMMIT");
      return { error: message as string };
    }
    const revision = world.current_revision + 1;
    const tick = revision;
    await client.query("INSERT INTO world_commands (id,world_id,idempotency_key,expected_revision,command_type,command_payload,status,result) VALUES ($1,$2,$3,$4,$5,$6,'accepted',$7)", [command.id,id,idempotencyKey,expectedRevision,command.type,command,{ events: applied.events }]);
    await client.query("INSERT INTO world_revisions (world_id,revision,tick,parent_revision,state,rules_version) VALUES ($1,$2,$3,$4,$5,$6)", [id,revision,tick,world.current_revision,applied.state,RULES_VERSION]);
    for (const [i,event] of applied.events.entries()) {
      const eventResult = await client.query("INSERT INTO world_events (id,world_id,revision,event_sequence,event_type,event_data,command_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id", [randomUUID(),id,revision,i,event.type,event.data,command.id]);
      const transactionType = event.type === "business.created" ? "capital" : event.type === "business.stock-purchased" ? "purchase" : event.type === "business.sale" ? "sale" : null;
      if (transactionType) {
        await client.query("INSERT INTO business_transactions (id,world_id,revision,command_id,event_id,transaction_type,product_id,quantity,amount_minor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [randomUUID(),id,revision,command.id,eventResult.rows[0].id,transactionType,event.data.productId ?? null,event.data.quantity ?? null,event.data.totalMinor ?? event.data.capitalMinor]);
      }
      if (command.type !== "move" && command.type !== "advance-day" && command.type !== "advance-time") {
        const decisionId = randomUUID();
        await client.query("INSERT INTO decisions (id,world_id,command_id,context_revision,action_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (command_id) DO NOTHING", [decisionId,id,command.id,world.current_revision,command.type]);
        const d = await client.query("SELECT id FROM decisions WHERE command_id=$1", [command.id]);
        if (d.rowCount) await client.query("INSERT INTO decision_outcomes (id,decision_id,event_id,attribution) VALUES ($1,$2,$3,'direct') ON CONFLICT DO NOTHING", [randomUUID(),d.rows[0].id,eventResult.rows[0].id]);
      }
    }
    if (revision % 10 === 0) await client.query("INSERT INTO world_snapshots (world_id,revision,state,state_checksum) VALUES ($1,$2,$3,$4)", [id,revision,applied.state,hash(JSON.stringify(applied.state))]);
    await client.query("UPDATE worlds SET current_revision=$2 WHERE id=$1", [id,revision]);
    await client.query("UPDATE world_commands SET result_revision=$2 WHERE id=$1", [command.id,revision]);
    await client.query("INSERT INTO outbox_jobs (id,job_type,aggregate_id,payload,dedupe_key) VALUES ($1,'world.revision',$2,$3,$4) ON CONFLICT DO NOTHING", [randomUUID(),id,{ worldId:id,revision },`${id}:${revision}`]);
    await client.query("COMMIT");
    return { status: "accepted", revision, state: applied.state, events: applied.events };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
