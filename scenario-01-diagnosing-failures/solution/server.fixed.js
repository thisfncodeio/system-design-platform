const express = require("express");
const { Pool } = require("pg");
const client = require("prom-client"); // Prometheus metrics library
const { artificialDatabaseTableLatency } = require("../scripts/simulation");

const app = express();
app.use(express.json()); // Parse JSON bodies from incoming requests into req.body object

// ======================================================
// METRICS
// ======================================================
client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

// Middleware — runs before every route handler.
// Records how long each request took and what status code it returned.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });
  next(); // Pass control to the next middleware or route handler
});

// ======================================================
// DATABASE CONNECTION
//
// FIX 1: One shared pool created once at startup.
// Requests queue and wait rather than failing immediately.
// ======================================================
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "feedapp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ======================================================
// ROUTES
// ======================================================

app.post("/posts", async (req, res) => {
  const { userId, content } = req.body; // Destructuring: pulls userId and content out of the request body object
  if (!userId || !content)
    return res.status(400).json({ error: "userId and content are required" });
  if (content.length > 280)
    return res.status(400).json({ error: "Post content cannot exceed 280 characters" });
  try {
    const result = await db.query(
      "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *",
      [userId, content],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating post:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/feed", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        posts.id,
        posts.user_id,
        posts.content,
        posts.created_at,
        users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
      LIMIT 20
    `);

    await artificialDatabaseTableLatency(db, "posts"); // ARTIFICIAL LATENCY — DO NOT MODIFY

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching feed:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/users/:id/posts", async (req, res) => {
  const userId = parseInt(req.params.id); // req.params holds values from the URL path (e.g. /users/42/posts → req.params.id is "42")
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
  try {
    const result = await db.query(
      "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user posts:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Prometheus scrapes this endpoint every 5 seconds.
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.send(await client.register.metrics());
});

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
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
