# Scenario 1: The Single Server Problem

**Difficulty:** Entry Level  
**Concepts:** Connection Pooling, Database Indexes, Single Points of Failure  
**Time:** ~45 minutes

---

## The Situation

You've just joined a startup as a junior backend engineer.

This is the backend: a simple social post feed. Users can create posts (`POST /posts`), and fetch a feed of the most recent ones (`GET /feed`). The code is clean. It works. The team ships it to production.

A week later, traffic picks up. The app starts timing out. Users are getting errors.

![System Architecture](assets/diagram-architecture.svg)

Your tech lead messages you:

> _"Something's wrong with the feed endpoint. Can you look into it?"_

Your job is to figure out what's breaking and fix it.

---

## Before You Start — Two Concepts to Know

You don't need to be an expert on these yet. Read them once so the exercise makes sense. Keep these in mind as you read the code.

**What is a database index?**
Imagine a textbook with no table of contents. To find a topic you'd have to read every page. A database index is like a table of contents — it lets the database jump straight to the data it needs instead of scanning every row. Without one, queries get slower as the table grows.

Technically, you can put an index on any column. If you're frequently sorting or filtering by a column and the query is slow, check if there's an index on that column. If there isn't, add one and measure the difference. Don't add indexes speculatively on every column — add them in response to actual slow queries.

When an index makes sense:

- Columns you frequently sort by (`ORDER BY created_at`)
- Columns you frequently filter by (`WHERE user_id = ?`)
- Columns used in joins (`JOIN users ON posts.user_id = users.id`)

When an index doesn't make sense:

- Columns that are rarely queried — an index you never use just wastes storage
- Columns with very few distinct values — imagine an index on a `status` column that only has "active" or "inactive." Half the table is "active" so the index saves almost nothing. PostgreSQL might just scan the whole table anyway.
- Tables that are written to **extremely** frequently with very few reads — think logging tables with thousands of inserts per second — every INSERT, UPDATE, or DELETE has to update the index too. Too many indexes on a write-heavy table slows writes down. For most tables that are read more than they're written to, the cost of maintaining an index on writes is negligible. The `posts` table in this scenario gets written to when users create posts, but it's read far more often than it's written to — so the index is worth it.

![Database Index Diagram](assets/diagram-index.svg)

**What is a connection pool?**
Opening a connection to a database takes time — roughly 50ms. A connection pool keeps a set of connections open and ready to reuse, like having a pool of taxis waiting rather than calling a new one from scratch every time. Without pooling, every request to your server has to open its own connection — which breaks down fast under load. With a pool, if all connections are busy, new requests wait their turn in a queue rather than failing immediately — which is far more reliable under load.

![Connection Pool Diagram](assets/diagram-connection-pool.svg)

---

## Your Environment

Everything is already running. You don't need to install anything.

| Service           | Where     | What it is                                  |
| ----------------- | --------- | ------------------------------------------- |
| Feed API          | Port 3000 | The app you're investigating                |
| Grafana Dashboard | Port 3002 | Live metrics — watch this during load tests |
| Prometheus        | Port 9090 | Collects metrics from the app               |

Open a terminal with **Ctrl+`** (or Terminal → New Terminal in the menu).

---

## How to Open Grafana

Grafana is your live metrics dashboard. You'll use it to watch what happens to the system during load tests.

1. Click the **Ports** tab at the bottom of VS Code
2. Find **Port 3002** in the list
3. Click the globe 🌐 icon next to it — this opens Grafana in your browser
4. Login with **admin / admin**
5. In the left sidebar click **Dashboards**
6. Click **Scenario 1 — The Single Server Problem**

You should see four panels: Request Rate, Response Latency, Error Rate, and Memory Usage. They will show "No data" until traffic hits the server — that's normal.

**Using Grafana:**

- The dashboard auto-refreshes every 5 seconds — you don't need to do anything
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

**Q2: The `/feed` endpoint sorts posts by `created_at DESC`. Open `db/schema.sql` and look at the posts table. Do you see an index on `created_at`? What do you think happens to query speed as the posts table grows to millions of rows without one?**

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

**Q4: Look at your results. Most requests failed. Now look at `getDbConnection()` again:**

```javascript
function getDbConnection() {
  return new Pool({
    max: 1, // only 1 connection allowed
    connectionTimeoutMillis: 150, // give up after 150ms
  });
}
```

This function is called on every single request. With 100 requests arriving at the same time, each one tries to create its own pool with `max: 1`. What do you think happens?

```
Your answer:


```

**Q5: The `/feed` route has a 500ms delay added to simulate a slow database query. In production, a missing index on `created_at` would cause something similar. Why would sorting 10,000 rows with no index be slow? What about 1,000,000 rows?**

```
Your answer:


```

**Q6: Right now there is one server and one database. If the server machine crashed, what would happen to the app?**

```
Your answer:


```

---

## Step 3 — Fix It

You've diagnosed the problems. Now fix them. Two changes, in order.

After each fix, restart the server and run the load test again to see the impact in both the terminal output and Grafana.

---

### Fix 1: Connection Pooling

**The problem in plain terms:** Every request creates a brand new pool with only 1 connection allowed and a 150ms timeout. When 100 requests arrive at once, 99 of them can't get a connection in time and fail immediately.

**The fix in plain terms:** Create one shared pool when the server starts, and reuse it for every request. This way connections stay open and ready — requests wait their turn instead of failing.

**Here's the before and after so you know exactly what to change:**

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
});
```

**What to do in `src/server.js`:**

- [ ] Replace the `getDbConnection()` function with the shared `db` pool above (put it near the top of the file, after the imports)
- [ ] In each route, replace `const db = getDbConnection()` with just `db` (it's already defined)
- [ ] Remove all `await db.end()` calls — you don't close a shared pool after each request
- [ ] Remove the `await new Promise(resolve => setTimeout(resolve, 500))` line from the `/feed` route

> 💡 **Stuck?** Check that you moved the Pool to the top level of the file, not inside a function. If you're still stuck after genuinely trying, open `solution/server.fixed.js` to see the complete solution.

Restart the server after saving:

```bash
npm run start
```

Run the load test again and watch Grafana while it runs:

```bash
npm run loadtest
```

What's the success rate now? Record it in the table in Step 4.

---

### Fix 2: Add a Database Index

**The problem in plain terms:** Every time `/feed` is called, PostgreSQL reads every row in the posts table to find the most recent ones. With 10,000 rows this is slow. In production with millions of rows, it would bring the system down.

**The fix in plain terms:** Add an index on `created_at` so PostgreSQL can jump straight to the most recent posts instead of scanning every row.

First, connect to the database:

```bash
psql postgresql://postgres:postgres@postgres:5432/feedapp
```

You're now inside the PostgreSQL shell. Run this to see the execution plan before adding the index:

```sql
EXPLAIN ANALYZE SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
```

Look for `Seq Scan` — that's PostgreSQL reading every row. Now add the index:

```sql
CREATE INDEX idx_posts_created_at ON posts (created_at);
```

Run EXPLAIN ANALYZE again:

```sql
EXPLAIN ANALYZE SELECT * FROM posts ORDER BY created_at DESC LIMIT 20;
```

You should now see `Index Scan` instead of `Seq Scan`. That's the fix working. Type `\q` to exit the PostgreSQL shell.

Run the load test one final time and watch Grafana:

```bash
npm run loadtest
```

Notice what changes in the Response Latency panel compared to the first two runs.

---

## Step 4 — Compare Your Results

Fill this in with your actual numbers:

| Run                   | Success Rate | p99 Latency | Req/sec |
| --------------------- | ------------ | ----------- | ------- |
| Broken (Step 2)       |              |             |         |
| After Fix 1 (pooling) |              |             |         |
| After Fix 2 (index)   |              |             |         |

The difference between the first and last row is what you just learned.

---

## Step 5 — Reflect

The system is dramatically better. But it still has a fundamental limitation.

**Q7: This is still one server and one database. Write down three things that could still go wrong:**

```
1.

2.

3.
```

**Q8: If traffic grew to 10x overnight, what would you do first?**

```
Your answer:


```

**Q9: How would you deploy a new version of the code without any downtime?**

```
Your answer:


```

There are no wrong answers here. These are the exact questions a senior engineer would ask — and they're exactly what the next scenarios address.

---

## What You Learned

**Connection pooling** is not optional in production. Creating a new database connection per request is one of the most common and costly mistakes in early backend code. Every production backend uses a shared pool.

**Indexes** are one of the highest-leverage tools available to a backend engineer. A missing index on a column you sort or filter by will work fine at small scale and silently become a crisis at large scale. Adding one can turn a seconds-long query into a milliseconds-long one.

**Single points of failure** exist in every system. Identifying them is the first step to designing around them. You just identified three.

**Grafana and Prometheus** are the industry standard for observability. You just used the same tools engineers use at companies of every size to diagnose production problems in real time.

You didn't just read about these concepts. You watched them fail in real time and fixed them. That's the difference.

---

## Stuck at Any Point?

| Problem                                      | What to do                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Load test shows no errors after Fix 1        | Make sure you restarted the server: `npm run start`                                             |
| Grafana showing "No data"                    | Make sure you ran `npm run loadtest` first — panels only show data when traffic hits the server |
| Grafana panels are empty after the load test | Change the time range to "Last 15 minutes" in the top right                                     |
| Can't find the dashboard in Grafana          | Click Dashboards in the left sidebar → Scenario 1 — The Single Server Problem                   |
| psql command not found                       | The psql client should be available in the container — try `which psql` to confirm              |
| Still seeing Seq Scan after adding index     | Run `ANALYZE posts;` inside psql and then try EXPLAIN ANALYZE again                             |
| Really stuck on the code fix                 | Open `solution/server.fixed.js` — it has the full solution with comments                        |

---

_Next: Scenario 2 — Indexes and Slow Queries →_
