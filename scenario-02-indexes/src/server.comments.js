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
const express = require('express');

// { Pool } uses destructuring to pull out just the Pool class from the "pg" package.
// pg is the PostgreSQL client library for Node.js.
// Pool manages a set of reusable database connections.
const { Pool } = require('pg');

// prom-client is the Prometheus metrics library.
// Prometheus collects numbers about your app (request count, latency, errors)
// so you can visualize them in Grafana.
const client = require('prom-client');

// express() creates a new Express application — this is your server.
const app = express();

// app.use() registers middleware — code that runs on every request before your route handlers.
// express.json() parses incoming JSON request bodies so you can access them via req.body.
app.use(express.json());

// ======================================================
// METRICS
// ======================================================

// collectDefaultMetrics() automatically tracks Node.js internals
// like memory usage and CPU. Prometheus collects them in the background.
client.collectDefaultMetrics();

// A Counter is a metric that only goes up. labelNames lets us tag each
// increment with metadata so we can filter in Grafana.
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// A Histogram tracks the distribution of values — here, how long requests take.
// buckets define the ranges (in ms) that Prometheus groups response times into.
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

// This middleware runs before every route handler.
// (req, res, next) => { ... } is an arrow function — similar to a lambda in Python or Java.
// req = the incoming request, res = the response you send back, next = call this to continue.
app.use((req, res, next) => {
  const start = Date.now();

  // res.on("finish", callback) registers an event listener.
  // "finish" fires after the response has been sent to the client.
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });

  // next() passes control to the next middleware or route handler.
  // Without this, the request would hang — Express wouldn't know to continue.
  next();
});

// Note: this is the FIXED pattern from Scenario 1 — one shared pool.
// If you haven't done Scenario 1, this is how database connections
// should always be set up in a production Node.js app.
const db = new Pool({
  // process.env reads environment variables — these are set in docker-compose.yml.
  // The || "fallback" syntax means: use the env var if it exists, otherwise use the fallback.
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shopdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  connectionTimeoutMillis: 2000,
});

// ======================================================
// ROUTES
// ======================================================

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unreachable' });
  }
});

/**
 * GET /orders?user_id=123
 *
 * Fetch all orders for a specific user.
 * The most frequently called endpoint in the app.
 *
 * PROBLEM: There is no index on orders.user_id.
 * With 100,000 orders, finding one user's orders means scanning every single row.
 */
app.get('/orders', async (req, res) => {
  // req.query holds values from the URL query string.
  // For /orders?user_id=123, req.query is { user_id: "123" }.
  // Destructuring: { user_id } pulls out just the user_id property.
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    // $1 is a parameterized placeholder — the value in the array [user_id]
    // gets substituted in. This prevents SQL injection.
    const result = await db.query(
      `SELECT
        orders.id,
        orders.user_id,
        orders.status,
        orders.total_cents,
        orders.created_at,
        users.email
      FROM orders
      JOIN users ON orders.user_id = users.id
      WHERE orders.user_id = $1
      ORDER BY orders.created_at DESC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

/**
 * GET /products?category=electronics&min_price=100&max_price=500
 *
 * Search products by category and price range.
 *
 * PROBLEM: Filtering on both category AND price_cents with no
 * composite index. The database scans every product for every request.
 */
app.get('/products', async (req, res) => {
  // Destructuring: pulls category, min_price, and max_price from the query string.
  // For /products?category=electronics&min_price=100&max_price=500,
  // req.query is { category: "electronics", min_price: "100", max_price: "500" }.
  const { category, min_price, max_price } = req.query;

  try {
    // Template literal (backticks `) lets you write multi-line strings.
    // WHERE 1=1 is a trick to make appending AND clauses easier —
    // every condition can start with AND without special-casing the first one.
    let query = `
      SELECT id, name, category, price_cents, stock
      FROM products
      WHERE 1=1
    `;
    // params is an array of values that get substituted into the $1, $2, etc. placeholders.
    const params = [];

    if (category) {
      params.push(category);
      // Template literal: ${ } embeds a JavaScript expression inside a string.
      // params.length gives the next placeholder number ($1, $2, etc.).
      query += ` AND category = $${params.length}`;
    }

    if (min_price) {
      // parseInt() converts the string "100" to the number 100.
      // The API takes dollar amounts, but the database stores cents — multiply by 100.
      params.push(parseInt(min_price) * 100);
      query += ` AND price_cents >= $${params.length}`;
    }

    if (max_price) {
      params.push(parseInt(max_price) * 100);
      query += ` AND price_cents <= $${params.length}`;
    }

    query += ' ORDER BY price_cents ASC LIMIT 50';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

/**
 * GET /orders/summary?status=pending
 *
 * Count orders grouped by status for an admin dashboard.
 * Status can only be: pending, processing, shipped, delivered, cancelled
 *
 * PROBLEM (or is it?): status has very low cardinality —
 * only 5 possible values. An index here might not help.
 */
app.get('/orders/summary', async (req, res) => {
  // Destructuring: pulls status from the query string.
  const { status } = req.query;

  try {
    let query = `
      SELECT
        status,
        COUNT(*) as count,
        SUM(total_cents) as total_revenue_cents
      FROM orders
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE status = $1`;
    }

    query += ' GROUP BY status ORDER BY count DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching order summary:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

/**
 * POST /orders
 * Create a new order.
 */
app.post('/orders', async (req, res) => {
  // Destructuring: pulls userId and items from the JSON request body.
  // items is expected to be an array like [{ productId: 1, quantity: 2 }, ...]
  const { userId, items } = req.body;

  if (!userId || !items || !items.length) {
    return res.status(400).json({ error: 'userId and items are required' });
  }

  try {
    // .map() transforms each item in the array — here, extracting just the productId.
    // Similar to list comprehension in Python: [i.productId for i in items]
    const productIds = items.map(i => i.productId);

    // ANY($1) is PostgreSQL syntax for "matches any value in this array."
    // It's equivalent to WHERE id IN (1, 2, 3) but works with parameterized arrays.
    const products = await db.query(
      'SELECT id, price_cents FROM products WHERE id = ANY($1)',
      [productIds]
    );

    // Build a lookup object: { productId: priceCents }
    // .forEach() iterates over each row — similar to a for loop.
    const priceMap = {};
    products.rows.forEach(p => priceMap[p.id] = p.price_cents);

    // .reduce() accumulates a single value from an array.
    // Here it sums up (price * quantity) for each item to get the total.
    // Similar to Python's: sum(priceMap[item.productId] * item.quantity for item in items)
    const totalCents = items.reduce((sum, item) => {
      return sum + (priceMap[item.productId] || 0) * item.quantity;
    }, 0);

    const result = await db.query(
      `INSERT INTO orders (user_id, status, total_cents)
       VALUES ($1, 'pending', $2)
       RETURNING *`,
      [userId, totalCents]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
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

// process.env.PORT reads the PORT environment variable.
// || 3000 means: if PORT isn't set, default to 3000.
const PORT = process.env.PORT || 3000;

// app.listen() starts the server on the given port.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// module.exports makes the app available to other files that require() this one.
// This is Node.js's module system (similar to export in Python or public in Java).
module.exports = app;
