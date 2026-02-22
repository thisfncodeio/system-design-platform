# System Design: Scenario 4 — Horizontal Scaling

A hands-on system design exercise for entry-level engineers.

The server is well-configured. The queries are indexed. The pool is correctly sized. And yet — under enough load, one server hits a ceiling it cannot break through on its own.

The fix isn't tuning. It's more servers.

**Concepts:** Horizontal Scaling · Load Balancing · Connection Budget  
**Level:** Entry (final Crawling scenario)  
**Time:** ~45 minutes  
**Prerequisites:** Scenarios 1–3, or equivalent experience

---

## How to Get Started

### Step 1 — You need a GitHub account

Sign up free at [github.com](https://github.com) if you don't have one.

### Step 2 — Open this repo on GitHub

Make sure you're on the main repository page at github.com.

### Step 3 — Create a Codespace

1. Click the green **Code** button at the top of this page
1. Select the **Codespaces** tab
1. Click the 3 dots and select **Codespace repository configuration**
1. Click **New with options...**
1. On the next page, a dropdown will appear asking **Dev container configuration** — pick the scenario you want to start (e.g. "Scenario 4 — Horizontal Scaling")
1. Click **Create codespace**
1. Wait ~2 minutes for the environment to build — the database seeds itself automatically
1. When VS Code opens, **SCENARIO.md** will be open and ready to read

Wait ~2 minutes for the environment to build. The database seeds 500k rows automatically — this takes about 30–60 seconds after VS Code opens.

### Step 4 — Start

Read **SCENARIO.md** from the top. Everything you need is in there.

---

## What You'll Do

- Run a load test against a correctly-configured single server and find its ceiling
- Understand why tuning can't fix a throughput ceiling
- Add a second app server and an nginx load balancer to docker-compose.yml
- Watch throughput double and latency drop in real time on the Grafana dashboard
- Understand what new problems horizontal scaling introduces

---

## Files in This Project

```
src/server.js                     ← The app — same on both servers
scripts/loadtest.js               ← Load test targeting nginx (port 8080)
db/schema.sql                     ← Database schema (indexed)
db/seed.sql                       ← 5,000 products, 500,000 orders
scripts/wait-and-seed.js          ← Seeds the database on startup
dashboard/                        ← Grafana + Prometheus config
solution/docker-compose.fixed.yml ← Two servers + nginx (don't peek yet)
SCENARIO.md                       ← Your guided walkthrough — start here
```

---

## Something Not Working?

| Problem                         | What to do                                                        |
| ------------------------------- | ----------------------------------------------------------------- |
| Codespace taking too long       | Wait up to 5 minutes — building for the first time                |
| SCENARIO.md not open            | Click it in the file explorer on the left                         |
| Terminal not visible            | Press Ctrl+` or go to Terminal → New Terminal                     |
| Port 3002 (Grafana) not opening | Wait 30 seconds — Grafana starts slower than the app              |
| Confused about nginx            | It's explained in Step 3 of SCENARIO.md before you need to use it |
