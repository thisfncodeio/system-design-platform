/**
 * This is the same code as server.js with detailed comments
 * explaining the JavaScript and backend patterns used.
 *
 * If you're comfortable reading backend code, use server.js instead.
 * This file is here for learners coming from other languages or
 * who are newer to backend development.
 *
 * This file is NOT the one the server runs — server.js is.
 * Don't edit this file expecting changes to take effect.
 */

// require() is how Node.js imports packages (like Python's import or Java's import).
// express is a web framework — it handles HTTP requests and routing.
const express = require("express");

// { Pool } uses destructuring to pull out just the Pool class from the "pg" package.
// pg is the PostgreSQL client library for Node.js.
// Pool manages a set of database connections.
const { Pool } = require("pg");

// prom-client is the Prometheus metrics library.
// Prometheus is a monitoring tool that collects numbers about your app
// (how many requests, how fast, how many errors) so you can visualize them in Grafana.
const client = require("prom-client");

// artificialDatabaseTableLatency is a function that adds artificial latency to the database table.
// This is used to simulate a slow database table.
const { artificialDatabaseTableLatency } = require("../scripts/simulation");

// express() creates a new Express application — this is your server.
const app = express();

// app.use() registers middleware — code that runs on every request before your route handlers.
// express.json() parses incoming JSON request bodies so you can access them via req.body.
app.use(express.json());

// ======================================================
// METRICS
//
// Collects default Node.js metrics (memory, CPU, etc.)
// and custom HTTP metrics (request rate, latency, errors).
// Prometheus scrapes these every 5 seconds from /metrics.
// ======================================================

// collectDefaultMetrics() automatically tracks Node.js internals
// like memory usage, CPU, and event loop lag. You don't need to
// understand these — Prometheus collects them in the background.
client.collectDefaultMetrics();

// A Counter is a metric that only goes up. Every time a request comes in,
// we increment it by 1. labelNames lets us tag each increment with metadata
// (which HTTP method, which route, what status code) so we can filter in Grafana.
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// A Histogram tracks the distribution of values — here, how long requests take.
// buckets define the ranges (in ms) that Prometheus groups response times into.
// This lets Grafana show things like "90% of requests finished in under 200ms."
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000], // buckets are the ranges of values that Prometheus will group response times into.
});

// This middleware runs before every route handler.
// It records how long each request took and what status code it returned.
// (req, res, next) => { ... } is an arrow function — similar to a lambda in Python or Java.
// req = the incoming request, res = the response you send back, next = call this to continue.
app.use((req, res, next) => {
  const start = Date.now();

  // res.on("finish", callback) registers an event listener.
  // "finish" fires after the response has been sent to the client.
  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });

  // next() passes control to the next middleware or route handler.
  // Without this, the request would hang — Express wouldn't know to continue.
  next();
});

// ======================================================
// DATABASE CONNECTION
// ======================================================

function getDbConnection() {
  // new Pool(...) creates a brand new connection pool every time this function is called.
  // Each route handler below calls this function — so every HTTP request gets its own pool.
  return new Pool({
    // process.env reads environment variables — these are set in docker-compose.yml.
    // The || "fallback" syntax means: use the env var if it exists, otherwise use the fallback.
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "feedapp",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    max: 1,
    connectionTimeoutMillis: 150,
  });
}

// ======================================================
// ROUTES
// ======================================================

// app.post("/posts", ...) handles POST requests to /posts.
// async (req, res) => { ... } is an async arrow function.
// async/await lets you write asynchronous code (like database queries) in a linear style
// instead of using callbacks or .then() chains.
app.post("/posts", async (req, res) => {
  // Destructuring: pulls userId and content out of req.body.
  // req.body is the parsed JSON from the request — e.g. { "userId": 1, "content": "hello" }
  const { userId, content } = req.body;

  if (!userId || !content)
    return res.status(400).json({ error: "userId and content are required" });

  if (content.length > 280)
    return res.status(400).json({ error: "Post content cannot exceed 280 characters" });

  // Create a new database connection for the request.
  const db = getDbConnection();

  try {
    // db.query() sends a SQL query to PostgreSQL.
    // $1 and $2 are parameterized placeholders — the values in the array [userId, content]
    // get substituted in order. This prevents SQL injection.
    // RETURNING * tells PostgreSQL to return the newly created row.
    // await pauses execution until the query finishes (it's asynchronous — the database
    // call goes over the network and takes time).
    const result = await db.query(
      "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *",
      [userId, content],
    );
    // Return the newly created post.
    // result.rows is an array of returned rows. rows[0] is the first (and only) row.
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating post:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    // finally runs whether the try succeeded or the catch fired.
    // Close the database connection after the request is processed.
    // db.end() closes all connections in the pool and releases resources.
    await db.end();
  }
});

app.get("/feed", async (req, res) => {
  // Create a new database connection for the request.
  const db = getDbConnection();

  try {
    // db.query() sends a SQL query to PostgreSQL.
    // Template literal (backticks) lets you write multi-line strings.
    // This query JOINs posts with users to get the username for each post,
    // sorts by newest first, and returns the top 20.
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

    // Return the posts.
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching feed:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    // finally runs whether the try succeeded or the catch fired.
    // Close the database connection after the request is processed.
    // db.end() closes all connections in the pool and releases resources.
    await db.end();
  }
});

app.get("/users/:id/posts", async (req, res) => {
  // req.params contains URL parameters. For the route "/users/:id/posts",
  // req.params.id is whatever value appears in the :id position.
  // parseInt() converts the string "123" to the number 123.
  const userId = parseInt(req.params.id);

  // isNaN() returns true if the value is Not-a-Number — meaning the URL had
  // something like /users/abc/posts instead of /users/123/posts.
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

  // Create a new database connection for the request.
  const db = getDbConnection();

  try {
    // db.query() sends a SQL query to PostgreSQL.
    // $1 is a parameterized placeholder — the value in the array [userId]
    // gets substituted in order. This prevents SQL injection.
    // ORDER BY created_at DESC sorts the posts by newest first.
    // LIMIT 20 limits the result to the top 20 posts.
    const result = await db.query(
      "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    // Return the user's posts.
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user posts:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    // finally runs whether the try succeeded or the catch fired.
    // Close the database connection after the request is processed.
    // db.end() closes all connections in the pool and releases resources.
    await db.end();
  }
});

// Prometheus scrapes this endpoint every 5 seconds to collect metrics.
app.get("/metrics", async (req, res) => {
  // Sets the Content-Type header so Prometheus knows how to parse the response.
  res.set("Content-Type", client.register.contentType);
  // client.register.metrics() returns all collected metrics as a formatted string.
  res.send(await client.register.metrics());
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ======================================================
// START SERVER
// ======================================================

// process.env.PORT reads the PORT environment variable (set in docker-compose.yml).
// || 3000 means: if PORT isn't set, default to 3000.
const PORT = process.env.PORT || 3000;

// app.listen() starts the server and listens for incoming HTTP connections on the given port.
// The callback (arrow function) runs once the server is ready.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/health`);
});

// module.exports makes the app available to other files that require() this one.
// This is Node.js's module system (similar to export in Python or public in Java).
module.exports = app;
