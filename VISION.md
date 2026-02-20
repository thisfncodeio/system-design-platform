# SysDesign Platform — Vision & Roadmap

## What We're Building

A hands-on system design learning platform that takes software engineers from entry level to senior — through real broken codebases, not diagrams and videos.

The gap we're filling: every existing resource (ByteByteGo, Educative, Grokking) is theoretical — videos, diagrams, articles. Nobody has built the thing where you get a real running codebase, it has a problem, and you have to fix it while learning why. This has been confirmed — no product like this exists anywhere in the market.

The experience: a learner opens a URL, gets a browser-based IDE (via GitHub Codespaces), and is dropped into a broken system. They diagnose what's wrong, fix it, and watch the metrics change in real time. No local setup. No abstract diagrams. Just real code, real problems, real feedback.

Everything in the scenarios — the diagnostic process, the fixes, the tools, the thinking — is exactly what engineers do in production. This isn't interview prep. It's the actual job.

---

## How We Compare to the Market

**Grokking the System Design Interview** — interview prep for engineers who already know the concepts. Teaches you how to talk about system design in 45 minutes in front of an interviewer. Flat collection of classic design problems with no leveling, no hands-on code, no real running systems.

**ByteByteGo** — visual diagrams and explanations. Reading and watching only.

**Arpit Bhayani's masterclass** — the closest thing to hands-on. Live cohort, human instructor, prototyping exercises. Not self-paced, not browser-based, significantly more expensive.

**Us** — complete learning path from zero production knowledge to senior-level systems thinking. Self-paced, browser-based, no setup. Real running systems that break in real ways.

Positioning: **Grokking teaches you how to talk about system design. We teach you how to actually do it.**

---

## Track 1 — Entry to Mid

### The Learner

Entry-level software engineer at their first job. Many will have come from a 3-4 month coding bootcamp. They can read JavaScript, run terminal commands, and build basic CRUD apps. They have never thought about what happens when 100 people hit an endpoint simultaneously.

### What Makes This Jump

Entry to mid is mostly about **knowledge gaps**. The learner doesn't know what connection pooling is, what an index does, what a cache is for. These are learnable, teachable, and demonstrable through hands-on scenarios.

### The Curriculum

Each scenario only uses concepts introduced in previous ones. The separation between scenarios is intentional — there is no guarantee a bootcamp covered any of these topics, so each one gets its own focused treatment. Each scenario can be completed standalone with a brief recap, but the recommended order is:

**Crawling — understand how one server works and why it breaks**

1. ✅ Single server + database (BUILT)
2. ✅ Indexes and slow queries (BUILT)
3. Connection pooling
4. Horizontal scaling — what breaks when you add a second server

**Walking — learn to scale a single system** 5. Caching with Redis 6. Load balancing + stateless servers 7. Database replication and read replicas

**Running — learn to split and decouple** 8. Message queues and async communication 9. Pub/Sub and fan-out 10. API design and rate limiting

**Sprinting — apply everything to real systems** 11. URL shortener 12. Notification system 13. News feed / timeline 14. Chat system

---

## Track 2 — Mid to Senior

### The Learner

A mid-level engineer who knows the building blocks but is stuck. They can implement solutions but struggle to design systems from scratch, reason about failure modes before they happen, or make defensible tradeoff decisions under ambiguity. This is the jump most engineers find hardest and stay stuck at longest — sometimes years.

### What Makes This Jump Different

Mid to senior is mostly about **judgment**, not knowledge. Senior engineers don't know more facts — they know which tradeoffs matter in a given context, can design systems they've never built before by reasoning from first principles, think about failure modes before they happen, and make decisions under ambiguity without needing all the information.

This means the Sprinting scenarios for Track 2 can't be purely code-based. They require open-ended reasoning — designing under ambiguity, defending tradeoffs, critiquing other designs. AI evaluation becomes essential here because there's no single right answer to check against.

### The Curriculum

**Crawling — distributed systems fundamentals**

1. Why distributed systems are hard — partial failures, network unreliability, no shared clock
2. CAP theorem in practice — not the theory, but feeling the tradeoff through a real system
3. Eventual consistency — what it means when two nodes disagree and how systems reconcile

**Walking — scaling patterns** 4. Horizontal scaling done right — stateless services, shared session state, sticky sessions and why they're a trap 5. Database sharding — what it solves, what it breaks, how to pick a shard key 6. Read replicas and replication lag — when replication lag causes real bugs 7. Consistent hashing — why naive sharding breaks when you add or remove nodes

**Running — resilience and failure design** 8. Circuit breakers and retries — designing for failure, not the happy path 9. Idempotency — why it matters and what breaks without it 10. Distributed transactions — two-phase commit, saga pattern, why this is hard 11. Rate limiting at scale — distributed rate limiting across multiple servers

**Sprinting — architecture design problems** 12. Design under ambiguous requirements — given vague requirements, make defensible decisions 13. Spot what's wrong — given someone else's architecture, identify failure modes 14. Scale an existing system — given a system at 10x load, what changes and in what order 15. Cost vs performance tradeoffs — given a budget constraint, where do you cut and what do you sacrifice

---

## How Each Scenario Works (Track 1)

Every scenario follows the same structure:

1. **The codebase** — a real Node.js app, intentionally broken or naive
2. **The load test** — makes the problem visible immediately (autocannon, 100 concurrent users)
3. **The dashboard** — live Grafana metrics so the learner sees what's happening
4. **SCENARIO.md** — the guided exercise: read the code, diagnose, fix, reflect
5. **server.fixed.js** — the solution with detailed comments, revealed after they try

Success is always measurable — success rate, latency, req/sec. The learner sees a before and after that's impossible to argue with.

SCENARIO.md is written for a bootcamp grad specifically:

- Plain English explanations of each concept before they need it
- Diagrams for every concept — simple, friendly, assumption-free
- Before/after code blocks so fixes are unambiguous
- Hints before they resort to server.fixed.js
- A stuck table at the bottom for common failure points

## How Each Scenario Works (Track 2)

Crawling and Walking scenarios follow the same broken codebase format as Track 1 — but the systems are distributed, the failures are harder to reproduce, and the fixes require understanding tradeoffs rather than applying known patterns.

Sprinting scenarios use a different format — open-ended design challenges with a rubric for evaluating reasoning quality, not just output correctness. AI evaluation is used to engage with the learner's reasoning and push back on weak tradeoff decisions.

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

- Track 1, Scenario 1 is built and live in Codespaces
- Track 1, Scenario 2 is built, ready to push to monorepo
- Testing with real learners is the immediate next step
- Web interface comes after 2-3 scenarios are validated with real learners

---

## The Build Sequence

1. Test Scenario 1 with real learners
2. Iterate based on feedback
3. Continue building Track 1 scenarios in order
4. After 2-3 solid scenarios, build the web interface
5. Web interface adds: proper exercise panel, progress tracking, signup flow, controlled reveal of solutions
6. Begin Track 2 after Track 1 is complete and validated

---

## The Main Thing

The main thing is the learning experience — not the platform, not the business model.

A learner who completes Track 1 has felt every major system design concept break in real code and fixed it themselves. That's what gets them to mid-level. A learner who completes Track 2 has reasoned through distributed systems failure modes and made defensible tradeoff decisions under ambiguity. That's what gets them to senior.

Everything else is in service of that.

---

## How to Use This File

Paste this at the start of any new conversation when continuing to build this platform. It gives Claude the full context needed to pick up exactly where we left off.

---

## Decisions Log

A running record of every significant decision made and why. This prevents relitigating the same decisions in future conversations.

**Curriculum order: entry to mid**
Scenarios 2 (indexes) and 3 (connection pooling) are kept as separate scenarios even though Scenario 1 introduces both briefly. Reason: there is no guarantee a bootcamp covered either topic. Each concept deserves its own focused treatment with its own broken system to diagnose.

**Standalone with recommended order**
Each scenario can be completed standalone with a brief recap section at the top. Learners can follow the curriculum front to back or jump to the concept they need. Scenarios 1-4 (crawling) are the exception — they genuinely build on each other and are best done in order.

**Monorepo over one repo per scenario**
All scenarios live in one GitHub repo (sysdesign-platform). Easier to manage, easier to share, easier to maintain. Learners open a Codespace from the repo root and cd into the scenario they want.

**Horizontal scaling added to crawling**
Originally the curriculum went from connection pooling straight to caching. Horizontal scaling was added as Scenario 4 because without it, load balancing in Scenario 6 would feel like a jump. A learner needs to feel what breaks when you add a second server before load balancing makes full sense.

**Separate scenarios for indexes and connection pooling**
Originally considered combining these into one scenario or making them sub-lessons. Decided against it — each concept deserves its own full scenario with its own load test, its own broken system, and its own before/after moment.

**Bootcamp grad as the target learner for Track 1**
The bar for Track 1 is: someone who graduated a 3-4 month coding bootcamp. This is lower than "junior engineer with a CS degree." Every scenario and every diagram is written assuming this learner — plain English, no assumed prior knowledge, before/after code blocks, stuck tables.

**Diagrams for every concept**
Every concept introduced in a SCENARIO.md gets an SVG diagram. Simple, friendly, assumption-free. Diagrams render inline in markdown inside Codespaces. Style: clear before/after contrast, emoji for warmth, no jargon in the visuals.

**Track 2 Sprinting scenarios require a different format**
The Sprinting scenarios for mid to senior (design under ambiguity, spot what's wrong, scale an existing system) cannot be purely code-based. They require open-ended reasoning evaluated on quality of thinking, not right/wrong output. AI evaluation is the right mechanism here. This format will be designed when Track 1 is complete.

**This is not interview prep**
The platform is optimized for genuine understanding — the actual job — not interview performance. Interview readiness is a side effect of deep understanding, not the goal. Positioning: Grokking teaches you how to talk about system design. We teach you how to actually do it.

**No web interface until 2-3 scenarios are validated**
Codespaces handles the runtime for now. Building a web interface before the learning experience is proven would be optimizing the wrapper before the content is right. Web interface adds: proper exercise panel, progress tracking, signup flow, controlled reveal of solutions.

---

## Lessons Learned

_Updated as user testing reveals what works and what doesn't._

None yet — user testing with real learners is the immediate next step.

---

## What We've Tried and Rejected

**Separate repos per scenario**
Considered and rejected. Managing 14+ separate repos is too much overhead. Monorepo with subfolders is cleaner and Codespaces supports it.

**Combining indexes and connection pooling into one scenario**
Scenario 1 introduces both briefly. We considered making Scenarios 2 and 3 go deeper on both together. Rejected — too much in one scenario, and the separation allows each concept to get a full load test and full diagnostic exercise.

**Starting with connection pooling before single server**
Considered putting connection pooling or indexes before the single server scenario since they're more foundational. Rejected — the single server scenario earns its place first because it establishes the mindset (production systems break under load) before going deep on any specific concept. Without that hook, indexes and pooling are abstract.

**Strict prerequisite chain**
Considered requiring learners to complete scenarios in strict order with no jumping allowed. Rejected in favor of standalone with recommended order. Flexibility matters — a working engineer with a specific gap should be able to jump to the relevant scenario without doing all the ones before it.

---

## Current Open Questions

**How to handle the devcontainer per scenario in a monorepo**
Each scenario has its own .devcontainer with auto-seed and auto-open SCENARIO.md. In a monorepo, Codespaces launches from the repo root, not from a subfolder. This means the per-scenario devcontainer magic (auto-seed, auto-open) may not fire automatically. Need to test this and find the right solution — either a root devcontainer that asks which scenario to load, or per-scenario repos linked from the monorepo, or another approach.

**Web interface design**
What does the web interface look like when we're ready to build it? Exercise panel alongside the Codespace, progress tracking, signup flow. This is a future decision — not until 2-3 scenarios are validated with real learners.

**Track 2 Sprinting format**
Open-ended design challenges evaluated by AI. What does the rubric look like? How does the AI push back on weak reasoning? How is progress tracked when there's no right answer? This needs to be designed before Track 2 Sprinting scenarios are built.

**Pricing and business model**
Not yet decided. Not the current focus. The current focus is getting the learning experience right.

---

## Infrastructure Notes

Technical decisions and gotchas discovered during building and testing. Important context for future work.

**Grafana datasource UID must be pinned**
Grafana auto-generates a datasource UID when provisioning. If the UID in the dashboard JSON doesn't match the provisioned datasource UID, all panels show "No data." Fix: set `uid: PBFA97CFB590B2093` explicitly in `grafana-datasource.yml` and use the same UID in `grafana-dashboard.json`. This must be consistent across all scenarios.

**HTTP metrics require custom instrumentation**
`prom-client`'s `collectDefaultMetrics()` only collects Node.js process metrics (memory, CPU, event loop). HTTP-specific metrics (request rate, latency by route, error rate) require a custom Express middleware that tracks each request with `Counter` and `Histogram`. This middleware must be added to every scenario's `server.js`. The metrics endpoint must be exposed at `GET /metrics`.

**Grafana does not auto-open in Codespaces**
`"onAutoForward": "openBrowser"` fires before Grafana finishes starting up, so the browser tab opens to a connection error. Changed to `"onAutoForward": "notify"` for all scenarios. SCENARIO.md instructs learners to open Grafana manually from the Ports tab.

**postStartCommand runs inside the app container**
The `postStartCommand` in devcontainer.json runs inside the Docker container at `/app`, not on the Codespaces host. Commands must use `cd /app &&` prefix to ensure correct working directory. `docker` and `curl` are not available inside the Alpine container — use Node.js for any health checks.

**Devcontainer discovery in monorepo**
GitHub Codespaces discovers devcontainers from `.devcontainer/FOLDER_NAME/devcontainer.json` at the repo root. Each scenario's devcontainer must live at `.devcontainer/scenario-XX-name/devcontainer.json`. The `dockerComposeFile` path is relative to the devcontainer file location — use `../../scenario-XX-name/docker-compose.yml`.

**wait-and-seed.js filename**
The seed script must be named exactly `wait-and-seed.js` — not `wait-and-see.js`. The `postStartCommand` references this filename explicitly. A typo here causes the entire Codespace setup to fail silently.

---

## Scenario Quality Assessment

An honest assessment of where the scenarios stand relative to real production systems. Important for knowing what to improve as the platform matures.

**What is enterprise-level:**

- The tools are real — Prometheus, Grafana, Docker Compose, PostgreSQL, connection pooling with `pg` are exactly what you'd find in a production Node.js backend at any serious company
- The diagnostic workflow is real — load test, observe metrics, form a hypothesis, fix, verify. That's the actual job.
- The concepts are real — connection pooling, index cardinality, composite indexes, EXPLAIN ANALYZE. These are the exact decisions engineers make in production every day.

**What is intentionally simplified:**

- **Scale is small** — 10,000-100,000 rows instead of millions. We simulate slowness with artificial delays rather than letting real data volume create it naturally. This is a concession to running on a laptop. It works for learning but is not what production looks like.
- **Apps are simple** — no authentication, no middleware stack, no multiple services talking to each other, no logging pipelines. Complexity is deliberately removed so it doesn't obscure the lesson being taught.
- **Failure modes are clean** — in production, problems are rarely one obvious broken thing. They're usually several things interacting in non-obvious ways. Our scenarios isolate one problem per scenario deliberately, which is right for learning but different from reality.
- **No CI/CD or deployment** — no staging vs production, no deployment pipelines, no rollback strategies. These are real concerns a working engineer faces but are out of scope for the current curriculum.

**The right tradeoff:**
Simplified in scope and complexity in service of learning. The concepts and tools are enterprise-level. The scenarios are intentionally constrained so the lesson is clear. As scenarios progress toward the Sprinting tier they should get meaningfully more complex — messier codebases, less obvious failure modes, closer to real production scale and ambiguity.

**Target for Sprinting scenarios:**
By the time a learner reaches the Sprinting tier (URL shortener, notification system, news feed, chat), the codebases should feel closer to real production systems — multiple interacting services, realistic data volumes, failure modes that aren't immediately obvious. The simplification scaffolding should be removed progressively as the learner advances.

---

## Scaffolding Reduction Principle

Each tier of the curriculum should feel noticeably less guided than the one before it. The goal is to develop diagnostic instincts, not recipe-following. If every scenario gives learners the problem, the fix, and the command to run, they complete the scenario but don't develop the ability to figure things out on their own.

**Crawling (Scenarios 1-4): High scaffolding**
Tell them what to look for. Give them the before/after code. Give them the commands. Explain the concepts before they need them. The goal is to get the concept to land cleanly on a first exposure. A bootcamp grad who has never seen a production system fail needs this level of guidance or they'll abandon the scenario in frustration before the lesson lands.

**Walking (Scenarios 5-7): Medium scaffolding**
Tell them what the problem category is but not exactly where it is. Give them the diagnostic tools but not the diagnosis. Let them find the problem themselves before showing the fix.

**Running (Scenarios 8-10): Low scaffolding**
Here's a broken system. Here's the symptom. Figure out why and fix it. Concepts are referenced but not explained — the learner should know them by now. Hints exist but are buried, not upfront.

**Sprinting (Scenarios 11-14): No scaffolding**
Here's a system. It's slow, failing, or behaving unexpectedly. No hints. No before/after code. No commands handed to them. This is the job. The learner is expected to bring everything from the previous tiers and apply it independently.

**What this means for Scenarios 1 and 2:**
The current level of hand-holding in Scenarios 1 and 2 is correct for Crawling tier. Nothing needs to change. The scaffolding reduction happens in future scenarios — each tier should be built with progressively less guidance than the one before it.
