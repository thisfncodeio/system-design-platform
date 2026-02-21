# System Design: Scenario 3 — Connection Pooling

A hands-on system design exercise for entry-level engineers.

You'll be dropped into a broken job queue backend, diagnose why it falls apart under load, and fix the pool configuration — then discover why setting it too high causes a different problem entirely.

**Concepts:** Pool Sizing · Connection Timeouts · PostgreSQL Connection Limits  
**Level:** Entry  
**Time:** ~45 minutes  
**Recommended:** Complete Scenarios 1 and 2 first

---

## How to Get Started (Step by Step)

### Step 1 — You need a GitHub account

If you don't have one, sign up free at [github.com](https://github.com). It takes 2 minutes.

### Step 2 — Open this repo on GitHub

Make sure you're on the main page of this repository at github.com.

### Step 3 — Create a Codespace

1. Click the green **Code** button near the top right of the page
2. Click the **Codespaces** tab in the dropdown that appears
3. Click **New codespace**
4. Under **Dev container configuration**, select **Scenario 3 — Connection Pooling**
5. Click **Create codespace**

It will show a loading screen for about 2 minutes while it builds your environment. This is normal.

### Step 4 — Wait for it to finish

When it's done you'll see VS Code open in your browser with a terminal at the bottom and your files on the left.

### Step 5 — Start the scenario

Read **SCENARIO.md** from the top. Everything you need to do is in there.

---

## What is a Codespace?

A Codespace is VS Code running in your browser with a full development environment behind it — the app, the database, Prometheus, Grafana, everything. You don't need to install Node, Docker, or anything else. It all runs in the cloud.

When you're done, close the browser tab. Your Codespace will pause automatically. You can return to it any time from [github.com/codespaces](https://github.com/codespaces).

---

## What You'll Do

- Read a real Node.js job queue backend and understand the pool configuration
- Run a load test and watch requests fail in real time
- Diagnose why a pool of 3 connections fails under 50 concurrent requests
- Fix the configuration and verify the improvement in Grafana
- Discover what happens when you set `max` too high — and why PostgreSQL has a say in this

---

## Files in This Project

```
src/server.js              ← The broken backend. You'll work in here.
solution/server.fixed.js   ← The solution. Don't peek until you've tried.
SCENARIO.md                ← Your guided walkthrough. Start here.
db/schema.sql              ← Database schema
db/seed.sql                ← Test data
scripts/wait-and-seed.js   ← Seeds the database on startup
scripts/loadtest.js        ← The load test (run with npm run loadtest)
dashboard/                 ← Grafana and Prometheus config
```

---

## Something Not Working?

| Problem                           | What to do                                                              |
| --------------------------------- | ----------------------------------------------------------------------- |
| Codespace taking too long to load | Wait up to 5 minutes — it's building the environment for the first time |
| Don't see SCENARIO.md open        | Click on SCENARIO.md in the file explorer on the left                   |
| Terminal not visible              | Press Ctrl+` or go to Terminal → New Terminal in the top menu           |
| Port 3002 (Grafana) not opening   | Wait 30 seconds and try again — it starts up slower than the app        |
| Database not ready                | Run `npm run status` to check if the database is connected and seeded   |
