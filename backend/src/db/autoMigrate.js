require('dotenv').config();
const { query, pool } = require('./index');

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'researcher',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS simulation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200),
    scheduler_mode  VARCHAR(50)  NOT NULL,
    workload_type   VARCHAR(50)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'running',
    total_requests  INTEGER      NOT NULL DEFAULT 0,
    total_violations INTEGER     NOT NULL DEFAULT 0,
    avg_ttft_ms     NUMERIC(10,2),
    avg_tpot_ms     NUMERIC(10,2),
    avg_e2e_ms      NUMERIC(10,2),
    violation_rate  NUMERIC(5,2),
    duration_ms     INTEGER,
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    metadata        JSONB        DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    request_key     VARCHAR(50) NOT NULL,
    priority        VARCHAR(30) NOT NULL,
    prompt_tokens   INTEGER NOT NULL,
    output_tokens   INTEGER NOT NULL,
    assigned_node   VARCHAR(50),
    ttft_ms         NUMERIC(10,2),
    tpot_ms         NUMERIC(10,2),
    e2e_ms          NUMERIC(10,2),
    slo_violated    BOOLEAN NOT NULL DEFAULT false,
    advisor_message TEXT,
    arrived_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS advisor_decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    request_id      UUID REFERENCES requests(id) ON DELETE SET NULL,
    scheduler_mode  VARCHAR(50) NOT NULL,
    priority_class  VARCHAR(30),
    cost_bucket     VARCHAR(20),
    recommended_action VARCHAR(30),
    reasoning       TEXT,
    assigned_node   VARCHAR(50),
    action_taken    VARCHAR(20),
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_runs_user_id    ON simulation_runs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_requests_run_id  ON requests(run_id)`,
  `CREATE INDEX IF NOT EXISTS idx_advisor_run_id   ON advisor_decisions(run_id)`,
];

async function autoMigrate() {
  console.log('Running auto migrations...');
  for (const sql of migrations) {
    await query(sql);
  }
  console.log('Migrations complete.');
}

module.exports = autoMigrate;
