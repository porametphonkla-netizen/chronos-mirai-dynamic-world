CREATE TABLE IF NOT EXISTS worlds (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  seed text NOT NULL,
  owner_token_hash text NOT NULL,
  current_revision integer NOT NULL DEFAULT 0 CHECK (current_revision >= 0),
  is_paused boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS world_revisions (
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision >= 0),
  tick integer NOT NULL CHECK (tick >= 0),
  parent_revision integer,
  state jsonb NOT NULL,
  rules_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, revision),
  UNIQUE (world_id, tick),
  FOREIGN KEY (world_id, parent_revision) REFERENCES world_revisions(world_id, revision) ON DELETE RESTRICT
);

ALTER TABLE worlds DROP CONSTRAINT IF EXISTS worlds_current_revision_fk;
ALTER TABLE worlds ADD CONSTRAINT worlds_current_revision_fk
  FOREIGN KEY (id, current_revision) REFERENCES world_revisions(world_id, revision) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS world_snapshots (
  world_id uuid NOT NULL,
  revision integer NOT NULL,
  state jsonb NOT NULL,
  state_checksum text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, revision),
  FOREIGN KEY (world_id, revision) REFERENCES world_revisions(world_id, revision) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS world_commands (
  id uuid PRIMARY KEY,
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  expected_revision integer NOT NULL,
  acceptance_sequence bigserial NOT NULL,
  command_type text NOT NULL,
  command_payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('accepted', 'rejected')),
  result_revision integer,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_id, idempotency_key),
  FOREIGN KEY (world_id, result_revision) REFERENCES world_revisions(world_id, revision) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS world_commands_order_idx ON world_commands(world_id, acceptance_sequence);

CREATE TABLE IF NOT EXISTS world_events (
  id uuid PRIMARY KEY,
  world_id uuid NOT NULL,
  revision integer NOT NULL,
  event_sequence integer NOT NULL CHECK (event_sequence >= 0),
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  command_id uuid REFERENCES world_commands(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_id, revision, event_sequence),
  FOREIGN KEY (world_id, revision) REFERENCES world_revisions(world_id, revision) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS business_transactions (
  id uuid PRIMARY KEY,
  world_id uuid NOT NULL,
  revision integer NOT NULL,
  command_id uuid NOT NULL UNIQUE REFERENCES world_commands(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES world_events(id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('capital','purchase','sale','expense','payroll')),
  product_id text,
  quantity integer CHECK (quantity IS NULL OR quantity > 0),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (world_id, revision) REFERENCES world_revisions(world_id, revision) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS business_transactions_world_time_idx ON business_transactions(world_id, created_at);

CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY,
  world_id uuid NOT NULL,
  command_id uuid NOT NULL UNIQUE REFERENCES world_commands(id) ON DELETE RESTRICT,
  context_revision integer NOT NULL,
  action_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (world_id, context_revision) REFERENCES world_revisions(world_id, revision) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS decision_outcomes (
  id uuid PRIMARY KEY,
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES world_events(id) ON DELETE RESTRICT,
  attribution text NOT NULL CHECK (attribution IN ('direct', 'associated', 'uncertain')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, event_id)
);

CREATE TABLE IF NOT EXISTS outbox_jobs (
  id uuid PRIMARY KEY,
  job_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_type, dedupe_key)
);

CREATE OR REPLACE FUNCTION reject_immutable_record_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable record in table % cannot be changed', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER world_revisions_immutable BEFORE UPDATE OR DELETE ON world_revisions FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();
CREATE TRIGGER world_events_immutable BEFORE UPDATE OR DELETE ON world_events FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();
CREATE TRIGGER world_snapshots_immutable BEFORE UPDATE OR DELETE ON world_snapshots FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();
CREATE TRIGGER decisions_immutable BEFORE UPDATE OR DELETE ON decisions FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();
CREATE TRIGGER business_transactions_immutable BEFORE UPDATE OR DELETE ON business_transactions FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();
