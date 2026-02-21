/**
 * SCENARIO 3: Connection Pooling
 *
 * This is the backend for a job queue system.
 * Workers submit jobs, processors pick them up and mark them done.
 *
 * The app works fine with a handful of requests.
 * Under load, it falls apart — and the reason is in how
 * the database connection pool is configured.
 *
 * Your job: understand why it breaks, fix the pool configuration,
 * and learn what the right numbers actually mean.
 */

const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');  // Prometheus metrics library

const app = express();
app.use(express.json());

// ======================================================
// METRICS
// ======================================================
client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

// Middleware — runs before every route handler.
// Records how long each request took and what status code it returned.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });
  next(); // Pass control to the next middleware or route handler
});

// ======================================================
// DATABASE CONNECTION POOL
//
// This pool is shared across all requests — that part is correct
// (we learned this in Scenario 1). But the configuration values
// are wrong in ways that only become visible under load.
//
// Keep these numbers in mind as you read the code:
// ======================================================
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobqueue',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 3,                         // PROBLEM: only 3 connections for the whole server
  connectionTimeoutMillis: 200,   // PROBLEM: give up after just 200ms
  idleTimeoutMillis: 1000,        // Close idle connections after 1 second
});

// ======================================================
// ROUTES
// ======================================================

app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM jobs WHERE status = $1', ['pending']);
    res.json({
      status: 'ok',
      pending_jobs: parseInt(result.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * POST /jobs
 * Submit a new job to the queue.
 * Called constantly by many different services.
 */
app.post('/jobs', async (req, res) => {
  const { type, payload, priority = 0 } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }

  const validTypes = ['image_resize', 'send_email', 'generate_report', 'process_payment', 'sync_inventory'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const result = await db.query(
      `INSERT INTO jobs (type, payload, priority)
       VALUES ($1, $2, $3)
       RETURNING id, type, status, priority, created_at`,
      [type, payload || {}, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting job:', err.message);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

/**
 * GET /jobs/next
 * A worker calls this to claim the next pending job.
 * Uses SELECT FOR UPDATE SKIP LOCKED — a PostgreSQL pattern
 * that lets multiple workers safely claim jobs without conflicts.
 * (Two workers will never claim the same job.)
 */
app.get('/jobs/next', async (req, res) => {
  try {
    // SELECT FOR UPDATE SKIP LOCKED — locks the row for this worker,
    // skips any rows already locked by other workers
    const result = await db.query(`
      UPDATE jobs
      SET status = 'processing', updated_at = NOW()
      WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    if (result.rows.length === 0) {
      return res.status(204).send(); // No jobs available
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error claiming job:', err.message);
    res.status(500).json({ error: 'Failed to claim job' });
  }
});

/**
 * PATCH /jobs/:id
 * Mark a job as done or failed.
 */
app.patch('/jobs/:id', async (req, res) => {
  const jobId = parseInt(req.params.id); // req.params — values from the URL path
  const { status } = req.body;

  if (isNaN(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const validStatuses = ['done', 'failed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be done or failed' });
  }

  try {
    const result = await db.query(
      `UPDATE jobs SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating job:', err.message);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

/**
 * GET /jobs/stats
 * Returns a count of jobs by status.
 * Used by the admin dashboard.
 */
app.get('/jobs/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ======================================================
// METRICS ENDPOINT
// Prometheus scrapes this every 5 seconds.
// ======================================================
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ======================================================
// START SERVER
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/health`);
});

module.exports = app;
