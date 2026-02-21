-- Scenario 3: Connection Pooling
-- A job queue system. Workers submit jobs, processors pick them up.
-- High concurrency, write-heavy — exactly the kind of system
-- where connection pool misconfiguration becomes a crisis.

CREATE TABLE IF NOT EXISTS jobs (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(50) NOT NULL,         -- 'image_resize', 'send_email', 'generate_report'
  payload     JSONB NOT NULL DEFAULT '{}',
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, done, failed
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  last_seen   TIMESTAMP NOT NULL DEFAULT NOW(),
  jobs_processed INTEGER NOT NULL DEFAULT 0
);

-- Intentionally no index on status or created_at here --
-- this scenario is about connection pooling, not indexes.
-- We seed enough data to make the problem visible but not
-- so much that query speed becomes a confounding factor.

