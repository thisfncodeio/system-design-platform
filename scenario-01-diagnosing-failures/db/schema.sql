-- ======================================================
-- SCHEMA
--
-- Two simple tables: users and posts.
-- ======================================================

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  content     VARCHAR(280) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
