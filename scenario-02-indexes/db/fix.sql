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
-- When a column has very few distinct values (low cardinality),
-- an index often doesn't help. PostgreSQL calculates that
-- scanning the whole table is faster than using the index
-- because so many rows match each status value.
--
-- Rule of thumb: indexes work best on high-cardinality columns
-- (many distinct values, like user_id or email).
-- They're much less useful on low-cardinality columns
-- (few distinct values, like status or boolean flags).
--
-- Run EXPLAIN ANALYZE on the status query before and after
-- adding an index to see PostgreSQL's reasoning for yourself.
-- ======================================================
-- CREATE INDEX idx_orders_status ON orders (status);  ← intentionally left out
