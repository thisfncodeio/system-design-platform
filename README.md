# System Design — Hands-On Learning Platform

Learn system design by doing, not watching.

Each scenario drops you into a real broken codebase. You diagnose what's wrong, fix it, and watch the metrics change in real time. No local setup. No abstract diagrams. Just real code, real problems, real feedback.

Everything you do here is exactly what engineers do in production — the same tools, the same diagnostic process, the same fixes.

**Track 1:** Entry-level to mid-level — if you've built CRUD apps but never thought about what happens when 100 people use it at once, start here.  
**Track 2:** Mid-level to senior — if you know the building blocks but struggle to design systems from scratch, reason about failure modes, or make tradeoff decisions under ambiguity, this is your track.

---

## How to Open a Scenario

Each scenario runs in your browser using GitHub Codespaces — no installs required.

1. Click the green **Code** button at the top of this page
1. Select the **Codespaces** tab
1. Click the 3 dots and select **Codespace repository configuration**
1. Click **New with options...**
1. On the next page, a dropdown will appear asking **Dev container configuration** — pick the scenario you want to start (e.g. "Scenario 1 — Diagnosing Failures")
1. Click **Create codespace**
1. Wait ~2 minutes for the environment to build — the database seeds itself automatically
1. When VS Code opens, **SCENARIO.md** will be open and ready to read

> **First time?** Start with Scenario 1. The environment sets itself up automatically — database seeded, app running, metrics dashboard ready.

---

## Track 1 — Entry to Mid

Work through these in order, or jump to the concept you need. Scenarios 1–4 build on each other. From Scenario 5 onwards each includes a recap so you can jump in anywhere.

### 🐛 Crawling — Understand how one server works and why it breaks

| #   | Scenario                                                             | Concepts                                                           | Status   |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| 1   | [Diagnosing Failures](./scenario-01-diagnosing-failures)             | Connection Pooling · Database Indexes                              | ✅ Ready |
| 2   | [Indexes and Slow Queries](./scenario-02-indexes)                    | Query Planning · Cardinality · EXPLAIN ANALYZE · Composite Indexes | ✅ Ready |
| 3   | [Connection Pooling](./scenario-03-connection-pooling)               | Pool sizing · Timeouts · PostgreSQL connection ceiling             | ✅ Ready |
| 4   | [Horizontal Scaling](./scenario-04-horizontal-scaling)               | CPU ceiling · Load balancing · nginx · Connection budget split     | ✅ Ready |

### 🚶 Walking — Learn to scale a single system

| #   | Scenario                            | Concepts                                                         | Status         |
| --- | ----------------------------------- | ---------------------------------------------------------------- | -------------- |
| 5   | Caching with Redis                  | Cache-aside · TTL · Eviction · Cache invalidation                | 🔜 Coming soon |
| 6   | Stateless Servers and Load Balancing | Stateless design · Load balancing algorithms · DNS · CDN         | 🔜 Coming soon |
| 7   | Observability and Diagnostic Thinking | Structured logging · Request IDs · Building your own diagnosis  | 🔜 Coming soon |
| 8   | Database Replication and Read Replicas | Primary/replica · Read replicas · Replication lag             | 🔜 Coming soon |

### 🏃 Running — Learn to split and decouple

| #   | Scenario                                          | Concepts                                                     | Status         |
| --- | ------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| 9   | Message Queues and Async Processing               | Async communication · Producers/consumers · Backpressure     | 🔜 Coming soon |
| 10  | Pub/Sub and Fan-out                                | Topics · Subscribers · Fan-out patterns                      | 🔜 Coming soon |
| 11  | API Design, Rate Limiting, and Graceful Degradation | REST · Idempotency · Token bucket · Graceful degradation    | 🔜 Coming soon |

### 🏎️ Sprinting — Apply everything to real systems

#### Core Path

| #   | Scenario                    | Concepts                                                    | Status         |
| --- | --------------------------- | ----------------------------------------------------------- | -------------- |
| 12  | URL Shortener               | Hashing · Redirects · Caching · Scale                       | 🔜 Coming soon |
| 13  | Booking / Reservation System | Concurrency · Correctness · Transactions · SELECT FOR UPDATE | 🔜 Coming soon |
| 14  | Chat System                 | WebSockets · Message ordering · Presence · Full integration | 🔜 Coming soon |

#### Bonus Challenges

| Scenario             | Concepts                                       | Status         |
| -------------------- | ---------------------------------------------- | -------------- |
| Notification System  | Queues · Retries · Fan-out · Multiple channels | 🔜 Coming soon |
| News Feed / Timeline | Fan-out on write vs read · The core tradeoff   | 🔜 Coming soon |

---

## Track 2 — Mid to Senior

Track 2 begins where Track 1 ends. The Crawling and Walking scenarios follow the same broken codebase format — but the systems are distributed and the failures are harder to reason about. The Sprinting scenarios are open-ended design challenges: no single right answer, evaluated on the quality of your reasoning and tradeoff decisions.

### 🐛 Crawling — Distributed systems fundamentals

| #   | Scenario                         | Concepts                                                             | Status         |
| --- | -------------------------------- | -------------------------------------------------------------------- | -------------- |
| 1   | Why Distributed Systems Are Hard | Partial failures · Network unreliability · No shared clock           | 🔜 Coming soon |
| 2   | CAP Theorem in Practice          | Consistency vs availability · Feeling the tradeoff through real code | 🔜 Coming soon |
| 3   | Eventual Consistency             | Node disagreement · Reconciliation · Conflict resolution             | 🔜 Coming soon |

### 🚶 Walking — Scaling patterns that hurt

| #   | Scenario             | Concepts                                                                | Status         |
| --- | -------------------- | ----------------------------------------------------------------------- | -------------- |
| 4   | Database Sharding    | What it solves · What it breaks · Picking a shard key                   | 🔜 Coming soon |
| 5   | Consistent Hashing   | Why naive sharding breaks · Virtual nodes · Minimal redistribution      | 🔜 Coming soon |
| 6   | Replication Lag and Its Consequences | When lag causes real bugs · How to design around it           | 🔜 Coming soon |
| 7   | Distributed Tracing  | Cross-service tracing · Correlation IDs · Span trees · Causality       | 🔜 Coming soon |
| 8   | Distributed Caching  | Cache coherence · Stampede · Thundering herd · Invalidation at scale   | 🔜 Coming soon |

### 🏃 Running — Resilience and failure design

| #   | Scenario                     | Concepts                                                               | Status         |
| --- | ---------------------------- | ---------------------------------------------------------------------- | -------------- |
| 9   | Circuit Breakers and Retries | Designing for failure · Exponential backoff · Bulkheads                | 🔜 Coming soon |
| 10  | Idempotency                  | Why it matters · What breaks without it · Implementation patterns      | 🔜 Coming soon |
| 11  | Distributed Transactions     | Two-phase commit · Saga pattern · Why this is hard                     | 🔜 Coming soon |
| 12  | Rate Limiting at Scale       | Distributed rate limiting · Token bucket · Sliding window across nodes | 🔜 Coming soon |

### 🏎️ Sprinting — Architecture design problems

| #   | Scenario                 | Concepts                                                            | Status         |
| --- | ------------------------ | ------------------------------------------------------------------- | -------------- |
| 13  | Design Under Ambiguous Requirements | Vague requirements · Defensible decisions · Communicating tradeoffs | 🔜 Coming soon |
| 14  | Spot What's Wrong        | Reading someone else's architecture · Identifying failure modes     | 🔜 Coming soon |
| 15  | Scale an Existing System | 10x load · What changes first · Order of operations                 | 🔜 Coming soon |
| 16  | Cost vs Performance Tradeoffs | Budget constraints · Where to cut · What you sacrifice         | 🔜 Coming soon |

---

## How Each Scenario Works

Every scenario follows the same structure:

- **A real codebase** — Node.js app with an intentional problem
- **A load test** — makes the problem visible immediately
- **A live dashboard** — Grafana metrics so you see what's happening in real time
- **SCENARIO.md** — guided walkthrough: read, diagnose, fix, reflect
- **A solution file** — with detailed comments, revealed after you try

---

## FAQ

**Do I need to do them in order?**
For Track 1, Scenarios 1–4 build on each other and are best done in order. From Scenario 5 onwards each includes a recap so you can jump in anywhere. For Track 2, the same applies — Crawling and Walking build sequentially, Sprinting scenarios are largely standalone.

**What do I need to know before starting Track 1?**
Basic JavaScript and some experience building a backend — Node.js, Express, or similar. You don't need to know anything about system design. That's what this is for.

**What do I need to know before starting Track 2?**
Complete Track 1 first, or have equivalent experience. You should be comfortable with indexes, caching, load balancing, and message queues before starting Track 2.

**How long does each scenario take?**
About 45 minutes if you work through it properly. Rushing through without answering the questions defeats the purpose.

**What language are the codebases in?**
Node.js / JavaScript. The system design concepts apply to any language — the code is just the vehicle.

**Is this interview prep?**
Not primarily. This is the actual job — the same tools, diagnostic process, and fixes engineers use in production. If you understand the material deeply enough to do the work, you'll be able to talk about it in an interview too. But that's a side effect, not the goal.
