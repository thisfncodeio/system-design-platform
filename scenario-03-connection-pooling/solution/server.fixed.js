/**
 * SCENARIO 3: Connection Pooling — Fixed Version
 *
 * Two things changed from the broken version:
 *
 * 1. max: 3 → max: 10
 *    The pool now allows 10 concurrent connections instead of 3.
 *    With 50 concurrent requests, connections will still queue —
 *    but the queue drains fast enough that requests don't time out.
 *
 * 2. connectionTimeoutMillis: 200 → connectionTimeoutMillis: 5000
 *    Requests now wait up to 5 seconds for a connection instead of 200ms.
 *    This is enough for the queue to drain under normal load.
 *
 * What didn't change:
 *    The pool is still shared across all requests (learned in Scenario 1).
 *    The routes are identical — the bug was purely in configuration.
 *
 * What to think about next:
 *    PostgreSQL has its own max_connections limit (default: 100).
 *    Every connection from every app server counts toward that limit.
 *    As you add more servers (Scenario 4), you'll need to think about
 *    how to divide the connection budget across them.
 */

const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
app.use(express.json());

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

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });
  next();
});

// THE FIX — pool sized appropriately for the traffic
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobqueue',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,                          // enough connections for the concurrent load
  connectionTimeoutMillis: 5000,    // 5 seconds — enough time for the queue to drain
  idleTimeoutMillis: 30000,         // keep idle connections open for 30 seconds
});

app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM jobs WHERE status = $1', ['pending']);
    res.json({ status: 'ok', pending_jobs: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/jobs', async (req, res) => {
  const { type, payload, priority = 0 } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });
  const validTypes = ['image_resize', 'send_email', 'generate_report', 'process_payment', 'sync_inventory'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  try {
    const result = await db.query(
      `INSERT INTO jobs (type, payload, priority) VALUES ($1, $2, $3) RETURNING id, type, status, priority, created_at`,
      [type, payload || {}, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting job:', err.message);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

app.get('/jobs/next', async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE jobs SET status = 'processing', updated_at = NOW()
      WHERE id = (
        SELECT id FROM jobs WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
    if (result.rows.length === 0) return res.status(204).send();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error claiming job:', err.message);
    res.status(500).json({ error: 'Failed to claim job' });
  }
});

app.patch('/jobs/:id', async (req, res) => {
  const jobId = parseInt(req.params.id);
  const { status } = req.body;
  if (isNaN(jobId)) return res.status(400).json({ error: 'Invalid job ID' });
  const validStatuses = ['done', 'failed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'status must be done or failed' });
  try {
    const result = await db.query(
      `UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, jobId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating job:', err.message);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

app.get('/jobs/stats', async (req, res) => {
  try {
    const result = await db.query(`SELECT status, COUNT(*) as count FROM jobs GROUP BY status ORDER BY count DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
