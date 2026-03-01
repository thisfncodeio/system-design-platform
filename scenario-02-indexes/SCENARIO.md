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
/orders:          filters by _______________, sorts by _______________
/products:        filters by _______________ and _______________
/orders/summary:  filters by _______________
```

**Q3: Open `db/seed.js`. How many distinct values does the `status` column have? How does that compare to the number of distinct values in `user_id`?**

The number of distinct values a column has is called its **cardinality**. A column with 5 possible values has low cardinality. A column with 1,000 possible values has high cardinality.

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

**How to read the output:** `EXPLAIN ANALYZE` prints a tree of operations. The tree can have multiple levels — sorts, joins, scans — nested inside each other. You're looking for two things:

1. **Scan nodes** — search the output for the scan type on the table you care about. These won't always be at the top — in a query with a JOIN, you'll see multiple scan nodes (one per table). The three scan types you'll see:
   - `Seq Scan` = sequential scan = reading every row = slow on large tables
   - `Index Scan` = using an index to find rows one by one = fast
   - `Bitmap Index Scan` + `Bitmap Heap Scan` = using an index to find many matching rows at once = also fast. PostgreSQL picks this over Index Scan when it expects multiple results.
2. **`Execution Time`** at the bottom — how long the query actually took in milliseconds

Run each query and record what you see:

**Query 1 — `/orders?user_id=1`:**

```sql
EXPLAIN ANALYZE
SELECT orders.id, orders.user_id, orders.status, orders.total_cents, orders.created_at, users.email
FROM orders
  JOIN users ON orders.user_id = users.id
WHERE orders.user_id = 1
ORDER BY orders.created_at DESC;
```

```
Scan on orders: Seq Scan / Index Scan / Bitmap Index Scan  ← circle which one
Execution time:
```

**Query 2 — `/products?category=electronics&min_price=100&max_price=500`:**

(Note: the API accepts dollar amounts — `min_price=100` means $100. The server converts to cents internally: 100 × 100 = 10000. The SQL queries the raw `price_cents` column directly, so the numbers look different from the URL.)

```sql
EXPLAIN ANALYZE
SELECT id, name, category, price_cents, stock
FROM products
WHERE category = 'electronics'
  AND price_cents >= 10000
  AND price_cents <= 50000
ORDER BY price_cents ASC
LIMIT 50;
```

```
Scan on products: Seq Scan / Index Scan / Bitmap Index Scan  ← circle which one
Execution time:
```

**Query 3 — `/orders/summary?status=pending`:**

```sql
EXPLAIN ANALYZE
SELECT status, COUNT(*) as count, SUM(total_cents) as total_revenue_cents
FROM orders
WHERE status = 'pending'
GROUP BY status
ORDER BY count DESC;
```

```
Scan on orders: Seq Scan / Index Scan / Bitmap Index Scan  ← circle which one
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

**The problem:** Every time a user loads their order history (`/orders?user_id=1`), PostgreSQL scans all 100,000 orders to find the ones belonging to that one user. The more orders in the database, the slower this gets.

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

The name `idx_orders_user_id` follows the convention `idx_<table>_<column>`. You can name an index anything, but this convention makes it obvious what table and column it belongs to when you see it in an `EXPLAIN ANALYZE` plan.

Verify PostgreSQL is using it:

```sql
EXPLAIN ANALYZE
SELECT orders.id, orders.user_id, orders.status, orders.total_cents, orders.created_at, users.email
FROM orders
  JOIN users ON orders.user_id = users.id
WHERE orders.user_id = 1
ORDER BY orders.created_at DESC;
```

You should now see `Index Scan` or `Bitmap Index Scan` instead of `Seq Scan`. Both mean the index is being used.

```
Scan on orders: Seq Scan / Index Scan / Bitmap Index Scan  ← write which one
Execution time:
```

Type `\q` to exit, then run the load test and watch Grafana:

```bash
npm run loadtest
```

What happened to `/orders?user_id` latency?

---

### Fix 2: Product search by category and price

**The problem:** The product search filters by `category` AND `price_cents`. With 100,000 products and no index, PostgreSQL scans every product for every search request.

**Before you change anything — let's consider some possible solutions:**

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
EXPLAIN ANALYZE
SELECT id, name, category, price_cents, stock
FROM products
WHERE category = 'electronics'
  AND price_cents >= 10000
  AND price_cents <= 50000
ORDER BY price_cents ASC
LIMIT 50;
```

Look for `Index Scan` or `Bitmap Index Scan` on `idx_products_category_price`. Both mean the index is being used.

```
Scan on products: Seq Scan / Index Scan / Bitmap Index Scan  ← write which one
Execution time:
```

Type `\q` to exit, then run the load test again.

---

### Fix 3? Orders by status

**The situation:** The `/orders/summary` endpoint filters by `status`. It's still doing a sequential scan.

**Before you change anything — let's consider some possible solutions:**

> **Option A — Add an index on `orders.status`.** Might help reads. Will slow down every INSERT and UPDATE to the orders table because the index has to be maintained.
>
> **Option B — Don't add an index.** Accept the sequential scan. It may actually be the right choice depending on the data distribution.
>
> **Option C — Rewrite the query.** Instead of filtering by status at query time, maintain a separate summary table that gets updated when orders change status.

**Q8: What's one argument for and one argument against each option?**

```
Option A — Index on status:
  For:
  Against:

Option B — No index:
  For:
  Against:

Option C — Summary table:
  For:
  Against:
```

Before committing to your answer, check what PostgreSQL actually does:

```bash
psql postgresql://postgres:postgres@postgres:5432/shopdb
```

```sql
EXPLAIN ANALYZE
SELECT status, COUNT(*) as count, SUM(total_cents) as total_revenue_cents
FROM orders
WHERE status = 'pending'
GROUP BY status
ORDER BY count DESC;
```

Look carefully at what PostgreSQL chose. Now try adding the index and running the same query again:

```sql
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
```

```sql
EXPLAIN ANALYZE
SELECT status, COUNT(*) as count, SUM(total_cents) as total_revenue_cents
FROM orders
WHERE status = 'pending'
GROUP BY status
ORDER BY count DESC;
```

Did the scan type change? Did the execution time improve? By how much compared to the improvements you saw on the other two endpoints?

![Cardinality Diagram](assets/diagram-cardinality.svg)

_Fig. 2.4: Cardinality Diagram_

**Q9: The index improved the query — but was the improvement worth it? Compare the before/after for this endpoint to the before/after for `/orders` and `/products`. Would you keep this index or drop it?**

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

**Q10: You tested an index on `status` and saw a modest improvement. If your tech lead asked whether you'd keep it in production, what would you say?**

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

**Cardinality affects how much an index helps.** High cardinality columns (user_id, email, product_id) benefit dramatically from indexes — they filter out most of the table. Low cardinality columns (status, boolean flags, country codes) benefit less because the index still has to touch a large fraction of the rows. The index works, but the improvement may not justify the write overhead.

**Composite indexes cover multiple columns.** When you filter by two columns together, a composite index is more efficient than two separate indexes. Column order matters: equality filters before range filters.

**Not adding an index is a valid decision.** You tested the status index, saw it helped a little, and weighed that against the write cost on every order. Deciding the tradeoff isn't worth it is just as valid as adding the index. That's engineering judgment — the same process a senior engineer follows.

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

**Q3: Open `db/seed.js`. How many distinct values does the `status` column have? How does that compare to the number of distinct values in `user_id`?**

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

**Q8: What's one argument for and one argument against each option?**

- **Option A — Index on `status`:**
  - For: PostgreSQL will use the index — execution time drops.
  - Against: with only 5 distinct values across 100,000 rows, ~14,000-20,000 rows match any given status. The improvement is modest because the index still has to touch a large fraction of the table. Every INSERT and UPDATE also has to maintain this index — ongoing write cost for a small read gain.
- **Option B — No index:**
  - For: no write overhead, no maintenance cost. The admin dashboard probably isn't queried often enough to justify the index maintenance on every order write.
  - Against: the sequential scan stays. If the table grows significantly or the query runs frequently, the full scan cost adds up.
- **Option C — Summary table:**
  - For: precomputed counts, instant reads regardless of table size.
  - Against: adds significant complexity — you need triggers or application logic to keep the summary table in sync with every order status change. Worth it only if the dashboard is refreshed constantly.

**Q9: The index improved the query — but was the improvement worth it? Compare the before/after for this endpoint to the before/after for `/orders` and `/products`. Would you keep this index or drop it?**

- PostgreSQL used the index (Bitmap Index Scan) and execution time dropped — but the improvement is modest compared to the other two endpoints. The `/orders` and `/products` indexes turned full table scans on high-cardinality columns into fast lookups, often 10-50x faster. The `status` index improved a query that was already returning 14% of the table — there's less work to skip. Meanwhile, every INSERT and UPDATE to the orders table now has to maintain this index. For an admin dashboard that's queried occasionally, the write overhead on every order may not be worth a few milliseconds of read improvement. Dropping it is a reasonable decision. Keeping it is defensible too — the point is that you're making the call based on evidence, not reflex.

**Q10: You tested an index on `status` and saw a modest improvement. If your tech lead asked whether you'd keep it in production, what would you say?**

- The `status` column has only 5 distinct values across 100,000 rows. I added the index and tested it — PostgreSQL used it, and execution time dropped from ~11ms to ~6ms. But compare that to the `/orders` and `/products` fixes, where execution times dropped from tens of milliseconds to under 1ms. The status index gives a modest improvement because it still has to touch ~14,000 rows — 14% of the table. Meanwhile, every INSERT and UPDATE to the orders table now pays the cost of maintaining that index. For an admin dashboard that runs occasionally, I'd drop the index and save the write overhead. But if the dashboard ran frequently or the table was much larger, I'd keep it. Either answer is defensible — the important thing is that it's based on measurement, not instinct.

**Q11: The orders table gets 10,000 new orders every day. What's the downside of adding too many indexes to a write-heavy table?**

- Every INSERT has to update every index on the table, not just the table itself. With one index, each INSERT does two writes (table + index). With five indexes, each INSERT does six writes. At 10,000 orders per day that's manageable. At 10,000 orders per second, five indexes means 60,000 write operations per second — the database spends more time maintaining indexes than doing useful work. Each index also generates dead tuples that `autovacuum` has to clean up, compounding the overhead.

**Q12: If the orders table grew to 10 million rows and the admin dashboard was queried once per second, would your answer on the `status` index change? Why or why not?**

- It might. At 10 million rows, a sequential scan reads 100x more data than at 100,000 rows. If the dashboard queries once per second, that's a full table scan every second — significant I/O pressure. At that point, even a low-cardinality index might be worth the write overhead because the read cost has become so high. Alternatively, Option C (a summary table) starts looking more attractive — precomputed counts avoid the scan entirely. The right answer changed because the constraints changed. That's the point: engineering decisions depend on context, and context changes.

---

## Common Questions

**The status index made the query faster. Why wouldn't I keep it?**

- You can keep it — it's not wrong. The question is whether the improvement justifies the cost. The `/orders` and `/products` indexes turned full table scans into sub-millisecond lookups because they filter out 99%+ of the table. The `status` index still has to touch ~14% of the table, so the improvement is modest. Meanwhile, every INSERT and UPDATE to the orders table pays the cost of maintaining that index. For a high-write table serving an admin dashboard that runs occasionally, the tradeoff may not be worth it. For a dashboard that runs every second, it might be. The point isn't that the answer is always "don't index low cardinality columns" — it's that you measure the improvement and weigh it against the cost instead of adding indexes reflexively.

**Why did PostgreSQL use Bitmap Index Scan instead of Index Scan for the orders query?**

- Both use the index. The difference is strategy. An Index Scan looks up rows one at a time — find a match in the index, go fetch that row from the table, repeat. A Bitmap Index Scan collects all matching entries from the index first, sorts them by their physical location on disk, then fetches them in order. This avoids jumping back and forth across the disk when there are many matches. PostgreSQL picks Bitmap when it expects enough matching rows that the sorted batch fetch is faster than one-by-one lookups.

**Can I test an index without actually adding it to the table?**

- Not with vanilla PostgreSQL. There's no built-in "what if" mode for indexes. The practical approach is what you did in Fix 3: create the index, run EXPLAIN ANALYZE to measure the improvement, and drop it if you decide it's not worth keeping (`DROP INDEX idx_orders_status;`). This is what engineers do in practice — create, measure, decide.

**Does low cardinality always mean "don't add an index"?**

- No. Cardinality alone doesn't tell you enough — the data distribution matters too. Imagine a column with only two values: `approved` and `denied`. If 95% of rows are `approved` and you're querying `WHERE status = 'denied'`, the index only has to touch 5% of the table — that's a big win. But `WHERE status = 'approved'` hits 95% of the table, so a sequential scan would be faster for that query. Same column, same two values, different answers depending on which value you're filtering for and how the data is distributed. The number of distinct values is a starting point, not the whole picture.

**Is less than 1ms always the goal for EXPLAIN ANALYZE?**

- No. There's no universal target — it depends on what the query does and where it runs. A simple lookup by indexed column in sub-millisecond is normal. A complex aggregation across millions of rows in 50ms might be excellent. A nightly report in 5 seconds might be fine. What matters is whether the query is fast enough for its use case. An endpoint users hit on every page load needs to be fast. An admin dashboard queried a few times a day can be slower. The load test makes this real — the problem isn't that a single query takes 11ms, it's that 50 concurrent users each triggering an 11ms full table scan stack up and p99 latency spikes.

**Does adding an index slow down writes?**

- Yes. Every INSERT, UPDATE, or DELETE on an indexed column has to update the index too. For a single index on a table with moderate write traffic, the cost is small — you won't notice it. But indexes add up. If you add indexes to every column "just in case," every write operation pays the cost of maintaining all of them. That's why you only add indexes where they actually help reads enough to justify the write overhead.

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
