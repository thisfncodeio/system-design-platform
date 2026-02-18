/**
 * SCENARIO 2: Indexes and Slow Queries
 *
 * This is the backend for a simple e-commerce order system.
 * Users can browse products, place orders, and check order status.
 *
 * It works fine with a small dataset. But as the data grows,
 * three queries are quietly getting slower and slower.
 *
 * Your job: find the slow queries, understand why they're slow,
 * and fix them — but only where an index actually helps.
 */

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Note: this is the FIXED pattern from Scenario 1 — one shared pool.
// If you haven't done Scenario 1, this is how database connections
// should always be set up in a production Node.js app.
const db = new Pool({
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
 * This is called every time a user opens their order history.
 * The most frequently called endpoint in the app.
 *
 * PROBLEM: There is no index on orders.user_id.
 * With 100,000 orders in the table, finding one user's orders
 * means scanning every single row.
 */
app.get('/orders', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
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
 * Used by the product browsing page — called constantly.
 *
 * PROBLEM: Filtering on both category AND price_cents with no
 * composite index. Each filter narrows the results but the
 * database still has to scan a huge portion of the table.
 */
app.get('/products', async (req, res) => {
  const { category, min_price, max_price } = req.query;

  try {
    let query = `
      SELECT id, name, category, price_cents, stock
      FROM products
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (min_price) {
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
 * only 5 possible values. An index here might not help as
 * much as you'd expect. This is the one to think carefully about.
 */
app.get('/orders/summary', async (req, res) => {
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
  const { userId, items } = req.body;

  if (!userId || !items || !items.length) {
    return res.status(400).json({ error: 'userId and items are required' });
  }

  try {
    // Calculate total from items
    const productIds = items.map(i => i.productId);
    const products = await db.query(
      'SELECT id, price_cents FROM products WHERE id = ANY($1)',
      [productIds]
    );

    const priceMap = {};
    products.rows.forEach(p => priceMap[p.id] = p.price_cents);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
