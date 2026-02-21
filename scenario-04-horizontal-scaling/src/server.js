/**
 * SCENARIO 4: Horizontal Scaling
 *
 * A product catalog API for an e-commerce platform.
 * The database queries are indexed. The connection pool
 * is correctly sized. The app is well-configured.
 *
 * And yet — under enough load, it falls over anyway.
 *
 * Some ceilings can't be tuned away. This is one of them.
 */

const express = require("express");
const { Pool } = require("pg");
const client = require("prom-client"); // Prometheus metrics library

const app = express();
app.use(express.json());

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
  labelNames: ["method", "route"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route).observe(duration);
  });
  next(); // pass control to the next middleware or route handler
});

// ======================================================
// DATABASE — pool correctly configured
// (this is not the problem in this scenario)
// ======================================================
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "catalogdb",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: parseInt(process.env.DB_POOL_MAX || "10"), // DB_POOL_MAX lets docker-compose set per-server pool size
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// ======================================================
// ROUTES
// ======================================================

app.get("/health", async (req, res) => {
  try {
    const result = await db.query("SELECT COUNT(*) FROM products");
    res.json({
      status: "ok",
      server: process.env.SERVER_ID || "app", // which server handled this request
      products: parseInt(result.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * GET /products
 * Returns all products in a category.
 * Indexed — fast query, not the bottleneck.
 */
app.get("/products", async (req, res) => {
  const { category } = req.query; // req.query — values from the URL query string e.g. ?category=books

  try {
    const query = category
      ? "SELECT * FROM products WHERE category = $1 ORDER BY price_cents ASC"
      : "SELECT * FROM products ORDER BY price_cents ASC LIMIT 100";

    const params = category ? [category] : [];
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/**
 * GET /products/:id
 * Returns a single product by ID.
 */
app.get("/products/:id", async (req, res) => {
  const productId = parseInt(req.params.id); // req.params — values from the URL path

  if (isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    const result = await db.query("SELECT * FROM products WHERE id = $1", [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching product:", err.message);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

/**
 * GET /report
 * Generates a sales summary across all products and orders.
 *
 * This endpoint does real work — it joins two tables, aggregates
 * results, and builds a response. Under high concurrency, many
 * of these running simultaneously saturates the server's CPU.
 */
app.get("/report", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.category,
        COUNT(o.id) AS order_count,
        SUM(o.total_cents) AS revenue_cents,
        AVG(o.total_cents)::int AS avg_order_cents
      FROM products p
      LEFT JOIN orders o ON o.product_id = p.id
      GROUP BY p.category
      ORDER BY revenue_cents DESC
    `);

    // Build the summary in JavaScript — this CPU work adds up under load
    const summary = result.rows.map((row) => ({
      category: row.category,
      orders: parseInt(row.order_count),
      revenue: `$${(parseInt(row.revenue_cents || 0) / 100).toFixed(2)}`,
      avg_order: `$${(parseInt(row.avg_order_cents || 0) / 100).toFixed(2)}`,
    }));

    const total = summary.reduce((acc, row) => acc + parseInt(row.orders), 0);

    res.json({
      generated_at: new Date().toISOString(),
      total_orders: total,
      by_category: summary,
    });
  } catch (err) {
    console.error("Error generating report:", err.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

/**
 * POST /orders
 * Places an order for a product.
 */
app.post("/orders", async (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: "product_id and quantity are required" });
  }

  try {
    const product = await db.query("SELECT * FROM products WHERE id = $1", [product_id]);

    if (product.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const total_cents = product.rows[0].price_cents * quantity;

    const result = await db.query(
      `INSERT INTO orders (product_id, quantity, total_cents)
       VALUES ($1, $2, $3) RETURNING *`,
      [product_id, quantity, total_cents],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error placing order:", err.message);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// ======================================================
// METRICS ENDPOINT
// ======================================================
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
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
