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

![Index Diagram](assets/diagram-index.svg)

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

Connect to the database and use EXPLAIN ANALYZE to see exactly what PostgreSQL is doing for each query. This is the most important diagnostic tool a backend engineer has.

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

Run each query and look at the output:

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
/orders?user_id:        Seq Scan / Index Scan  ← write which one
/products?category:     Seq Scan / Index Scan  ← write which one
/orders/summary:        Seq Scan / Index Scan  ← write which one
```

Type `\q` to exit, then run the load test:

```bash
npm run loadtest
```

**Q5: Record the p99 latency for each endpoint before any fixes:**

| Endpoint                 | p99 Before Fix |
| ------------------------ | -------------- |
| /orders?user_id          |                |
| /products?category&price |                |
| /orders/summary?status   |                |

---

## Step 3 — Fix It

Three endpoints, three different situations. Before you touch anything, reason through your options for each one.

---

### Fix 1: Orders by user_id

**The problem:** Every time a user loads their order history, PostgreSQL scans all 100,000 orders to find the ones belonging to that one user. The more orders in the database, the slower this gets.

**Before you change anything — consider your options:**

> **Option A — Add an index on `orders.user_id`.** PostgreSQL jumps directly to one user's orders. Every INSERT to the orders table becomes slightly slower because the index has to be updated.
>
> **Option B — Paginate the results.** Instead of returning all of a user's orders at once, return 20 at a time. The query is still a sequential scan but returns faster because it stops earlier.
>
> **Option C — Cache the order history per user.** Store the result for each user_id in memory. Fast reads, but the cache goes stale when new orders arrive.

**Q: Which option makes the most sense here and why? Consider that the orders table grows by 10,000 rows every day and `user_id` has 1,000 distinct values.**

```
Your answer:


```

**The fix:** Option A. With 1,000 distinct user IDs across 100,000 rows, `user_id` has high cardinality — an index will be used heavily and will dramatically reduce the rows PostgreSQL needs to touch per query. Pagination (B) helps response size but doesn't fix the scan cost. Caching (C) works but adds infrastructure complexity that isn't warranted before trying the simpler fix first.

Connect to the database and add the index:

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
```

Verify PostgreSQL is using it:

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

You should now see `Index Scan`. Type `\q` to exit, then run the load test and watch Grafana:

```bash
npm run loadtest
```

What happened to `/orders?user_id` latency?

---

### Fix 2: Product search by category and price

**The problem:** The product search filters by `category` AND `price_cents`. With no index, PostgreSQL scans every product for every search request.

**Before you change anything — consider your options:**

> **Option A — Add a single-column index on `category`.** PostgreSQL jumps to all products in a category, then scans those for the price range. Partial improvement.
>
> **Option B — Add a composite index on `(category, price_cents)`.** PostgreSQL jumps directly to the right category and price range in one lookup. More efficient than two separate indexes.
>
> **Option C — Add a composite index on `(price_cents, category)`.** Same columns, different order.

**Q: What's the difference between Options B and C? Which one is correct for a query that filters by `category = 'electronics'` AND `price_cents BETWEEN 10000 AND 50000`? Why does column order matter?**

```
Your answer:


```

**The fix:** Option B. The rule is equality filters before range filters. `category = 'electronics'` is an equality filter — PostgreSQL can jump straight to that group. `price_cents BETWEEN 10000 AND 50000` is a range filter — PostgreSQL then scans within that group. Putting the range filter first (Option C) means PostgreSQL can't efficiently use the index for the equality filter that follows.

![Composite Index Diagram](assets/diagram-composite-index.svg)

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category, price_cents);
```

Verify it's being used:

```sql
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics' AND price_cents BETWEEN 10000 AND 50000;
```

Look for `Index Scan using idx_products_category_price`. Type `\q` to exit, then run the load test again.

---

### Fix 3? Orders by status — think before you act

**The situation:** The `/orders/summary` endpoint filters by `status`. You've seen two sequential scans get fixed with indexes. Your instinct might be to add one here too.

**Before you change anything — consider your options:**

> **Option A — Add an index on `orders.status`.** Might help reads. Will slow down every INSERT and UPDATE to the orders table because the index has to be maintained.
>
> **Option B — Don't add an index.** Accept the sequential scan. It may actually be the right choice depending on the data distribution.
>
> **Option C — Rewrite the query.** Instead of filtering by status at query time, maintain a separate summary table that gets updated when orders change status.

**Q: `status` has 5 possible values across 100,000 rows. Roughly 20,000 rows match any given status. Does an index help when 20% of the table matches the filter? What would you need to know to decide between Options A, B, and C?**

```
Your answer:


```

Before deciding, check what PostgreSQL actually does:

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
EXPLAIN ANALYZE SELECT status, COUNT(*) FROM orders WHERE status = 'pending' GROUP BY status;
```

Look carefully at what PostgreSQL chose. If it's already doing a `Seq Scan` on a low-cardinality column like this, adding an index won't change that — PostgreSQL will look at the data distribution and decide the full scan is faster than fetching 20,000 scattered rows via an index.

![Cardinality Diagram](assets/diagram-cardinality.svg)

**Q6: What did PostgreSQL decide to do? Given what you know about cardinality, do you think adding an index on `status` would help? Would you add it?**

```
Your answer:


```

> 💡 **The lesson:** The right answer here is probably to not add the index. That's a real engineering decision — recognizing when a tool doesn't fit the problem is just as important as knowing when it does.

Type `\q` to exit.

---

## Step 4 — Compare Your Results

Run the load test one final time:

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

**Not adding an index is a valid decision.** You looked at the status column, reasoned through the cardinality, checked what PostgreSQL actually does, and decided an index wasn't worth it. That's exactly what a senior engineer does.

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
