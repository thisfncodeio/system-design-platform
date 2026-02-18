-- ======================================================
-- SCHEMA: E-Commerce Order System
--
-- Three tables: users, products, orders
--
-- Notice what's missing:
--   - No index on orders.user_id
--   - No index on products.category or products.price_cents
--   - No index on orders.status
--
-- These are intentional. You'll decide which ones to add
-- and which ones aren't worth adding.
-- ======================================================

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);
