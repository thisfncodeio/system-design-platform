# Scenario 2: Indexes and Slow Queries

**Difficulty:** Entry Level  
**Concepts:** Database Indexes, Query Planning, Cardinality, EXPLAIN ANALYZE  
**Time:** ~45 minutes  
**Recommended:** Complete Scenario 1 first, or read the recap below

---

## Quick Recap — What is an Index?

If you did Scenario 1 you already know this. If not, here's what you need:

A database index is a separate data structure that keeps a pre-sorted reference to rows in a table. Without one, the database reads every row to find what it's looking for — called a **sequential scan**. With one, it jumps directly to the matching rows — called an **index scan**.

The tradeoff: indexes make reads faster but slow down writes slightly, because every INSERT or UPDATE has to update the index too. This is why you don't add indexes to every column — only the ones your queries actually need.

![Index Diagram](../scenario-01-single-server/assets/diagram-index.svg)

---

## The Situation

You've joined an e-commerce startup. The backend handles users, products, and orders.

Last month the team was happy. Queries were fast, users were happy. This month the database has grown to 100,000 orders and three things are starting to slow down:

1. Users are waiting 2-3 seconds to see their order history
2. The product search page feels sluggish
3. The admin dashboard is timing out

Your tech lead has identified the slow endpoints. Your job is to figure out why each one is slow — and decide what to do about it.

> _"Not every slow query needs an index. Figure out which ones actually do."_

![Architecture Diagram](assets/diagram-architecture.svg)

---

## Your Environment

Everything is already running.

| Service  | Where     | What it is                          |
| -------- | --------- | ----------------------------------- |
| Shop API | Port 3000 | The app you're investigating        |
| Grafana  | Port 3002 | Live metrics (login: admin / admin) |

Open a terminal with **Ctrl+`**

To open Grafana: click the **Ports** tab at the bottom of VS Code, find Port 3002, and click the globe 🌐 icon. Login: admin / admin. Navigate to Dashboards → Scenario 2.

---

## Step 1 — Understand the System

Open `src/server.js` and read through it. There are four endpoints:

- `GET /orders?user_id=123` — a user's order history
- `GET /products?category=electronics&min_price=100&max_price=500` — product search
- `GET /orders/summary?status=pending` — admin dashboard counts
- `POST /orders` — create a new order

Answer these before moving on:

**Q1: The `/orders` endpoint filters by `user_id`. Open `db/schema.sql`. Is there an index on `orders.user_id`?**

```
Your answer:


```

**Q2: The `/products` endpoint filters by both `category` AND `price_cents`. What do you think happens if there's no index on either column with 500 products in the table?**

```
Your answer:


```

**Q3: The `status` column in orders can only be one of 5 values: pending, processing, shipped, delivered, cancelled. With 100,000 orders, roughly how many rows would match `status = 'delivered'`? What does that tell you about whether an index would help here?**

```
Your answer:


```

---

## Step 2 — See the Slow Queries in Action

First, connect to the database and use EXPLAIN ANALYZE to see exactly what PostgreSQL is doing for each query. This is the most important diagnostic tool a backend engineer has.

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

You're now inside the PostgreSQL shell. Run each query and look at the output:

**Query 1 — Filter by user_id:**

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

**Query 2 — Filter by category and price:**

```sql
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics' AND price_cents BETWEEN 10000 AND 50000;
```

**Query 3 — Filter by status:**

```sql
EXPLAIN ANALYZE SELECT status, COUNT(*) FROM orders WHERE status = 'pending' GROUP BY status;
```

**What to look for:**

- `Seq Scan` = sequential scan = reading every row = slow on large tables
- `Index Scan` = using an index = jumping directly to matching rows = fast

**Q4: For each query, did you see `Seq Scan` or `Index Scan`? Record what you found:**

```
/orders?user_id:        Seq Scan / Index Scan (circle one)
/products?category:     Seq Scan / Index Scan (circle one)
/orders/summary:        Seq Scan / Index Scan (circle one)
```

Type `\q` to exit the PostgreSQL shell, then run the load test:

```bash
npm run loadtest
```

**Q5: Record the p99 latency for each endpoint:**

| Endpoint                 | p99 Before Fix |
| ------------------------ | -------------- |
| /orders?user_id          |                |
| /products?category&price |                |
| /orders/summary?status   |                |

---

## Step 3 — Fix It

Three endpoints, three different situations. Only two of them need an index. You decide which.

---

### Fix 1: Index on orders.user_id

**The problem:** Every time a user loads their order history, PostgreSQL scans all 100,000 orders to find the ones belonging to that one user. The more orders in the database, the slower this gets — linearly.

**Why an index helps here:** `user_id` has high cardinality — there are 1,000 different user IDs. An index on `user_id` lets PostgreSQL jump directly to one user's orders without touching anyone else's.

Connect to the database and add the index yourself:

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
CREATE INDEX idx_orders_user_id ON orders (user_id);
```

Now verify PostgreSQL is using it:

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

You should now see `Index Scan` instead of `Seq Scan`. Type `\q` to exit, then run the load test and watch Grafana:

```bash
npm run loadtest
```

What happened to `/orders?user_id` latency?

---

### Fix 2: Composite Index on products

**The problem:** The product search filters by `category` AND `price_cents`. With no index, PostgreSQL scans every product for every search request.

**Why a single-column index isn't enough:** If you only indexed `category`, PostgreSQL would jump to all electronics but then scan all of them for the price range. A **composite index** on both columns together is more efficient — it covers both filters in one lookup.

**Column order matters:**

```sql
(category, price_cents)  ✅ correct — equality first, range second
(price_cents, category)  ❌ less efficient — range first wastes the index
```

![Composite Index Diagram](assets/diagram-composite-index.svg)

Connect to the database and add the index:

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
CREATE INDEX idx_products_category_price ON products (category, price_cents);
```

Verify it's being used:

```sql
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics' AND price_cents BETWEEN 10000 AND 50000;
```

Look for `Index Scan using idx_products_category_price`. Type `\q` to exit, then run the load test again.

---

### Fix 3? Index on orders.status — Think Before You Add

**The situation:** The `/orders/summary` endpoint filters by `status`. Seems like an index would help, right?

Not necessarily. Here's why:

`status` only has 5 possible values across 100,000 rows. That means roughly 20,000 rows have `status = 'delivered'`. PostgreSQL looks at the data distribution and calculates: _"Is it faster to use the index and fetch 20,000 rows individually, or just scan the whole table?"_ Often it decides the full scan is actually faster for low-cardinality columns like this.

This is called **cardinality** — the number of distinct values in a column. High cardinality (like `user_id` or `email`) = indexes help a lot. Low cardinality (like `status` or boolean columns) = indexes often don't help.

![Cardinality Diagram](assets/diagram-cardinality.svg)

Before adding anything, test what PostgreSQL actually decides:

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
EXPLAIN ANALYZE SELECT status, COUNT(*) FROM orders WHERE status = 'pending' GROUP BY status;
```

Look at the output carefully. If PostgreSQL is already choosing a `Seq Scan` — adding an index would slow down every INSERT and UPDATE for no real gain on reads.

**Q6: What did PostgreSQL decide to do? Do you think an index on `status` would help here? Why or why not?**

```
Your answer:


```

> 💡 **The lesson:** Adding an index is not always the answer. A senior engineer asks "will this index actually be used?" before adding it. EXPLAIN ANALYZE tells you the answer.

Type `\q` to exit.

---

## Step 4 — Compare Your Results

Run the load test one more time:

```bash
npm run loadtest
```

Fill in your results:

| Endpoint                 | p99 Before | p99 After | Index Added? |
| ------------------------ | ---------- | --------- | ------------ |
| /orders?user_id          |            |           | Yes / No     |
| /products?category&price |            |           | Yes / No     |
| /orders/summary?status   |            |           | Yes / No     |

---

## Step 5 — Reflect

**Q7: Why does the order of columns in a composite index matter? What would happen if you put `price_cents` before `category`?**

```
Your answer:


```

**Q8: The orders table gets 10,000 new orders every day. What's the downside of adding too many indexes to a write-heavy table?**

```
Your answer:


```

**Q9: A new engineer on your team suggests adding an index to every column "just in case." How would you explain why that's a bad idea?**

```
Your answer:


```

---

## What You Learned

**Indexes speed up reads but slow down writes.** Every index you add has to be updated on every INSERT, UPDATE, and DELETE. On a write-heavy table, too many indexes becomes its own problem.

**Cardinality determines whether an index is worth it.** High cardinality columns (user_id, email, product_id) benefit greatly from indexes. Low cardinality columns (status, boolean flags, country codes) often don't — PostgreSQL may ignore the index entirely.

**Composite indexes cover multiple columns.** When you filter by two columns together, a composite index is more efficient than two separate indexes. Column order matters: equality filters before range filters.

**EXPLAIN ANALYZE is your best friend.** Never guess whether a query is slow or whether an index is being used. Run EXPLAIN ANALYZE and let PostgreSQL show you exactly what it's doing.

---

## Stuck?

| Problem                                            | What to do                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| psql command not found                             | The psql client should be available in the container — try `which psql` to confirm                  |
| Still seeing Seq Scan after adding index           | Run `ANALYZE orders;` inside psql first, then try EXPLAIN ANALYZE again                             |
| Load test results look the same after adding index | Make sure you exited psql and reran the load test                                                   |
| Want to see the full solution                      | Open `solution/fix.sql` — it has all indexes with explanations of why the status index was left out |

---

_Next: Scenario 3 — Connection Pooling →_
