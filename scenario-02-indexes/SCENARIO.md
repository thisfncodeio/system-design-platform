# Scenario 2: Indexes and Slow Queries

**Difficulty:** Entry Level  
**Concepts:** Database Indexes, Query Planning, Cardinality, EXPLAIN ANALYZE  
**Time:** ~60–90 minutes  
**Recommended:** Complete Scenario 1 first, or read the recap below

---

## Quick Recap — What is an Index?

If you did Scenario 1 you already know this. If not, here's what you need:

A database index is a separate data structure that keeps a pre-sorted reference to rows in a table. Without one, the database reads every row to find what it's looking for — called a **sequential scan**. With one, it jumps directly to the matching rows — called an **index scan**.

Why is a sequential scan slow? A table's data lives on disk in chunks called pages. A sequential scan reads every page into memory. With 100,000 rows, that's thousands of pages loaded from disk on every query. When 50 users search at the same time, that's 50 full table scans competing for the same disk and memory.

The tradeoff: indexes make reads faster but slow down writes slightly, because every `INSERT` or `UPDATE` has to update the index too. This is why you don't add indexes to every column — only the ones your queries actually need.

![Index Diagram](assets/diagram-index.svg)

_Fig. 2.1: Database Index Diagram_

---

## The Situation

You've joined an e-commerce startup. The backend handles users, products, and orders.

At launch a few months ago, the team was happy. Queries were fast, users were happy. The product catalog has now grown to 100,000 products, the orders table has hit 100,000 rows, and three things are starting to slow down:

1. Users are waiting 2-3+ seconds to see their order history
1. The product search page feels sluggish
1. The admin dashboard is timing out

Your tech lead has identified the slow endpoints. Your job is to figure out why each one is slow — and decide what to do about it.

![Architecture Diagram](assets/diagram-architecture.svg)

_Fig. 2.2: Software Architecture Diagram_

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

## Step 1 — See the Problem

Before reading any code, run the load test with Grafana open:

```bash
npm run loadtest
```

Record the p99 latency for each endpoint. (p99 means the slowest 1% of requests. If p99 is 3 seconds, 99% of requests were faster than that.)

| Endpoint                 | p99 Before Fix |
| ------------------------ | -------------- |
| /orders?user_id          |                |
| /products?category&price |                |
| /orders/summary?status   |                |

**Q1: Which endpoints are slow? Are all three equally slow, or are some worse than others?**

```
Your answer:


```

---

## Step 2 — Understand the System

Now that you've seen the symptoms, look at the code to understand what each endpoint is doing.

Open `src/server.js` and read through it. If you're coming from Python, Go, or another language, open `src/server.comments.js` instead — it's the same code with JavaScript-specific syntax explained inline.

There are four endpoints:

- `GET /orders?user_id=123` — a user's order history
- `GET /products?category=electronics&min_price=100&max_price=500` — product search
- `GET /orders/summary?status=pending` — admin dashboard counts
- `POST /orders` — create a new order

Answer these before moving on:

**Q2: For each of the three read endpoints, what column(s) does the query filter or sort by?**

```
/orders:          filters by ___
/products:        filters by ___ and ___
/orders/summary:  filters by ___
```

**Q3: Open `db/schema.sql`. How many distinct values does the `status` column have? How does that compare to the number of distinct values in `user_id`?**

```
Your answer:


```

**Q4: Based on the latencies you recorded in Step 1 and the queries you just read — what's your hypothesis for why these endpoints are slow?**

```
Your answer:


```

---

## Step 3 — Diagnose

You have hypotheses about why these endpoints are slow. Now confirm them. Connect to the database and use `EXPLAIN ANALYZE` to see exactly what PostgreSQL is doing for each query. This is the most important diagnostic tool a backend engineer has.

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

**How to read the output:** `EXPLAIN ANALYZE` prints a tree of operations. Ignore most of it for now. Focus on two things:

1. The node type at the top — this tells you _how_ PostgreSQL found the rows:
   - `Seq Scan` = sequential scan = reading every row = slow on large tables
   - `Index Scan` = using an index = jumping directly to matching rows = fast
2. `Execution Time` at the bottom — how long the query actually took in milliseconds

Run each query and record what you see:

**Query 1 — Filter by `user_id`:**

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC;
```

```
Scan type:      Seq Scan / Index Scan  ← write which one
Execution time:
```

**Query 2 — Filter by `category` and `price`:**

(Note: the API accepts dollar amounts — `min_price=100` means $100. The server converts to cents internally: 100 × 100 = 10000. The SQL queries the raw `price_cents` column directly, so the numbers look different from the URL.)

```sql
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics' AND price_cents BETWEEN 10000 AND 50000;
```

```
Scan type:      Seq Scan / Index Scan  ← write which one
Execution time:
```

**Query 3 — Filter by `status`:**

```sql
EXPLAIN ANALYZE SELECT status, COUNT(*) FROM orders WHERE status = 'pending' GROUP BY status;
```

```
Scan type:      Seq Scan / Index Scan  ← write which one
Execution time:
```

**Q5: You've now seen what PostgreSQL is doing for each query. How does this connect to the latencies you recorded in Step 1? What would need to change to make these queries faster?**

```
Your answer:


```

Type `\q` to exit.

---

## Step 4 — Fix It

Three endpoints, three different situations. Before you touch anything, reason through your options for each one.

---

### Fix 1: Orders by `user_id`

**The problem:** Every time a user loads their order history, PostgreSQL scans all 100,000 orders to find the ones belonging to that one user. The more orders in the database, the slower this gets.

**Before you change anything — let's consider some possible solutions:**

> **Option A — Add an index on `orders.user_id`.** PostgreSQL jumps directly to one user's orders. Every INSERT to the orders table becomes slightly slower because the index has to be updated.
>
> **Option B — Paginate the results.** Instead of returning all of a user's orders at once, return 20 at a time. The query is still a sequential scan but returns faster because it stops earlier.
>
> **Option C — Cache the order history per user.** Store the result for each user_id in memory. Fast reads, but the cache goes stale when new orders arrive.

**Q6: Each option solves the problem differently and costs something different. Compare the tradeoffs. Which makes the most sense given that the orders table grows by 10,000 rows every day and `user_id` has 1,000 distinct values?**

```
Your answer:


```

**The fix:** Option A. With 1,000 distinct user IDs across 100,000 rows, `user_id` has high cardinality — an index will be used heavily and will dramatically reduce the rows PostgreSQL needs to touch per query.

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

**The problem:** The product search filters by `category` AND `price_cents`. With 100,000 products and no index, PostgreSQL scans every product for every search request.

**Before you change anything — consider your options:**

> **Option A — Add a single-column index on `category`.** PostgreSQL jumps to all products in a category, then scans those for the price range. Partial improvement.
>
> **Option B — Add a composite index on `(category, price_cents)`.** PostgreSQL jumps directly to the right category and price range in one lookup. More efficient than two separate indexes.
>
> **Option C — Add a composite index on `(price_cents, category)`.** Same columns, different order.

**Q7: Options B and C use the same columns but in different order. Why would that matter? Walk through what PostgreSQL would do with each one for a query that filters by `category = 'electronics'` AND `price_cents BETWEEN 10000 AND 50000`.**

```
Your answer:


```

**The fix:** Option B. The rule is equality filters before range filters. `category = 'electronics'` is an equality filter — PostgreSQL can jump straight to that group. `price_cents BETWEEN 10000 AND 50000` is a range filter — PostgreSQL then scans within that group. Putting the range filter first (Option C) means PostgreSQL can't efficiently use the index for the equality filter that follows.

![Composite Index Diagram](assets/diagram-composite-index.svg)

_Fig. 2.3: Composite Index Diagram_

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

**Q8: You've now seen two sequential scans fixed with indexes. Your instinct might be to do the same here. But `status` has only 5 possible values across 100,000 rows — roughly 20,000 rows match any given status. Should you always add an index when you see a sequential scan? What would change your answer?**

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

_Fig. 2.4: Cardinality Diagram_

**Q9: What did PostgreSQL decide to do? Given what you know about cardinality, do you think adding an index on `status` would help? Would you add it?**

```
Your answer:


```

> 💡 **The lesson:** The right answer here is probably to not add the index. That's a real engineering decision — recognizing when a tool doesn't fit the problem is just as important as knowing when it does.

Type `\q` to exit.

---

## Step 5 — Compare Your Results

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

## Step 6 — Reflect

**Q10: You fixed two out of three slow endpoints. If your tech lead asked you to justify why you didn't add an index on `status`, what would you say?**

```
Your answer:


```

**Q11: The orders table gets 10,000 new orders every day. What's the downside of adding too many indexes to a write-heavy table?**

```
Your answer:


```

**Q12: If the orders table grew to 10 million rows and the admin dashboard was queried once per second, would your answer on the `status` index change? Why or why not?**

```
Your answer:


```

---

## What You Learned

**Indexes speed up reads but slow down writes.** Every index you add has to be updated on every INSERT, UPDATE, and DELETE. On a write-heavy table, too many indexes becomes its own problem.

**Deleted and updated rows leave behind dead tuples.** When PostgreSQL updates or deletes a row, it doesn't immediately remove the old version — the old row stays in the table and its indexes as a "dead tuple." `VACUUM` is the process that cleans these up, and `ANALYZE` refreshes the statistics the query planner uses to decide between a Seq Scan and an Index Scan. PostgreSQL runs `autovacuum` in the background to handle both, but on write-heavy tables with many indexes, dead tuples pile up in more places and take longer to clean. This is one more reason to be selective about which indexes you add.

**Cardinality determines whether an index is worth it.** High cardinality columns (user_id, email, product_id) benefit greatly from indexes. Low cardinality columns (status, boolean flags, country codes) often don't — PostgreSQL may ignore the index entirely.

**Composite indexes cover multiple columns.** When you filter by two columns together, a composite index is more efficient than two separate indexes. Column order matters: equality filters before range filters.

**Not adding an index is a valid decision.** You looked at the status column, reasoned through the cardinality, checked what PostgreSQL actually does, and decided an index wasn't worth it. That's exactly what a senior engineer does.

**EXPLAIN ANALYZE is your best friend.** Never guess whether a query is slow or whether an index is being used. Run EXPLAIN ANALYZE and let PostgreSQL show you exactly what it's doing.

---

## Answer Key

Use this after you've written your own answers. Don't skip to this first — the value is in thinking it through yourself before checking.

**Q1: Which endpoints are slow? Are all three equally slow, or are some worse than others?**

- All three read endpoints are slow. The specific numbers vary, but all show high p99 latency because every query does a sequential scan across 100,000 rows. Some may be worse than others depending on query complexity — the `/products` endpoint filters on two columns, and `/orders/summary` does a GROUP BY aggregation on top of the scan.

**Q2: For each of the three read endpoints, what column(s) does the query filter or sort by?**

- `/orders`: filters by `user_id`, sorts by `created_at DESC`
- `/products`: filters by `category` and `price_cents`
- `/orders/summary`: filters by `status`, groups by `status`

**Q3: Open `db/schema.sql`. How many distinct values does the `status` column have? How does that compare to the number of distinct values in `user_id`?**

- `status` has 5 distinct values (pending, processing, shipped, delivered, cancelled). `user_id` has 1,000 distinct values. That's a 200x difference. With 100,000 rows, each status matches ~20,000 rows while each user_id matches ~100 rows. This difference — called cardinality — matters a lot for whether an index helps.

**Q4: Based on the latencies you recorded in Step 1 and the queries you just read — what's your hypothesis for why these endpoints are slow?**

- The tables have 100,000 rows each, and the queries filter by columns that may not have indexes. Without an index, PostgreSQL has to read every row in the table to find the matching ones. Under concurrent load, that's many full table scans competing for the same resources.

**Q5: You've now seen what PostgreSQL is doing for each query. How does this connect to the latencies you recorded in Step 1? What would need to change to make these queries faster?**

- All three queries are doing sequential scans — reading every row in the table. That's why the latencies are high: each request triggers a full table scan across 100,000 rows. To make them faster, PostgreSQL needs a way to jump directly to the matching rows instead of reading everything. That's what an index does.

**Q6: Each option solves the problem differently and costs something different. Compare the tradeoffs. Which makes the most sense given that the orders table grows by 10,000 rows every day and `user_id` has 1,000 distinct values?**

- **Option A — Index on `user_id`:**
  - Pro: PostgreSQL jumps directly to one user's ~100 orders instead of scanning 100,000 rows. The write overhead of maintaining the index is negligible at 10,000 new orders per day.
  - Con: every INSERT now has to update the index too, though at this write volume that cost is trivial. **Best choice** — high cardinality (1,000 distinct values) means the index narrows results dramatically.
- **Option B — Paginate:**
  - Pro: reduces response size.
  - Con: doesn't fix the scan cost — PostgreSQL still reads the full table to find matching rows, it just returns fewer of them. The query is still slow.
- **Option C — Cache:**
  - Pro: fast reads once cached.
  - Con: adds infrastructure complexity (cache invalidation, staleness). Not warranted before trying the simpler fix first.

**Q7: Options B and C use the same columns but in different order. Why would that matter? Walk through what PostgreSQL would do with each one for a query that filters by `category = 'electronics'` AND `price_cents BETWEEN 10000 AND 50000`.**

- **Option A — Single-column index on `category`:**
  - Pro: simple, helps narrow to one category.
  - Con: PostgreSQL still has to scan all products in that category for the price range — partial improvement only.
- **Option B — Composite index `(category, price_cents)`:**
  - Pro: PostgreSQL jumps to all "electronics" products in one step, then scans within that group for the price range. One lookup handles both filters. **Best choice** — equality filter first, range filter second.
- **Option C — Composite index `(price_cents, category)`:**
  - Pro: still covers both columns.
  - Con: puts the range filter first. PostgreSQL finds all products between $100-$500 across ALL categories, then filters for "electronics" — a much larger initial set. Column order matters: equality before range gives PostgreSQL the tightest initial group to work with.

**Q8: You've now seen two sequential scans fixed with indexes. Your instinct might be to do the same here. But `status` has only 5 possible values across 100,000 rows — roughly 20,000 rows match any given status. Should you always add an index when you see a sequential scan? What would change your answer?**

- **Option A — Index on `status`:**
  - Pro: might speed up reads.
  - Con: with only 5 distinct values across 100,000 rows, ~20,000 rows match any given status (20%). PostgreSQL has to fetch each of those 20,000 rows individually via the index, bouncing between the index and the table data. A straight sequential scan is often faster. Every INSERT and UPDATE also has to maintain this index — cost with little benefit.
- **Option B — Don't add an index:**
  - Pro: no write overhead, no maintenance cost.
  - Con: the sequential scan stays. But when 20% of the table matches, the scan may actually be the fastest option anyway. **Most likely the right choice** — but you'd need to know how often this query runs to be sure.
- **Option C — Summary table:**
  - Pro: precomputed counts, instant reads regardless of table size.
  - Con: adds significant complexity — you need triggers or application logic to keep the summary table in sync with every order status change. Worth it only if the dashboard is refreshed constantly.

**Q9: What did PostgreSQL decide to do? Given what you know about cardinality, do you think adding an index on `status` would help? Would you add it?**

- PostgreSQL chose a Seq Scan. Adding an index on `status` would likely not change this — PostgreSQL would still choose the sequential scan because too many rows match each status value. The right answer is to not add the index. Recognizing when a tool doesn't fit the problem is as important as knowing when it does.

**Q10: You fixed two out of three slow endpoints. If your tech lead asked you to justify why you didn't add an index on `status`, what would you say?**

- The `status` column has only 5 distinct values across 100,000 rows. Any given status matches ~20,000 rows — 20% of the table. When that many rows match, PostgreSQL decides a sequential scan is faster than bouncing between the index and the table data for 20,000 scattered rows. I confirmed this by running EXPLAIN ANALYZE — PostgreSQL chose a Seq Scan even though there's no index. Adding one would slow down every INSERT and UPDATE to maintain an index that PostgreSQL would ignore anyway.

**Q11: The orders table gets 10,000 new orders every day. What's the downside of adding too many indexes to a write-heavy table?**

- Every INSERT has to update every index on the table, not just the table itself. With one index, each INSERT does two writes (table + index). With five indexes, each INSERT does six writes. At 10,000 orders per day that's manageable. At 10,000 orders per second, five indexes means 60,000 write operations per second — the database spends more time maintaining indexes than doing useful work. Each index also generates dead tuples that `autovacuum` has to clean up, compounding the overhead.

**Q12: If the orders table grew to 10 million rows and the admin dashboard was queried once per second, would your answer on the `status` index change? Why or why not?**

- It might. At 10 million rows, a sequential scan reads 100x more data than at 100,000 rows. If the dashboard queries once per second, that's a full table scan every second — significant I/O pressure. At that point, even a low-cardinality index might be worth the write overhead because the read cost has become so high. Alternatively, Option C (a summary table) starts looking more attractive — precomputed counts avoid the scan entirely. The right answer changed because the constraints changed. That's the point: engineering decisions depend on context, and context changes.

---

## Stuck?

| Problem                                            | What to do                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| psql command not found                             | Run `apk add --no-cache postgresql-client` in the terminal to install it, then retry                                                                  |
| Still seeing Seq Scan after adding index           | Run `ANALYZE orders;` inside psql to refresh the statistics PostgreSQL uses to choose between Seq Scan and Index Scan, then try EXPLAIN ANALYZE again |
| Load test results look the same after adding index | Make sure you exited psql and reran the load test                                                                                                     |
| Want to see the full solution                      | Open `solution/fix.sql` — it has all indexes with explanations of why the status index was left out                                                   |

---

_Next: Scenario 3 — Connection Pooling →_
