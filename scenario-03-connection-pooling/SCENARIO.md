# Scenario 3: Connection Pooling

**Difficulty:** Entry Level  
**Concepts:** Pool Sizing, Connection Timeouts, PostgreSQL Connection Limits  
**Time:** ~45 minutes  
**Recommended:** Complete Scenarios 1 and 2 first, or read the recap below

---

## Quick Recap — Connection Pools

If you did Scenario 1 you've seen this before. Here's what you need:

A database connection takes ~50ms to open. A connection pool keeps a set of connections open and ready to reuse. Instead of opening a new connection on every request, the server checks one out from the pool, uses it, and returns it when done.

Three numbers control how a pool behaves:

- **`max`** — the maximum number of connections the pool will open. If all connections are busy, new requests wait in a queue.
- **`connectionTimeoutMillis`** — how long a request will wait in that queue before giving up and returning an error.
- **`idleTimeoutMillis`** — how long an unused connection stays open before the pool closes it to free resources.

Getting these numbers right matters more than you might expect. Too low and your server falls apart under load. Too high and you run into a limit on the database side that's easy to miss entirely.

![Pool Sizing Diagram](assets/diagram-pool-sizing.svg)

---

## The Situation

You've joined a startup that runs a job queue service. Other services submit jobs — resize this image, send this email, generate this report — and workers pick them up and process them.

Last week the team deployed to production. Everything looked fine. This week usage picked up and the on-call engineer is getting paged. Workers are failing to claim jobs. The job submission endpoint is timing out. The stats dashboard is returning errors.

Your tech lead sends you a message:

> *"The job queue is falling over. Workers can't claim jobs. Submissions are timing out. Can you look at the pool config? I think that's where it is."*

Your job is to confirm the diagnosis, understand exactly what's wrong, and fix it.

![Architecture Diagram](assets/diagram-architecture.svg)

---

## Your Environment

Everything is already running.

| Service | Where | What it is |
|---------|-------|------------|
| Job Queue API | Port 3000 | The app you're investigating |
| Grafana Dashboard | Port 3002 | Live metrics — watch this during load tests |
| Prometheus | Port 9090 | Collects metrics from the app |

The server runs under **nodemon** — a standard Node.js dev tool that watches your source files and automatically restarts the server when you save a change. You'll see this in action when you fix the pool configuration in Step 3.

Open a terminal with **Ctrl+`**

To open Grafana: click the **Ports** tab at the bottom of VS Code, find Port 3002, click the globe 🌐 icon. Login: admin / admin. Navigate to Dashboards → Scenario 3 — Connection Pooling.

---

## Step 1 — Read the Code

Open `src/server.js`. Read the whole file, but pay particular attention to the pool configuration near the top.

Answer these questions before moving on:

**Q1: Look at the pool configuration. What are the values for `max`, `connectionTimeoutMillis`, and `idleTimeoutMillis`? In plain terms, what does each one control?**

```
max:
connectionTimeoutMillis:
idleTimeoutMillis:


```

**Q2: The load test sends 50 concurrent requests. The pool has `max: 3`. What do you think happens to the other 47 requests while those 3 connections are in use?**

```
Your answer:


```

**Q3: `connectionTimeoutMillis` is set to 200. A single database query on this system takes roughly 10-50ms. If 47 requests are waiting in the queue and each one takes 30ms to serve, will a request that joins the back of the queue get served within 200ms? Work it out.**

```
Your answer:


```

---

## Step 2 — Run the Load Test

Open Grafana before you run the load test — you want to watch it live.

```bash
npm run loadtest
```

This sends 50 concurrent users hitting three endpoints simultaneously — submitting jobs, claiming jobs, and fetching stats — for 30 seconds.

**While it runs:** watch the Error Rate panel in Grafana. You should see 5xx errors spike almost immediately. Watch the p99 Latency panel too — requests that do succeed are taking much longer than they should.

**After it finishes**, record what you saw:

| Metric | Value |
|--------|-------|
| Success rate | |
| Failed requests | |
| p99 latency | |
| Errors per second (peak) | |

**Q4: The error message from failed requests is "Failed to submit job" or "Failed to claim job." Based on what you know about the pool config, what is the actual root cause of these errors?**

```
Your answer:


```

---

## Step 3 — Fix It

Two problems, worked through in sequence. Fix 1 changes code — save the file, nodemon restarts automatically, then run the load test to see the impact. Fix 2 is a conceptual exercise using psql — no code change, no restart, but it answers a question you'll hit in production.

---

### Fix 1: Pool too small, timeout too aggressive

**The problem:** 3 connections for 50 concurrent requests means 47 requests are always waiting. With a 200ms timeout, most of them give up before a connection frees up.

**Before you change anything — consider your options:**

> **Option A — Increase `max` and `connectionTimeoutMillis`.** More connections, more patience. Requests that would have timed out now wait long enough to get served.
>
> **Option B — Rate limit incoming requests.** Throttle how many requests the server accepts at once so the pool is never overwhelmed.
>
> **Option C — Add more app servers.** Spread the load across multiple servers, each with their own pool.

**Q: Which option fixes the root cause right now with the least complexity? What would change your answer if this service was handling 10,000 requests per second?**

```
Your answer:


```

**The fix:** Option A for now. The pool is simply misconfigured for the actual traffic. Options B and C are valid at higher scale but add complexity that isn't warranted before fixing the obvious problem first.

Open `src/server.js` and update the pool configuration:

```javascript
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jobqueue',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
```

Save the file. nodemon is running as the dev server — it detects the change and restarts automatically within a couple of seconds. Watch the terminal output for the restart confirmation.

Run the load test again and watch Grafana:

```bash
npm run loadtest
```

Record your results:

| Metric | Before | After Fix 1 |
|--------|--------|-------------|
| Success rate | | |
| p99 latency | | |
| Errors per second | | |

The error rate should have dropped significantly. But there's a second problem worth understanding — one you'd hit if you'd gone too far in the other direction.

---

### Fix 2: Understanding the database ceiling

**The situation:** The fix worked. Success rate is much better. Now a new engineer on your team asks: *"Why not just set `max` to 500? Then we'd never run out."*

Before you answer, check what PostgreSQL's connection limit actually is:

```bash
psql postgresql://postgres:postgres@postgres:5432/jobqueue
```

```sql
SHOW max_connections;
```

```sql
SELECT count(*) FROM pg_stat_activity;
```

The first query shows PostgreSQL's hard limit. The second shows how many connections are currently open.

**Q5: What is PostgreSQL's `max_connections` value? How many connections does your app currently have open? What would happen if you set `max: 500` and had multiple app servers each trying to hold 500 connections?**

```
Your answer:


```

**The mental model:**

PostgreSQL has a fixed ceiling on the total number of connections it will accept — by default, 100. Every connection across every application server counts toward that ceiling. If you set `max` too high on one server, you exhaust the database's connection budget for everything else — other services, admin tools, migrations, monitoring.

![PostgreSQL Connection Ceiling](assets/diagram-db-ceiling.svg)

The rule of thumb: `max` per server should be `(max_connections - reserved_connections) / number_of_app_servers`. For a single app server with PostgreSQL's default of 100 connections and 10 reserved for admin use, `max: 90` is the practical ceiling. In production you'd usually stay well below this to leave headroom.

**Q6: Your pool is currently set to `max: 10`. PostgreSQL's limit is 100. You have one app server. Is `max: 10` too conservative? What factors would you consider when deciding the right number?**

```
Your answer:


```

> 💡 There's no universally correct answer to pool sizing. It depends on query duration, traffic patterns, number of app servers, and PostgreSQL's max_connections. The important thing is knowing that both limits exist and that they interact.

Type `\q` to exit.

---

## Step 4 — Compare Your Results

Run the load test one final time:

```bash
npm run loadtest
```

| Run | Success Rate | p99 Latency | Errors/sec |
|-----|-------------|-------------|-----------|
| Broken (Step 2) | | | |
| After Fix 1 (pool resized) | | | |

---

## Step 5 — Reflect

**Q7: In your own words — what is `connectionTimeoutMillis` protecting against? What happens if it's too low? What happens if it's too high?**

```
Your answer:


```

**Q8: You have a pool of 10 connections and your average query takes 20ms. Roughly how many requests per second can this pool serve? Show your reasoning.**

```
Your answer:


```

**Q9: This app runs on one server. In the next scenario you'll add a second server. Both servers will share the same PostgreSQL database. What does that mean for the pool configuration on each server?**

```
Your answer:


```

That last question is exactly what Scenario 4 is about.

---

## What You Learned

**Pool size has to match your traffic.** Too small and requests queue up and time out. The fix isn't complicated — but you have to know the number matters.

**`connectionTimeoutMillis` is not a performance setting.** It's a failure boundary. Set it too low and healthy requests fail because they couldn't wait long enough. Set it too high and a broken database will keep your requests hanging indefinitely instead of failing fast.

**PostgreSQL has a connection ceiling.** Every open connection across every app server counts toward `max_connections`. Setting `max` too high on the application side exhausts the database's connection budget. Pool sizing is a two-sided constraint — bounded below by your traffic and above by the database.

**The right pool size depends on context.** Query duration, traffic volume, number of app servers, PostgreSQL's `max_connections`. There's no single right answer — but there is a right way to reason about it.

---

## Stuck?

| Problem | What to do |
|---------|------------|
| Load test shows no errors after Fix 1 | Check the terminal — nodemon should have restarted automatically when you saved the file |
| Grafana showing "No data" | Run `npm run loadtest` first — panels only show data when traffic hits the server |
| Grafana panels empty after load test | Change time range to "Last 15 minutes" in the top right |
| psql command not found | Try `which psql` to confirm it's available in the container |
| Not sure what `max_connections` means | Run `SHOW max_connections;` in psql — it shows PostgreSQL's hard limit on total connections |
| Really stuck on the fix | Open `solution/server.fixed.js` — it has the corrected pool config with explanation |

---

*Next: Scenario 4 — Horizontal Scaling →*
