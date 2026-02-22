# Scenario 1: Connection Pools and Database Indexes

**Difficulty:** Entry Level  
**Concepts:** Connection Pooling, Database Indexes
**Time:** ~45 minutes

---

## The Situation

You've just joined a startup as a junior backend engineer.

The backend server powers a simple social post feed. Users can create posts (`POST /posts`), fetch a single user's posts (`GET /users/:id/posts`), and fetch a feed of the most recent posts (`GET /feed`). The code is clean. It works. The team ships it to production.

A week later, traffic picks up dramatically. But all this new traffic reveals a huge problem. The app starts timing out and users are getting errors.

Your tech lead messages you:

> _"Something's wrong with the feed endpoint. Can you look into it?"_

Your job is to figure out what's breaking and fix it.

![System Architecture Diagram](assets/diagram-architecture.svg)

_Fig 1.1: System Architecture Diagram_

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

Without pooling, every request to your server has to open its own connection. Opening connections is expensive — roughly 50ms each — and PostgreSQL has a hard limit on how many it will accept at once (default: 100). Doing it 100 times simultaneously pushes the database to that ceiling and it starts refusing connections. With a pool, if the set max connections are busy, new requests wait their turn in a queue rather than failing immediately.

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
   a. If you are prompted to change your password, you can disregard this.
1. In the left sidebar click **Dashboards**.
1. Click **Scenario 1 — Connection Pools and Database Indexes**.

You should see four panels: **Successful Requests**, **Response Latency**, **Error Rate**, and **Success Rate %**. They will show "No data" until traffic hits the server — that's normal. Hover the ℹ️ icon on any panel for a plain-English explanation of what it shows and what to look for.

**Using Grafana:**

- The dashboard auto-refreshes every 5 seconds — you don't need to do anything, however you can also manually refresh the dashboard yourself.
- The default time range is "Last 5 minutes" — if you miss the load test window, change it to "Last 15 minutes" using the time picker in the top right
- Each panel shows a different signal. During a load test watch them all change at once — that's the system under stress in real time

---

## Step 1 — Read the Code

Open `src/server.js`. It's not long — read the whole thing.

Then answer these questions. Write your answers directly in this file below each question. This is how engineers actually think through a system before touching it.

**Q1: What does `getDbConnection()` do? When does it get called?**

```
Your answer:


```

**Q2: The `/feed` endpoint sorts posts by `created_at DESC`. Open `db/schema.sql` and look at the posts table. What do you think happens to query speed as the posts table grows to millions of rows without one?**

```
Your answer:


```

**Q3: Before running anything — what do you think will happen when 100 users hit the server at the same time? Make a guess, even if you're not sure.**

```
Your guess:


```

---

## Step 2 — Run the Load Test

In your terminal, run:

```bash
npm run loadtest
```

This sends 100 concurrent users to the `/feed` endpoint for 30 seconds. That's not extreme traffic — a real app might handle thousands — but it's enough to reveal what's wrong here.

**While it runs:** switch to Grafana in your browser and watch all four panels. You'll see the request rate spike, latency climb, and the error rate shoot up almost immediately.

> 💡 **Tip:** Have Grafana open before you run the load test so you don't miss the data. If you do miss it, change the time range to "Last 15 minutes" to see what happened.

**After it finishes**, record what you saw:

| Metric          | Value |
| --------------- | ----- |
| Success rate    |       |
| Failed requests |       |
| Average latency |       |
| p99 latency     |       |

**Q4: Your results show most requests failed. Looking at `getDbConnection()` — explain in your own words exactly why. Be specific about what is happening with each of the 100 concurrent requests.**

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

Your load test and code review pointed to two problems:

1. **Reliability** — `getDbConnection()` creates a new pool on every request. Under load, most requests time out before getting a connection — they fail before any work is done.
2. **Latency** — The `/feed` query sorts by `created_at` with no index. PostgreSQL scans every row on every request and gets slower as the table grows.

### Fix 1: Adding Reliability with Connection Pooling

**The problem:** Every request creates a brand new pool with only 1 connection allowed and a 150ms timeout. When 100 requests arrive at once, 99 of them can't get a connection in time and fail immediately.

**Before you change anything — let's consider some possible solutions:**

> **Option A — Add Connection pooling.** Create one shared pool when the server starts. This allows us to reuse connections across requests. Requests queue when the pool is busy rather than failing immediately.
>
> **Option B — Increase the per-request limit.** Keep creating a new pool per request but raise the `max` from 1 to 100 and increase the timeout. More connections, less queueing.
>
> **Option C — Rate limit incoming requests.** Throttle how many requests hit the server at once so the connection limit is never reached.

**Q5: Compare all three options, which option fixes the root cause? Which ones just treat the symptom?**

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

- [ ] Replace the `getDbConnection()` function with the shared `db` pool above.
- [ ] In each route, remove `const db = getDbConnection()`. We're going to use the shared `db` we just defined.
- [ ] Remove all `await db.end()` calls — you don't close a shared pool after each request

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

**Q7: For this system right now — compare all three option, which makes the most sense and why? What would change your answer if this table had 10 million rows and 10,000 writes per second?**

```
Your answer:


```

**The fix:** Option B _for now_. The table is read-heavy and write volume is low — the cost of maintaining the index on writes is negligible compared to the read benefit.

Connect to the database:

```bash
psql postgresql://postgres:postgres@postgres:5432/feedapp
```

Check the execution plan before adding the index:

```sql
EXPLAIN ANALYZE SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
```

Look for `Seq Scan`. Now add the index:

```sql
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
```

Run `EXPLAIN ANALYZE` again:

```sql
EXPLAIN ANALYZE SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
```

You should now see `Index Scan`.

Type `\q` to exit, then run the load test one final time:

```bash
npm run loadtest
```

**What to expect:** Latency should drop significantly — without any code change. You didn't touch `server.js`. The index now exists in the database, so the simulation detects it and stops adding the delay. That's the point: the slowness was never in the code. It was in the database. The index is what fixed it.

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

`pg` has a `Client` class for a single direct connection. For a script that runs once and exits, that's fine. For a web server, it has two problems: if two async requests try to use the same `Client` at the same time you get errors, and if the database connection drops for any reason the `Client` is just broken — you have to write your own reconnection logic. A Pool handles both: it queues concurrent requests and automatically replaces dead connections.

**Why can't you just increase `max` and the timeout in `getDbConnection()` instead of replacing it with a shared pool?**

The problem isn't the numbers — it's that `getDbConnection()` is called on every request, which means every request creates its own independent pool. Pools don't share connections with each other. 100 concurrent requests means 100 separate pools each trying to open their own connections to PostgreSQL. If each pool has `max: 100`, you're trying to open 10,000 connections against a database that only allows 100. You've made it worse. A shared pool fixes this because there is ONE pool, created once at startup, and every request borrows a connection from it. When all connections are busy, requests queue and wait — none of them fail.

**The broken code uses a Pool too — just with `max: 1`. Why isn't that enough?**

The problem isn't the pool size — it's that `getDbConnection()` is called on every request, so every request creates its own independent pool. Pools don't share connections with each other. 100 concurrent requests means 100 separate pools each trying to open their own connections to PostgreSQL. Raising `max` to 100 would make it worse — you'd be trying to open 10,000 connections against a database that only allows 100. A shared pool fixes this because there is ONE pool, created once at startup, and every request borrows a connection from it. Requests that can't get one immediately wait in a queue.

**Why did `connectionTimeoutMillis` increase from 150ms to 2000ms?**

With the shared pool, requests queue when all connections are busy. `connectionTimeoutMillis` is how long a request will wait in that queue before giving up. Each request takes ~500ms to complete due to the slow query — so a queued request might wait that long just to get a connection. At 150ms it gives up before it ever gets one, defeating the point of the queue. 2000ms gives requests enough time to wait their turn and succeed.

**Why is `idleTimeoutMillis` new — it wasn't in the broken code?**

The broken code never needed it because every pool was created, used once, and immediately destroyed. There was nothing to idle. A shared pool holds connections open permanently so they're ready to reuse. Without `idleTimeoutMillis`, if traffic drops off the pool holds open 10 connections to PostgreSQL forever, wasting resources on both sides. 30 seconds means: close a connection that hasn't been used in 30 seconds. Long enough to survive a brief quiet period without killing connections you're about to need, short enough not to hold resources indefinitely.

**Why are we running SQL directly in psql instead of using a migration?**

In a real production codebase you'd never run `CREATE INDEX` directly against the database. You'd write it as a migration — a versioned SQL file (e.g. `0003_add_idx_posts_created_at.sql`) committed to the repo and applied automatically by a migration tool like Flyway or Liquibase. That way the change is tracked, reproducible, and applied consistently across every environment. This scenario skips migrations because they add tooling and setup complexity that would distract from the actual lesson — indexes. The raw psql approach gets you to the same outcome faster in a learning context.

**What is `EXPLAIN ANALYZE` and why does it matter?**

`EXPLAIN ANALYZE` is a command you put in front of any SQL query to get a report on exactly how PostgreSQL executed it. `EXPLAIN` alone tells you the _plan_ — what PostgreSQL intends to do. `ANALYZE` actually runs the query and tells you what it _did do_, including real timing. Together they show you two things:

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

---

## Answer Key

Use this after you've written your own answers. Don't skip to this first — the value is in thinking it through yourself before checking.

---

**Q1: What does `getDbConnection()` do? When does it get called?**

`getDbConnection()` creates a brand new PostgreSQL connection pool and returns it. It gets called at the start of every route handler — every time a request hits `/feed`, `/posts`, or `/users/:id/posts`. That means every single HTTP request creates its own pool from scratch, uses it once, and closes it.

---

**Q2: What happens to query speed as the table grows?**

`db/schema.sql` defines no index on `created_at`. Without one, PostgreSQL reads every row in the table on every `/feed` request to find and sort the results. With 10,000 rows it's slow but survivable. With 1,000,000 rows it reads a million rows to return 20 — query time grows linearly with the table, and eventually the app becomes unusable.

---

**Q3: What do you think will happen when 100 users hit the server at the same time?**

Most requests will fail. Each of the 100 users triggers a new pool with `max: 1` and a 150ms timeout. All 100 try to open a connection to PostgreSQL simultaneously. Most of them can't get one within 150ms and return an error immediately. The server can't keep up.

---

**Q4: Your results show most requests failed. Explain exactly why, per request.**

Each of the 100 concurrent requests calls `getDbConnection()` and creates its own independent pool — none of them share connections. All 100 pools compete to open a connection to PostgreSQL at the same time. Each pool only allows 1 connection and gives up after 150ms. The requests that don't get a connection within that window fail immediately with a timeout error. The database is barely touched — the failure happens before queries even run.

---

**Q5: Which option fixes the root cause? Which treat the symptom?**

Option A fixes the root cause. The problem is that creating a new pool per request is wasteful and unsustainable — a shared pool eliminates this entirely.

Option B treats the symptom. Raising `max` to 100 still creates a new pool per request. This creates 100 connections per request which is wasteful and will exhaust the database's connection limit fast. 100 pools × 100 connections = 10,000 connection attempts against a database that allows 100. You've made it worse.

Option C treats a different symptom. Rate limiting stops some requests from failing, but the underlying connection inefficiency is still there. You're hiding the problem, not fixing it.

---

**Q6: Why would sorting without an index be slow? What about at 1,000,000 rows?**

Without an index, the database does a sequential scan — it reads every row in the table to find and sort the results. At 10,000 rows it reads 10,000 rows just to return 20. At 1,000,000 rows it reads all 1,000,000 rows to return 20. The work grows linearly with the table size. An index gives the database a pre-sorted shortcut so it can jump directly to the rows it needs.

---

**Q7: Which option makes the most sense now? What changes at higher scale?**

Option B — the index — makes the most sense here. The table is read far more than it's written to, so the cost of maintaining an index on inserts is negligible compared to the read benefit.

At 10 million rows and 10,000 writes per second, the answer changes. That write volume means every INSERT updates the index — the overhead becomes meaningful. At that scale Option A (caching) reduces database reads dramatically, and Option C (cursor-based pagination) avoids the full sort entirely. The right answer depends on the actual numbers.

---

**Q8: If traffic grew to 10x overnight, what would you do first?**

Add more servers and put a load balancer in front of them. This is horizontal scaling — instead of making one machine bigger, you run multiple copies of the app and distribute traffic across them. Because the app is stateless (no user session data stored in server memory), this is straightforward. This is exactly what Scenario 4 covers.

---

**Q9: How would you deploy a new version without any downtime?**

Start a second instance running the new code, switch the load balancer to send traffic to it, then shut down the old instance. This is called a blue-green deployment. With only one server right now you can't do this — any restart means a brief outage, even if nodemon makes it fast. Having more than one server is what makes zero-downtime deployments possible. Another reason horizontal scaling matters.

---

_Next: Scenario 2 — Indexes and Slow Queries →_
