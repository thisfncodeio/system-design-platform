# Scenario 1: Connection Pools and Database Indexes

**Difficulty:** Entry Level  
**Concepts:** Connection Pooling, Database Indexes  
**Time:** ~60–75 minutes

---

## The Situation

You've just joined a startup as a backend engineer.

The backend server powers a simple social posts feed. Users can create posts (`POST /posts`), fetch a single user's posts (`GET /users/:id/posts`), and fetch a feed of the most recent posts (`GET /feed`). The code is clean. It works. The team ships it to production.

A few months later, traffic picks up dramatically. All this new traffic reveals a huge problem. The app starts timing out and users are getting errors.

Your tech lead messages you:

> _"Something's wrong with the feed endpoint. Can you look into it?"_

Your job is to figure out what's breaking and fix it.

![System Architecture Diagram](assets/diagram-architecture.svg)

_Fig 1.1: System Architecture Diagram_

---

## Diagnosis -- Before You Look at Any Code

Your tech lead said _"something's wrong with the feed endpoint."_ That's it. No hint about what's wrong or where.

Before reading on — take two minutes and answer this honestly:

**If this were your actual job, what would your first three steps be?**

Don't worry about being right. The point is to notice how you would instinctively approach this problem.

```
1.


2.


3.


```

### Here's how most experienced engineers would start:

**1. Check the metrics and logs first.**

Before reading a single line of code, they'd look at what's actually happening — error rates, response times, which endpoint is failing. Tools like Grafana (which you have in this scenario) show you the symptoms in real time. Symptoms tell you where to look.

**2. Reproduce the failure.**

They'd try to trigger the problem on purpose. If it happens under load, they'd run a load test. If they can't reproduce it, they can't confirm they've fixed it.

**3. Narrow down the bottleneck.**

Is it slow? Is it failing? Is it only under load? The database? The code? They'd form a hypothesis based on what they saw in step 1, then go look at the code with that specific question in mind — not just generally "what's wrong here?"

Notice what they don't do: they don't open the code and start reading hoping to spot something. They let the data tell them where to look.

In this scenario, you'll do exactly that.

---

## Before You Start — Two Concepts to Know

You don't need to be an expert on these yet. Read them once so the exercise makes sense. Keep these in mind as you read the code.

### What is a database index?

Imagine a textbook with no table of contents. To find a topic you we searching for, you'd have to read every page. A database index is like a table of contents — it lets the database jump straight to the data it needs instead of scanning every row. Without one, queries get slower as the table grows.

While technically you can put an index on any column. A good room of thumb: if you're frequently **sorting** or **filtering** by a column and the query is **slow**, check if there's an index on that column. If there isn't, add one and measure the difference.

Primary keys (`id`) are indexed automatically.

‼️ Don't add indexes speculatively on every column — add them in response to actual slow queries.

When an index makes sense:

- Columns you frequently sort by (`ORDER BY created_at`)
- Columns you frequently filter by (`WHERE user_id = ?`)
  - Foreign key columns are not indexed automatically
- Columns used in joins (`JOIN users ON posts.user_id = users.id`)

When an index doesn't make sense:

- Columns that are rarely queried — an index you never use just wastes storage
- Columns with very few distinct values — imagine an index on a `status` column that only has "active" or "inactive." Half the table is "active" so the index saves almost nothing. PostgreSQL might just scan the whole table anyway.
- Tables that are written to **extremely** frequently with very few reads — think logging tables with thousands of inserts per second — every INSERT, UPDATE, or DELETE has to update the index too. Too many indexes on a write-heavy table slows writes down. For most tables that are read more than they're written to, the cost of maintaining an index on writes is negligible. The `posts` table in this scenario gets written to when users create posts, but it's read far more often than it's written to — so the index is worth it.

&nbsp;
![Database Index Diagram](assets/diagram-index.svg)

_Fig 1.2: Database Index Diagram_

### What is a connection pool?

Opening a connection to a database takes time — roughly 50ms. A connection pool keeps connections open and ready to reuse rather than creating a new one for every request. It grows as demand increases, up to a maximum you set (`max`), and closes idle connections when traffic drops.

Without pooling, every request to your server has to open its own connection. PostgreSQL has a hard limit on how many it will accept at once (default: 100). Doing it 100 times simultaneously pushes the database to that ceiling and it starts refusing connections. With a pool, if the set max connections are busy, new requests wait their turn in a queue rather than failing immediately.

![Connection Pool Diagram](assets/diagram-connection-pool.svg)

_Fig 1.3: Connection Pool Diagram_

---

## Your Environment

Everything is already running. You don't need to install anything.

| Service           | Where     | What it is                                             |
| ----------------- | --------- | ------------------------------------------------------ |
| Feed API          | Port 3000 | The app you're investigating                           |
| Grafana Dashboard | Port 3002 | Live metrics — watch this during load tests            |
| Prometheus        | Port 9090 | Collects metrics from the app; Grafana reads from here |

The server runs under **nodemon** — a standard Node.js dev tool that watches your source files and automatically restarts the server when you save a change. You'll see this in action when you fix `server.js` in Step 3.

Open a terminal with **Ctrl+`** (or Terminal → New Terminal in the menu).

---

## How to Open Grafana

Grafana is your live metrics dashboard. You'll use it to watch what happens to the system during load tests.

1. Click the **Ports** tab at the bottom of VS Code.
1. Find **Port 3002** in the list.
1. Hover your mouse over the link.
1. Click the globe 🌐 icon next to it — this opens Grafana in your browser.
1. Login with **admin / admin**.
   1. If you are prompted to change your password, you can disregard this.
1. In the left sidebar click **Dashboards**.
1. Click **Scenario 1 — Connection Pools and Database Indexes**.

You should see four panels: **Successful Requests**, **Response Latency**, **Error Rate**, and **Success Rate %**. They will show "No data" until traffic hits the server — that's normal. Hover the ℹ️ icon on any panel for a plain-English explanation of what it shows and what to look for.

**Using Grafana:**

- The dashboard auto-refreshes every 5 seconds — you don't need to do anything, however you can also manually refresh the dashboard yourself.
- The default time range is "Last 5 minutes" — if you miss the load test window, change it to "Last 15 minutes" using the time picker in the top right
- Each panel shows a different signal. During a load test watch them all change at once — that's the system under stress in real time

---

## Step 1 — Reproduce the Failure

You can't investigate what you can't see. Your first move is to trigger the problem on purpose.

Before you run anything — based only on the Situation description — what's your guess about what will happen?

**Q1: What do you think will happen when 100 users hit `/feed` at the same time? Make a guess, even if you're not sure.**

```
Your guess:


```

Now open Grafana (see instructions above if you haven't yet), then run the load test:

```bash
npm run loadtest
```

This sends 100 concurrent users to the `/feed` endpoint for 30 seconds. That's not extreme traffic — a real app might handle thousands — but it's enough to reveal what's wrong here.

**While it runs:** watch all four Grafana panels. You'll see the request rate spike, latency climb, and the error rate shoot up almost immediately.

> 💡 **Tip:** Have Grafana open before you run the load test so you don't miss the data. If you do miss it, change the time range to "Last 15 minutes" to see what happened.

**After it finishes**, record what you saw:

| Metric          | Value |
| --------------- | ----- |
| Success rate    |       |
| Failed requests |       |
| Average latency |       |
| p99 latency     |       |

You now have evidence. You know which endpoint is failing, how bad the error rate is, and roughly what latency looks like under load. Keep these numbers — you'll compare them after each fix.

---

## Step 2 — Read the Code

You've seen the failure. Now go figure out why.

Open `src/server.js` and read the whole thing. You're not reading to understand the whole codebase — you're reading to answer one specific question: **what in this code could cause mass failures under load and slow queries?**

**Q2: What does `getDbConnection()` do? When does it get called?**

```
Your answer:


```

**Q3: The `/feed` endpoint sorts posts by `created_at DESC`. Open `db/schema.sql` and look at the posts table. What do you think happens to query speed as the posts table grows to millions of rows without one?**

```
Your answer:


```

**Q4: Your load test showed most requests failed. Now that you've read `getDbConnection()` — explain in your own words exactly why. Be specific about what is happening with each of the 100 concurrent requests.**

```javascript
function getDbConnection() {
  return new Pool({
    max: 1, // only 1 connection allowed
    connectionTimeoutMillis: 150, // give up after 150ms
  });
}
```

```
Your answer:


```

---

## Step 3 — Fix It

Your load test investigation and code review pointed to two problems:

1. **Reliability** — `getDbConnection()` creates a new pool on every request. Under load, most requests time out before getting a connection — they fail before any work is done.
2. **Latency** — The `/feed` query sorts by `created_at` with no index. PostgreSQL scans every row on every request and gets slower as the table grows.

### Fix 1: Reliability

**The problem:** Every request creates a brand new pool with only 1 connection allowed and a 150ms timeout. When 100 requests arrive at once, 99 of them can't get a connection in time and fail immediately.

**Before you change anything — let's consider some possible solutions:**

> **Option A — Shared connection pool.** Create one shared pool when the server starts. This allows us to reuse connections across requests. Requests queue when the pool is busy rather than failing immediately.
>
> **Option B — Increase the per-request limit.** Keep creating a new pool per request but raise the `max` from 1 to 100 and increase the timeout. More connections, less queueing.
>
> **Option C — Rate limit incoming requests.** Throttle how many requests hit the server at once so the connection limit is never reached.

**Q5: Part of being a good software engineer is identifying the pros and cons of possible solutions, what are the pros and cons of each solution above?**

```
Your answer:


```

**The fix:** Option A fixes the root cause: connections are expensive to open, so stop opening new ones for every request.

**What to do in `src/server.js`:**

Before (the problem):

```javascript
function getDbConnection() {
  return new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "feedapp",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    max: 1,
    connectionTimeoutMillis: 150,
  });
}
```

As a function, every time a request comes in, it runs `new Pool(...)` which creates a brand new pool from scratch. Each request gets its own isolated pool, so they never share connections. This causes three problems:

1. **Opening a connection is slow.** Every pool has to dial up PostgreSQL fresh — TCP handshake, authentication, setup. Under load, that overhead adds up fast.
2. **PostgreSQL has a global connection limit.** By default Postgres allows around 100 simultaneous connections total. If 80 requests hit the server at once, you're opening 80 connections to Postgres simultaneously. Postgres starts refusing new ones when it hits that limit.
3. **All that work gets thrown away.** After each request finishes, `await db.end()` tears the pool down completely. The next request starts from zero again.

`max: 1` means that pool can only ever hold one connection at a time.

`connectionTimeoutMillis: 150` means if that one connection is busy, the next request only waits 150ms (less than a blink) before giving up and failing.

> `max: 1` and `connectionTimeoutMillis: 150` don't really contribute to the crash here — they'd only matter if two queries _inside the same request_ competed for the pool's one connection slot, which rarely happens. The root issue is that no connections are ever shared or reused across requests.

After (the fix):

```javascript
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "feedapp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 10,
  connectionTimeoutMillis: 2000,
  idleTimeoutMillis: 30000,
});
```

- [ ] Replace the `getDbConnection()` function with the shared `db` pool above. This is the core of the fix — moving from "create a new pool per request" to "share one pool across all requests."
- [ ] In each route, remove `const db = getDbConnection()`. Since `db` is now defined at the top of the file, every route already has access to it and can share it.
- [ ] Remove all `await db.end()` calls — closing the pool after each request would defeat the entire purpose. A shared pool needs to stay open so the next request can reuse it. You only close a pool when the whole server shuts down.

A few things changed and each one matters:

- **It's now a `const` at the top of the file, not a function.** This means the pool is created once when the server starts and then reused for every request. Creating a database connection is slow (it involves a network handshake). Doing it on every single request is like hiring and firing a contractor for each 5-minute task instead of keeping them on staff.
- **`max: 10` (was `1`).** The pool can now hold up to 10 open connections at once. If 10 requests are running simultaneously, each gets its own connection. If an 11th comes in, it waits in line instead of crashing.
- **`connectionTimeoutMillis: 2000` (was `150`).** If all 10 connections are busy, a new request will now wait up to 2 seconds for one to free up. 150ms was so short that requests were failing before a connection even had a chance to become available.
- **`idleTimeoutMillis: 30000` (new).** If a connection hasn't been used in 30 seconds, the pool closes it to free up resources. This keeps the pool from holding onto connections unnecessarily when traffic is low.

> 💡 **Stuck?** Check that you moved the Pool to the top level of the file, not inside a function. If you're still stuck after genuinely trying, open `solution/server.fixed.js`.

Save the file. `nodemon` is running as the dev server — it detects the change and restarts automatically within a couple of seconds. Watch the terminal output for the restart confirmation.

Run the load test again and watch Grafana:

```bash
npm run loadtest
```

**What to expect:** The error rate should collapse to near zero and Success Rate % should turn green. Latency will still be around 500ms — that's not a bug. Fixing the pool makes the server _reliable_, not faster. Requests that were failing immediately are now completing, they're just still slow. The latency problem is what Fix 2 addresses.

### Fix 2: Add a Database Index for faster Queries

**The problem:** Every time `/feed` is called, PostgreSQL reads every row in the posts table to sort by `created_at`. With 10,000 rows this is slow. With millions of rows it would bring the system down.

**Q6: Why would sorting 10,000 rows with no index be slow? What about 1,000,000 rows?**

```
Your answer:


```

**Before you change anything — lets consider some possible solutions:**

> **Option A — Cache the feed response.** Store the result in memory for 30 seconds. Most requests never hit the database at all. Fast, but users see stale data until the cache expires.
>
> **Option B — Add an index on `created_at`.** PostgreSQL jumps directly to the most recent posts instead of scanning every row. Reads get faster, but every INSERT now has to update the index too.
>
> **Option C — Limit the query differently.** Instead of sorting all posts and taking 20, redesign the query to avoid the full sort — for example cursor-based pagination.

**Q7: Compare the pros and cons of all three options for the system right now, and if the table had 10 million rows and 10,000 writes per second.**

```
Your answer:


```

**The fix:** Option B _for now_. The table is read-heavy and write volume is low — the cost of maintaining the index on writes is negligible compared to the read benefit.

Here's the query in `src/server.js` that's causing the slow reads — you won't change this, but it's useful to see what PostgreSQL is actually running on every `/feed` request:

```javascript
SELECT
  posts.id,
  posts.user_id,
  posts.content,
  posts.created_at,
  users.username
FROM posts
JOIN users ON posts.user_id = users.id
ORDER BY posts.created_at DESC
LIMIT 20
```

The problem is `ORDER BY posts.created_at DESC`. Without an index, PostgreSQL has no shortcut — it reads every row in the `posts` table, sorts them all, and only then picks the top 20. The `EXPLAIN ANALYZE` query below mirrors this exactly so you can see what the database is doing under the hood.

Connect to the database:

```bash
psql postgresql://postgres:postgres@postgres:5432/feedapp
```

Check the execution plan before adding the index, run this in `psql`:

```sql
EXPLAIN ANALYZE
SELECT
  posts.id,
  posts.user_id,
  posts.content,
  posts.created_at,
  users.username
FROM posts
JOIN users ON posts.user_id = users.id
ORDER BY posts.created_at DESC
LIMIT 20;
```

PostgreSQL will print an execution plan — a breakdown of every step it takes to run the query. It looks something like this:

```
Limit  (cost=3284.55..3284.60 rows=20 width=72) (actual time=48.123..48.130 rows=20 loops=1)
  ->  Sort  (cost=3284.55..3534.55 rows=10000 width=72) (actual time=48.120..48.123 rows=20 loops=1)
        Sort Key: posts.created_at DESC
        Sort Method: top-N heapsort  Memory: 27kB
        ->  Hash Join  (cost=22.50..1972.00 rows=10000 width=72) (actual time=0.412..32.701 rows=10000 loops=1)
              ->  Seq Scan on posts  (cost=0.00..1722.00 rows=10000 width=56) (actual time=0.018..12.301 rows=10000 loops=1)
              ->  Hash  (cost=15.00..15.00 rows=600 width=24) (actual time=0.381..0.381 rows=600 loops=1)
                    ->  Seq Scan on users ...
Planning Time: 0.8 ms
Execution Time: 48.3 ms
```

Find the line that says `Seq Scan on posts`. That means PostgreSQL had no shortcut — it read every single row in the `posts` table before it could sort and return the top 20. The more rows you have, the worse this gets linearly. Now add the index:

```sql
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
```

Run `EXPLAIN ANALYZE` again:

```sql
EXPLAIN ANALYZE
SELECT
  posts.id,
  posts.user_id,
  posts.content,
  posts.created_at,
  users.username
FROM posts
JOIN users ON posts.user_id = users.id
ORDER BY posts.created_at DESC
LIMIT 20;
```

The plan should now look like this instead:

```
Limit  (cost=0.29..1.24 rows=20 width=72) (actual time=0.052..0.121 rows=20 loops=1)
  ->  Nested Loop  (cost=0.29..474.49 rows=10000 width=72) (actual time=0.050..0.114 rows=20 loops=1)
        ->  Index Scan using idx_posts_created_at on posts  (cost=0.29..224.49 rows=10000 width=56) (actual time=0.035..0.060 rows=20 loops=1)
        ->  Index Scan on users ...
Planning Time: 0.5 ms
Execution Time: 0.2 ms
```

`Seq Scan on posts` is gone. You now see `Index Scan using idx_posts_created_at on posts` — PostgreSQL jumped directly to the 20 most recent posts using the index instead of reading the whole table.

‼️ Notice the execution time dropped from ~48ms to ~0.2ms. WOW!

Type `\q` to exit, then run the load test one final time:

```bash
npm run loadtest
```

**What to expect:** Latency should drop significantly — without any code change. You didn't have to touch `server.js`. The index now exists in the database, the slowness was never in the code. It was in the database. Adding an index what all you needed to fix it.

---

## Step 4 — Compare Your Results

| Run                   | Success Rate | p99 Latency | Req/sec |
| --------------------- | ------------ | ----------- | ------- |
| Broken (Step 2)       |              |             |         |
| After Fix 1 (pooling) |              |             |         |
| After Fix 2 (index)   |              |             |         |

The difference between the first and last row is what you just learned.

---

## What You Learned

**Connection pooling** is not optional in production. Creating a new database connection per request is one of the most common and costly mistakes in early backend code. Every production backend uses a shared pool.

**Indexes** are one of the highest-leverage tools available to a backend engineer. A missing index on a column you sort or filter by will work fine at small scale and silently become a crisis at large scale. Adding one can turn a seconds-long query into a milliseconds-long one.

**Tradeoffs are real.** There was more than one way to fix each problem. The right answer depended on context — the scale of the data, the write volume, the complexity budget. That's engineering judgment. It gets sharper with practice.

**Grafana and Prometheus** are the industry standard for observability. You just used the same tools engineers use at companies of every size to diagnose production problems in real time.

You didn't just read about these concepts. You watched them fail in real time, reasoned through your options, and fixed them. That's the difference.

---

## Common Questions

**Why use a Pool instead of a direct connection to the database?**

- `pg` has a `Client` class for a single direct connection. For a script that runs once and exits, that's fine. For a web server, it has two problems: if two async requests try to use the same `Client` at the same time you get errors, and if the database connection drops for any reason the `Client` is just broken — you have to write your own reconnection logic. A Pool handles both: it queues concurrent requests and automatically replaces dead connections.

**Why can't you just increase `max` and the timeout in `getDbConnection()` instead of replacing it with a shared pool?**

- The problem isn't the numbers — it's that `getDbConnection()` is called on every request, which means every request creates its own independent pool. Pools don't share connections with each other. 100 concurrent requests means 100 separate pools each trying to open their own connections to PostgreSQL. If each pool has `max: 100`, you're trying to open 10,000 connections against a database that only allows 100. You've made it worse. A shared pool fixes this because there is ONE pool, created once at startup, and every request borrows a connection from it. When all connections are busy, requests queue and wait — none of them fail.

**The broken code uses a Pool too — just with `max: 1`. Why isn't that enough?**

- The problem isn't the pool size — it's that `getDbConnection()` is called on every request, so every request creates its own independent pool. Pools don't share connections with each other. 100 concurrent requests means 100 separate pools each trying to open their own connections to PostgreSQL. Raising `max` to 100 would make it worse — you'd be trying to open 10,000 connections against a database that only allows 100. A shared pool fixes this because there is ONE pool, created once at startup, and every request borrows a connection from it. Requests that can't get one immediately wait in a queue.

**Why did `connectionTimeoutMillis` increase from 150ms to 2000ms?**

- With the shared pool, requests queue when all connections are busy. `connectionTimeoutMillis` is how long a request will wait in that queue before giving up. Each request takes ~500ms to complete due to the slow query — so a queued request might wait that long just to get a connection. At 150ms it gives up before it ever gets one, defeating the point of the queue. 2000ms gives requests enough time to wait their turn and succeed.

**Why is `idleTimeoutMillis` new — it wasn't in the broken code?**

- The broken code never needed it because every pool was created, used once, and immediately destroyed. There was nothing to idle. A shared pool holds connections open permanently so they're ready to reuse. Without `idleTimeoutMillis`, if traffic drops off the pool holds open 10 connections to PostgreSQL forever, wasting resources on both sides. 30 seconds means: close a connection that hasn't been used in 30 seconds. Long enough to survive a brief quiet period without killing connections you're about to need, short enough not to hold resources indefinitely.

**Why does the "after" EXPLAIN ANALYZE show an `Index Scan on users` — we never added an index to the users table?**

- Two things are happening. First, PostgreSQL automatically creates an index on every primary key column. When the `users` table was created with an `id` primary key, an index on `users.id` was silently created for you. Second, adding our `created_at` index changed the entire query plan, not just the posts scan. Before the index, PostgreSQL used a **Hash Join**: read all 10,000 posts and all users into memory, then match them. That's efficient when you're pulling large chunks of both tables — and since the primary key index on `users.id` wasn't useful for loading every row anyway, PostgreSQL ignored it and did a `Seq Scan on users` instead. After the index, PostgreSQL knows it can fetch just 20 posts cheaply and in order, so it switches to a **Nested Loop**: fetch post #1 from the index, look up that one user by primary key, repeat 20 times. Now the primary key index is worth using — 20 targeted lookups is far cheaper than loading all users into a hash table. The `Seq Scan on users` becomes an `Index Scan on users` not because anything changed on the users table, but because the overall strategy changed. One index rippled through and changed the entire query plan.

**Why are we running SQL directly in psql instead of using a migration?**

- In a real production codebase you'd never run `CREATE INDEX` directly against the database. You'd write it as a migration — a versioned SQL file (e.g. `0003_add_idx_posts_created_at.sql`) committed to the repo and applied automatically by a migration tool like Flyway or Liquibase. That way the change is tracked, reproducible, and applied consistently across every environment. This scenario skips migrations because they add tooling and setup complexity that would distract from the actual lesson — indexes. The raw psql approach gets you to the same outcome faster in a learning context.

**What is `EXPLAIN ANALYZE` and why does it matter?**

- `EXPLAIN ANALYZE` is a command you put in front of any SQL query to get a report on exactly how PostgreSQL executed it. `EXPLAIN` alone tells you the _plan_ — what PostgreSQL intends to do. `ANALYZE` actually runs the query and tells you what it _did do_, including real timing. Together they show you two things:
  - **Seq Scan** — PostgreSQL read every row in the table from top to bottom to find what you asked for. This is the slow path. A table with 10,000 rows means 10,000 reads on every request, and it gets worse as the table grows.
  - **Index Scan** — PostgreSQL used an index to jump directly to the matching rows, the same way a book index lets you skip to the right page instead of reading every page. This is the fast path.

---

## Stuck at Any Point?

| Problem                                      | What to do                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Load test shows no errors after Fix 1        | Check the terminal — nodemon should have restarted automatically when you saved the file        |
| Grafana showing "No data"                    | Make sure you ran `npm run loadtest` first — panels only show data when traffic hits the server |
| Grafana panels are empty after the load test | Change the time range to "Last 15 minutes" in the top right                                     |
| Can't find the dashboard in Grafana          | Click Dashboards in the left sidebar → Scenario 1 — Connection Pools and Database Indexes       |
| psql command not found                       | Run `apk add --no-cache postgresql-client` in the terminal to install it, then retry            |
| Still seeing Seq Scan after adding index     | Run `ANALYZE posts;` inside psql and then try EXPLAIN ANALYZE again                             |
| Really stuck on the code fix                 | Open `solution/server.fixed.js` — it has the full solution with comments                        |
| Really stuck on the index fix                | Open `solution/fix.sql` — it has the exact SQL with an explanation of why it works              |

---

## Answer Key

Use this after you've written your own answers. Don't skip to this first — the value is in thinking it through yourself before checking.

**Q1: What do you think will happen when 100 users hit `/feed` at the same time? Make a guess, even if you're not sure.**

- Most requests will fail. Each of the 100 users triggers a new pool with `max: 1` and a 150ms timeout. All 100 try to open a connection to PostgreSQL simultaneously. Most of them can't get one within 150ms and return an error immediately. The server can't keep up.

**Q2: What does `getDbConnection()` do? When does it get called?**

- `getDbConnection()` creates a brand new PostgreSQL connection pool and returns it. It gets called at the start of every route handler — every time a request hits `/feed`, `/posts`, or `/users/:id/posts`. That means every single HTTP request creates its own pool from scratch, uses it once, and closes it.

**Q3: The `/feed` endpoint sorts posts by `created_at DESC`. Open `db/schema.sql` and look at the posts table. What do you think happens to query speed as the posts table grows to millions of rows without one?**

- `db/schema.sql` defines no index on `created_at`. Without one, PostgreSQL reads every row in the table on every `/feed` request to find and sort the results. With 10,000 rows it's slow but survivable. With 1,000,000 rows it reads a million rows to return 20 — query time grows linearly with the table, and eventually the app becomes unusable.

**Q4: Your load test showed most requests failed. Now that you've read `getDbConnection()` — explain in your own words exactly why. Be specific about what is happening with each of the 100 concurrent requests.**

- Each of the 100 concurrent requests calls `getDbConnection()` and creates its own independent pool — none of them share connections. All 100 pools compete to open a connection to PostgreSQL at the same time. Each pool only allows 1 connection and gives up after 150ms. The requests that don't get a connection within that window fail immediately with a timeout error. The database is barely touched — the failure happens before queries even run.

**Q5: Part of being a good software engineer is identifying the pros and cons of possible solutions, what are the pros and cons of each solution above?**

- **Option A — Shared connection pool:**
  - **Pro:** Fixes the root cause — one pool is created at startup and connections are reused across all requests, eliminating the overhead of opening a new pool on every request. When the pool is busy, requests queue rather than fail.
  - **Con:** The pool has a fixed size. If a traffic spike sends more requests than the pool can handle, they queue up (and can time out if the queue grows too long). Requires refactoring how the app initializes the database connection.

- **Option B — Increase the per-request limit:**
  - **Pro:** Easy to apply — just change a number in the config. No structural refactor needed.
  - **Con:** The underlying problem is still there — a new pool is still created for every request. Raising `max` to 100 means each of the 100 concurrent requests tries to open 100 connections: 100 pools × 100 connections = up to 10,000 simultaneous connection attempts against a database that allows 100. You've made the problem significantly worse while changing almost nothing.

- **Option C — Rate limit incoming requests:**
  - **Pro:** Prevents the server from being overwhelmed in the short term. Simple to add as middleware and useful as a general defensive layer regardless of which other fix you choose.
  - **Con:** Doesn't touch the root cause — connections are still created per request. At high traffic, users get rejected with a 429 error instead of being served. You're turning away load rather than handling it efficiently.

**Q6: Why would sorting 10,000 rows with no index be slow? What about 1,000,000 rows?**

- Without an index, the database does a sequential scan — it reads every row in the table to find and sort the results. At 10,000 rows it reads 10,000 rows just to return 20. At 1,000,000 rows it reads all 1,000,000 rows to return 20. The work grows linearly with the table size. An index gives the database a pre-sorted shortcut so it can jump directly to the rows it needs.

**Q7: Compare the pros and cons of all three options for the system right now, and if the table had 10 million rows and 10,000 writes per second.**

**For the current system (low write volume, read-heavy):**

- **Option A — Caching:**
  - **Pro:** Most requests never touch the database — huge read relief.
  - **Con:** Users see stale data for up to 30 seconds. Also, if the cache misses (expires or restarts), the underlying slow query still runs. You've hidden the problem, not fixed it.

- **Option B — Index:**
  - **Pro:** Reads get faster immediately and no stale data. The database can jump straight to the newest rows instead of scanning everything.
  - **Con:** Every INSERT must update the index. At the current low write volume, this overhead is negligible. **Best choice right now** — the system is read-heavy, so the read speedup far outweighs the small write cost.

- **Option C — Cursor-based pagination:**
  - **Pro:** Avoids the full table sort entirely — the most efficient query shape.
  - **Con:** More complex to implement and changes how the API works (callers must track a cursor token instead of a page number). Overkill for the current scale.

**At 10 million rows and 10,000 writes per second:**

- **Option A — Caching:**
  - **Pro:** Still absorbs the read load well — most requests never hit the database, which matters even more at this scale.
  - **Con:** 10,000 writes/sec means the feed changes constantly. A 30-second stale window is very noticeable to users. Cache invalidation also becomes much harder to get right at this volume.

- **Option B — Index:**
  - **Pro:** Reads are still fast — the database can still jump to the newest rows without a full scan.
  - **Con:** 10,000 writes/sec means the index is updated 10,000 times per second. The database spends significant time maintaining the index structure on every INSERT, and write throughput drops. That maintenance overhead is no longer negligible — it becomes a write bottleneck and can cause the database to struggle keeping up.

- **Option C — Cursor-based pagination:**
  - **Pro:** Avoids the full table sort on every read, which matters a lot when sorting across 10 million rows. This strategy gets more valuable the larger the table grows.
  - **Con:** Still doesn't address write pressure on its own, but combined with caching it shields the database from both sides — fewer expensive reads and a way to handle the burst of writes without hammering the index on every lookup. It's also complex to implement and changes the API contract.

At that scale, no single option is enough. The practical answer is **Option C** for query efficiency plus **Option A** for read shielding, with the index potentially reconsidered or replaced by a write-optimized approach like a separate sorted feed table.

---

_Next: Scenario 2 — Indexes and Slow Queries →_
