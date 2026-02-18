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

First, use EXPLAIN ANALYZE to see exactly what PostgreSQL is doing for each query. This is the most important tool a backend engineer has for diagnosing slow queries.

**What is EXPLAIN ANALYZE?**
It runs the query and shows you the execution plan — how PostgreSQL decided to find the data. The two things to look for:

- `Seq Scan` = sequential scan = reading every row = slow on large tables
- `Index Scan` = using an index = jumping directly to matching rows = fast

Run each one and look at the output:

```bash
# Query 1: Filter by user_id
npm run explain-orders

# Query 2: Filter by category and price
npm run explain-products

# Query 3: Filter by status
npm run explain-status
```

**Q4: For each query, did you see `Seq Scan` or `Index Scan`? Record what you found:**

```
/orders?user_id:        Seq Scan / Index Scan (circle one)
/products?category:     Seq Scan / Index Scan (circle one)
/orders/summary:        Seq Scan / Index Scan (circle one)
```

**Q5: Now run the load test to see how this affects real traffic:**

```bash
npm run loadtest
```

Record the p99 latency for each endpoint:

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

**What to do in `db/schema.sql`:**

Add this line at the bottom:

```sql
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
```

Then apply it:

```bash
npm run apply-fix
```

Run `npm run explain-orders` again. You should now see `Index Scan` instead of `Seq Scan`.

Run the load test. What happened to `/orders?user_id` latency?

---

### Fix 2: Composite Index on products

**The problem:** The product search filters by `category` AND `price_cents`. With no index, PostgreSQL scans every product for every search request.

**Why a single-column index isn't enough:** If you only indexed `category`, PostgreSQL would jump to all electronics (maybe 80 products) but then scan all of them for the price range. A **composite index** on both columns together is more efficient — it covers both filters in one lookup.

**What order should the columns be in?**
Put the equality filter first, the range filter second:

```sql
(category, price_cents)  ✅ correct — equality first, range second
(price_cents, category)  ❌ less efficient — range first wastes the index
```

![Composite Index Diagram](assets/diagram-composite-index.svg)

**What to do in `db/schema.sql`:**

Add this line:

```sql
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category, price_cents);
```

Apply it and verify:

```bash
npm run apply-fix
npm run explain-products
```

Look for `Index Scan using idx_products_category_price` in the output.

---

### Fix 3? Index on orders.status — Think Before You Add

**The situation:** The `/orders/summary` endpoint filters by `status`. Seems like an index would help, right?

Not necessarily. Here's why:

`status` only has 5 possible values across 100,000 rows. That means roughly 20,000 rows have `status = 'delivered'`. PostgreSQL looks at the data distribution and calculates: _"Is it faster to use the index and fetch 20,000 rows individually, or just scan the whole table?"_ Often it decides the full scan is actually faster for low-cardinality columns like this.

This is called **cardinality** — the number of distinct values in a column. High cardinality (like `user_id` or `email`) = indexes help a lot. Low cardinality (like `status` or boolean columns) = indexes often don't help.

![Cardinality Diagram](assets/diagram-cardinality.svg)

**What to do:**

Before adding anything, test what PostgreSQL actually decides:

```bash
npm run explain-status
```

Look at the output. If it's already doing a `Seq Scan` and the query is fast enough — you may not need an index at all. Adding one would slow down every INSERT and UPDATE for no real gain on reads.

**Q6: After running `npm run explain-status`, what did PostgreSQL decide to do? Do you think an index on `status` would help here? Why or why not?**

```
Your answer:


```

> 💡 **The lesson:** Adding an index is not always the answer. A senior engineer asks "will this index actually be used?" before adding it. EXPLAIN ANALYZE tells you the answer.

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

| Problem                                  | What to do                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run apply-fix` fails                | The indexes may already exist — that's fine, run the load test anyway                               |
| Still seeing Seq Scan after adding index | Give PostgreSQL a moment to analyze the table: run `ANALYZE orders;` first                          |
| Load test results look the same          | Make sure you ran `npm run apply-fix` before retesting                                              |
| Want to see the full solution            | Open `db/fix.sql` — it has all three indexes with explanations of why the status index was left out |

---

_Next: Scenario 3 — Connection Pooling →_
