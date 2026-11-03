import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";
import { pool } from "./db/pool.js";
import { createWorld, executeCommand, getWorld } from "./repositories/worlds.js";
import { parseCommand } from "./domain/world.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" });
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

app.setErrorHandler((error, request, reply) => {
  const causes = error instanceof AggregateError ? error.errors : [error];
  if (causes.some(cause => Boolean(cause && typeof cause === "object" && "code" in cause && cause.code === "ECONNREFUSED"))) {
    request.log.error({ err: error }, "database connection refused");
    return reply.code(503).send({ error: { code: "DATABASE_UNAVAILABLE", message: "ฐานข้อมูลยังไม่พร้อม กรุณาเริ่ม PostgreSQL และรัน migration ก่อนสร้างโลก" } });
  }
  request.log.error({ err: error }, "request failed");
  return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ" } });
});

app.get("/health", async (_request, reply) => {
  try { await pool.query("SELECT 1"); return { status: "ok", database: "connected" }; }
  catch { return reply.code(503).send({ status: "unavailable", database: "disconnected" }); }
});

app.post<{ Body: { name?: string } }>("/v1/worlds", async (request, reply) => {
  const name = request.body?.name?.trim();
  if (!name || name.length > 80) return reply.code(400).send({ error: { code: "INVALID_WORLD_NAME", message: "ชื่อโลกต้องมีความยาว 1–80 ตัวอักษร" } });
  return reply.code(201).send(await createWorld(name));
});

app.get<{ Params: { worldId: string }; Headers: { "x-world-token"?: string } }>("/v1/worlds/:worldId", async (request, reply) => {
  if (!isUuid(request.params.worldId)) return reply.code(404).send({ error: { code: "WORLD_NOT_FOUND", message: "ไม่พบโลกหรือไม่มีสิทธิ์เข้าถึง" } });
  const world = await getWorld(request.params.worldId, request.headers["x-world-token"]);
  if (!world) return reply.code(404).send({ error: { code: "WORLD_NOT_FOUND", message: "ไม่พบโลกหรือไม่มีสิทธิ์เข้าถึง" } });
  return world;
});

app.post<{ Params: { worldId: string }; Headers: { "x-world-token"?: string; "idempotency-key"?: string }; Body: { commandId?: string; expectedRevision?: number; command?: unknown } }>("/v1/worlds/:worldId/commands", async (request, reply) => {
  const { commandId, expectedRevision, command } = request.body ?? {};
  const key = request.headers["idempotency-key"];
  const parsedCommand = parseCommand(command);
  if (!isUuid(request.params.worldId) || !key || key.length > 128 || !commandId || !isUuid(commandId) || !parsedCommand || !Number.isInteger(expectedRevision) || parsedCommand.id !== commandId) {
    return reply.code(400).send({ error: { code: "INVALID_COMMAND", message: "คำสั่งไม่ถูกต้อง" } });
  }
  const result = await executeCommand(request.params.worldId, request.headers["x-world-token"], key, expectedRevision!, parsedCommand);
  if ("error" in result) {
    if (result.error === "NOT_FOUND") return reply.code(404).send({ error: { code: result.error, message: "ไม่พบโลกหรือไม่มีสิทธิ์เข้าถึง" } });
    if (result.error === "REVISION_CONFLICT") return reply.code(409).send({ error: { code: result.error, currentRevision: result.currentRevision } });
    return reply.code(422).send({ error: { code: result.error, message: "ไม่สามารถดำเนินการคำสั่งนี้ได้" } });
  }
  return result;
});

app.get<{ Params: { worldId: string }; Headers: { "x-world-token"?: string } }>("/v1/worlds/:worldId/decisions", async (request, reply) => {
  const world = await getWorld(request.params.worldId, request.headers["x-world-token"]);
  if (!world) return reply.code(404).send({ error: { code: "WORLD_NOT_FOUND", message: "ไม่พบโลกหรือไม่มีสิทธิ์เข้าถึง" } });
  const { rows } = await pool.query(`SELECT d.id,d.action_id,d.context_revision,d.created_at,e.event_type,e.event_data,o.attribution
    FROM decisions d LEFT JOIN decision_outcomes o ON o.decision_id=d.id LEFT JOIN world_events e ON e.id=o.event_id
    WHERE d.world_id=$1 ORDER BY d.created_at DESC LIMIT 100`, [request.params.worldId]);
  return { items: rows };
});

app.addHook("onClose", async () => { await pool.end(); });

const port = Number(process.env.API_PORT ?? 3001);
try { await app.listen({ port, host: "0.0.0.0" }); }
catch (error) { app.log.error(error); process.exit(1); }
