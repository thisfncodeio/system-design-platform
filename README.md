# System Design — Hands-On Learning Platform

Learn system design by doing, not watching.

Each scenario drops you into a real broken codebase. You diagnose what's wrong, fix it, and watch the metrics change in real time. No local setup. No abstract diagrams. Just real code, real problems, real feedback.

**Who this is for:** Entry-level engineers who want to reach mid-level. If you've built CRUD apps but never thought about what happens when 100 people use it at once — start here.

---

## The Curriculum

Work through these in order, or jump to the concept you need.

### 🐛 Crawling — Understand how one server works and why it breaks

| # | Scenario | Concepts | Status |
|---|----------|----------|--------|
| 1 | [The Single Server Problem](./scenario-01-single-server) | Connection Pooling · Indexes · Single Points of Failure | ✅ Ready |
| 2 | [Indexes and Slow Queries](./scenario-02-indexes) | Query Planning · Cardinality · EXPLAIN ANALYZE · Composite Indexes | ✅ Ready |
| 3 | Connection Pooling | Pool sizing · Timeouts · Connection limits | 🔜 Coming soon |
| 4 | Horizontal Scaling | Stateless servers · Shared state · What breaks when you add a second server | 🔜 Coming soon |

### 🚶 Walking — Learn to scale a single system

| # | Scenario | Concepts | Status |
|---|----------|----------|--------|
| 5 | Caching with Redis | Cache-aside · TTL · Eviction · Cache invalidation | 🔜 Coming soon |
| 6 | Load Balancing | Algorithms · Health checks · Sticky sessions | 🔜 Coming soon |
| 7 | Database Replication | Primary/replica · Read replicas · Replication lag | 🔜 Coming soon |

### 🏃 Running — Learn to split and decouple

| # | Scenario | Concepts | Status |
|---|----------|----------|--------|
| 8 | Message Queues | Async communication · Producers/consumers · Retries | 🔜 Coming soon |
| 9 | Pub/Sub and Fan-out | Topics · Subscribers · Fan-out patterns | 🔜 Coming soon |
| 10 | API Design and Rate Limiting | REST · Idempotency · Token bucket · Sliding window | 🔜 Coming soon |

### 🏎️ Sprinting — Apply everything to real systems

| # | Scenario | Concepts | Status |
|---|----------|----------|--------|
| 11 | URL Shortener | Hashing · Redirects · Caching · Scale | 🔜 Coming soon |
| 12 | Notification System | Queues · Retries · Fan-out · Multiple channels | 🔜 Coming soon |
| 13 | News Feed / Timeline | Fan-out on write vs read · The core tradeoff | 🔜 Coming soon |
| 14 | Chat System | WebSockets · Message ordering · Presence | 🔜 Coming soon |

---

## How to Open a Scenario

Each scenario runs in your browser using GitHub Codespaces — no installs required.

1. Click the scenario link in the table above
2. Click the green **Code** button
3. Select **Codespaces** → **Create codespace on main**
4. Wait ~2 minutes for the environment to build
5. Follow the **SCENARIO.md** file that opens automatically

---

## How Each Scenario Works

Every scenario follows the same structure:

- **A real codebase** — Node.js app with an intentional problem
- **A load test** — makes the problem visible immediately
- **A live dashboard** — Grafana metrics so you see what's happening
- **SCENARIO.md** — guided walkthrough: read, diagnose, fix, reflect
- **A solution file** — with detailed comments, revealed after you try

---

## FAQ

**Do I need to do them in order?**
The crawling scenarios (1-4) build on each other and are best done in order. From Scenario 5 onwards each scenario includes a recap of what it depends on, so you can jump in anywhere.

**What do I need to know before starting?**
Basic JavaScript and some experience with Node.js or a similar backend. You don't need to know anything about system design — that's what this is for.

**How long does each scenario take?**
About 45 minutes if you work through it properly. Rushing through without answering the questions defeats the purpose.

**What language are the codebases in?**
Node.js / JavaScript. The system design concepts apply to any language — the code is just the vehicle.
