-- ======================================================
-- FIX 1: Index on orders.user_id
--
-- The /orders?user_id=123 endpoint filters by user_id.
-- Without this index, PostgreSQL scans all 100,000 orders
-- to find the ones belonging to one user.
--
-- With this index, it jumps directly to that user's orders.
-- ======================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);


-- ======================================================
-- FIX 2: Composite index on products (category, price_cents)
--
-- The /products endpoint filters by BOTH category AND price.
-- A composite index covers both filters in one lookup.
--
-- Order matters: put the equality filter first (category = ?)
-- then the range filter (price BETWEEN ? AND ?).
-- This is the most efficient order for PostgreSQL to use.
-- ======================================================
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category, price_cents);


-- ======================================================
-- FIX 3? Index on orders.status — NOT ADDED
--
-- The /orders/summary endpoint filters by status.
-- Status only has 5 possible values: pending, processing,
-- shipped, delivered, cancelled.
--
-- Adding an index here does speed up the query — PostgreSQL
-- uses it (Bitmap Index Scan) and execution time drops.
-- But the improvement is modest compared to the other two
-- indexes because status has low cardinality: ~14,000 rows
-- match any given status, so the index still touches a large
-- fraction of the table.
--
-- Meanwhile, every INSERT and UPDATE to the orders table
-- pays the cost of maintaining this index. For an admin
-- dashboard that runs occasionally, the write overhead
-- may not justify the small read improvement.
--
-- This is a judgment call, not a rule. If the dashboard
-- ran every second, or the table had millions of rows,
-- the answer might change.
-- ======================================================
-- CREATE INDEX idx_orders_status ON orders (status);  ← left out by choice
