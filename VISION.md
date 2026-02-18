# SysDesign Platform — Vision & Roadmap

## What We're Building

A hands-on system design learning platform for entry-level software engineers.

The gap we're filling: every existing resource (ByteByteGo, Educative, Grokking) is theoretical — videos, diagrams, articles. Nobody has built the thing where you get a real running codebase, it has a problem, and you have to fix it while learning why.

The experience: a learner opens a URL, gets a browser-based IDE (via GitHub Codespaces), and is dropped into a broken system. They diagnose what's wrong, fix it, and watch the metrics change in real time. No local setup. No abstract diagrams. Just real code, real problems, real feedback.

---

## The Learner

Entry-level software engineer at their first job. Many will have come from a 3-4 month coding bootcamp. They can read JavaScript, run terminal commands, and build basic CRUD apps. They have never thought about what happens when 100 people hit an endpoint simultaneously.

Goal: get them to mid-level.

---

## The Curriculum

Ordered from first concept to mid-level readiness. Each scenario only uses concepts introduced in previous ones. The separation between scenarios is intentional — there is no guarantee a bootcamp covered any of these topics, so each one gets its own focused treatment.

### Crawling — understand how one server works and why it breaks
1. ✅ Single server + database (BUILT)
2. Indexes and slow queries
3. Connection pooling
4. Horizontal scaling — what breaks when you add a second server

### Walking — learn to scale a single system
5. Caching with Redis
6. Load balancing + stateless servers
7. Database replication and read replicas

### Running — learn to split and decouple
8. Message queues and async communication
9. Pub/Sub and fan-out
10. API design and rate limiting

### Sprinting — apply everything to real systems
11. URL shortener
12. Notification system
13. News feed / timeline
14. Chat system

---

## How Each Scenario Works

Every scenario follows the same structure:

1. **The codebase** — a real Node.js app, intentionally broken or naive
2. **The load test** — makes the problem visible immediately (autocannon, 100 concurrent users)
3. **The dashboard** — live Grafana metrics so the learner sees what's happening
4. **SCENARIO.md** — the guided exercise: read the code, diagnose, fix, reflect
5. **server.fixed.js** — the solution with detailed comments, revealed after they try

Success is always measurable — success rate, latency, req/sec. The learner sees a before and after that's impossible to argue with.

SCENARIO.md is written for a bootcamp grad specifically:
- Plain English explanations of each concept before they need it
- Before/after code blocks so fixes are unambiguous
- Hints before they resort to server.fixed.js
- A stuck table at the bottom for common failure points

---

## Tech Stack

- **Runtime:** GitHub Codespaces (browser-based VS Code, no local setup)
- **App:** Node.js + Express
- **Database:** PostgreSQL
- **Metrics:** Prometheus + Grafana
- **Load testing:** autocannon
- **Containers:** Docker Compose

---

## Current Status

- Scenario 1 is built and live in Codespaces
- Testing with real learners is the immediate next step
- Scenario 2 (indexes and slow queries) is next to build after learner feedback
- Web interface comes after 2-3 scenarios are validated

---

## The Sequence

1. Test Scenario 1 with real learners
2. Build Scenario 2 based on feedback
3. After 2-3 solid scenarios, build the web interface
4. The web interface adds: proper exercise panel, progress tracking, signup flow, controlled reveal of solutions

---

## The Main Thing

The main thing is the learning experience — not the platform, not the business model.

A learner who goes through all 14 scenarios has felt every major system design concept break in real code and fixed it themselves. That's what gets them to mid-level. Everything else is in service of that.

---

## How to Use This File

Paste this at the start of any new conversation when continuing to build this platform. It gives Claude the full context needed to pick up exactly where we left off.
