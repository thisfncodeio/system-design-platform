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

#### Crawling — understand how one server works and why it breaks

**Goal:** The learner understands how a single server works and why it breaks
**Scaffolding:** High. Tell them what to look for, give them the commands, explain everything before they need it.

1. ✅ **Diagnosing failures** (BUILT) — social feed app

   **Why this is first:** Every other scenario in the curriculum depends on the learner knowing the diagnostic workflow — load test, observe, hypothesize, fix, verify. Without this as the foundation, indexes are "a database feature you should learn," not "the thing that would have saved you when everything caught fire." This scenario earns the learner's attention. It makes them care about what follows. You always teach the why before the what.

   **Why this app:** A social feed is the closest thing to something a bootcamp grad has built. The domain (users, posts, a timeline) is zero cognitive load. All their attention goes to the infrastructure lesson, not the application logic.

2. ✅ **Indexes and slow queries** (BUILT) — e-commerce shop

   **Why second:** The most common performance problem a junior engineer will encounter in their first job is a slow query. "The page takes 8 seconds to load" → "the query is doing a sequential scan on 100,000 rows" → "add an index." This is the highest-leverage optimization knowledge a new engineer can have. One CREATE INDEX statement can turn an 8-second page load into a 50ms page load. That before/after moment is unforgettable.

   **Why after diagnosing failures:** Scenario 1 introduces indexes briefly. Scenario 2 goes deep — EXPLAIN ANALYZE, cardinality, composite indexes. This is the "mention it, then master it" pattern. The learner has seen the concept once in a real context, so when Scenario 2 goes deep, it's not brand new — it's a deeper look at something they've already felt.

   **Why a different app:** Switching from a social feed to e-commerce prevents the learner from thinking "I'm learning how to fix this one app." They see the same concept in a new context, which builds transferable understanding.

3. ✅ **Connection pooling** (BUILT) — job queue API

   **Why third:** After slow queries, the next most common production failure is resource exhaustion — the app runs out of database connections and crashes. This is a different category of problem than Scenario 2. Indexes are about query performance (how fast does the database find data). Pooling is about resource management (how does the app manage its limited connections). The learner needs to understand both, and they need to understand that they're different failure modes.

   **Why after indexes:** The learner now has two diagnostic categories: "is the query slow?" (Scenario 2) and "are we out of connections?" (Scenario 3). This is the beginning of diagnostic instinct — when something breaks, check the query plan AND the connection pool. Real engineers think this way.

   **Why this app:** A job queue is write-heavy with high concurrency. Workers competing for jobs via `SELECT FOR UPDATE SKIP LOCKED` is a real production pattern. It makes pool exhaustion feel earned — you can see why 100 concurrent workers fighting for connections would drain a pool.

4. ✅ **Horizontal scaling** (BUILT) — product catalog API

   **Why fourth:** The learner has now optimized everything they can on a single server — queries are fast (indexes), connections are managed (pooling). This scenario asks: "what if one server simply isn't enough?" That's a fundamentally different question than the first three scenarios. It shifts the learner's mental model from "optimize what you have" to "add more capacity."

   **Why the max_connections bridge from Scenario 3 matters:** Scenario 3 ends with the learner discovering PostgreSQL's max_connections ceiling. They can't just add more connections — the database has a hard limit. The natural question is "what if I add more servers?" Scenario 4 answers that question. This narrative bridge makes the transition feel self-motivated rather than curriculum-driven.

   **Why it belongs in Crawling despite being multi-server:** The stated goal of Crawling is "understand how one server works and why it breaks." Scenario 4 technically introduces a second server. But the lesson is about the single server's ceiling — why one server isn't enough — and the simplest response (add another one). It's the capstone of the "one server" arc, not the beginning of the "many servers" arc. Without it, the jump to load balancing in Walking would feel like a cold start.

**WHY THIS ORDER:** Each scenario addresses a different layer of the stack (query → connection → compute), following a natural diagnostic ladder. The learner builds instinct, not recipes.

#### Walking — learn to scale a single system

**Goal:** The learner can scale a single system using standard building blocks.
**Scaffolding:** Medium. Tell them the problem category but not exactly where it is. Give them diagnostic tools but not the diagnosis.

5. **Caching with Redis** — new app — something read-heavy, maybe a content platform or product listing page

   **Why fifth:** After horizontal scaling, the learner has two servers hitting one database. The database is now the bottleneck. Caching is the highest-leverage response: stop hitting the database for data that doesn't change often. A well-cached system handles 10-100x the traffic of an uncached one. That's a dramatic improvement, and the learner needs to feel it.

   **Why before stateless design:** The VISION's narrative bridge plants a specific question at the end of Scenario 4: "if a user's session lives on app1's memory, what happens when nginx routes to app2?" Redis answers that question — but as ONE use case of a larger tool, not as the only reason to learn it. The primary motivation for caching is performance. Session storage is a bonus application the learner discovers along the way.

   **There's also a pedagogical argument here:** showing the learner Redis as a cache first, then revealing "oh, this also solves your session state problem" is a stronger moment than teaching stateless design first and then introducing Redis as the tool that enables it. The "aha" lands harder when the tool is already familiar and the new application is a surprise.

6. **Stateless servers and load balancing** — extend the caching app to multi-server with proper load balancing

   **Why sixth:** Now that the learner has Redis, they can properly design stateless servers. "Don't store anything in your app server's memory. Sessions go in Redis. Cache goes in Redis. Your app servers are interchangeable." This is an architectural principle, and it only makes sense after the learner has the tool (Redis) that makes it practical.

   Load balancing strategies (round-robin, least connections, health checks) belong here too. Scenario 4 introduced nginx as "put a load balancer in front." This scenario goes deeper: how does the load balancer decide where to send traffic? What happens when a server goes down? What are sticky sessions and why are they a trap?

   **Why after caching:** Stateless design requires an external state store. Redis is that store. Teaching stateless design before the learner has Redis would be abstract — "put your state somewhere else" without knowing where "somewhere else" is.

   **DNS and CDN — completing the request path:** This scenario also fills a gap in the learner's mental model of how traffic reaches their server. Up to this point, the learner's picture of a request is: load balancer → app server → database. The real path is: DNS resolution → (CDN for static assets) → load balancer → app server → database. The front of that chain has been invisible. This scenario introduces DNS ("your domain name resolves to an IP address — here's how") and CDN ("static assets like images, CSS, and JS should be served from a CDN at the network edge, not from your app server") as part of the load balancing and traffic routing discussion. This isn't a deep dive — it's a brief conceptual section that completes the full request lifecycle so the learner understands the entire path from browser to database. A bootcamp grad going to mid-level will encounter CloudFront, Cloudflare, or Route 53 on the job. They should know what those tools do and why they exist.

7. **Observability and diagnostic thinking** — new app — a multi-server API where intermittent failures are invisible without proper instrumentation

   **Why seventh:** The learner just set up multiple stateless servers behind a load balancer. For the first time, `console.log` on one server won't show them everything — a request might hit server 1 or server 2, and a problem might only manifest on one of them. This is the moment where observability stops being "a dashboard someone made for me" (what Grafana was in Crawling) and becomes "a skill I need to find problems I can't see." Every previous scenario handed the learner a pre-built dashboard with the problem visible. This scenario asks: "users report intermittent slowness. Which server? Which endpoint? When did it start? You have raw metrics and logs — find it."

   **Why after stateless/load balancing:** Multi-server architecture is what makes observability non-optional. On a single server, you can SSH in and tail the logs. With two servers behind a load balancer, you need structured logging with request IDs, correlation across components, and the ability to ask targeted diagnostic questions of your metrics. The learner feels this need organically because the system they just built in Scenario 6 is the first one where "just look at the logs" doesn't work anymore.

   **Why before read replicas:** Scenario 8 adds another layer of complexity — now queries might go to the primary or a replica, and stale reads are a new failure mode. The learner needs strong diagnostic instincts before that complexity arrives. If they can trace a request across two app servers and a load balancer, they'll be ready to trace it across app servers, a load balancer, and multiple database nodes.

8. **Database replication and read replicas** — new app — analytics dashboard or reporting system

   **Why eighth:** The learner has scaled the app layer (horizontal scaling, load balancing, stateless design), added a caching layer (Redis), and built the diagnostic skills to find problems across multiple components. The database is now the remaining single point of failure and the remaining bottleneck for read-heavy workloads. Read replicas are the answer: send writes to the primary, reads to replicas.

   **Why last in Walking:** This follows the natural scaling sequence — optimize queries (Crawling) → cache results (Walking 5) → scale app layer (Walking 6) → learn to diagnose across components (Walking 7) → scale database layer (Walking 8). Each step goes one layer deeper in the stack. This mirrors real production scaling: you exhaust the cheaper optimizations before reaching for the more complex ones.

   **Why a reporting/analytics app:** Reporting is naturally read-heavy. A dashboard hitting the database with expensive aggregation queries is the perfect context for "send these reads to a replica so they don't slow down the primary."

**WHY THIS ORDER:** Scales the system layer by layer — cache (Scenario 5) → app layer (Scenario 6) → observability across components (Scenario 7) → database layer (Scenario 8). Observability is inserted before read replicas because multi-server architecture is what makes diagnostic skills non-optional, and read replicas add the complexity that tests those skills. Each step goes one layer deeper, mirroring real production scaling.

#### Running — learn to split and decouple

**Goal:** The learner can split a system into parts that communicate asynchronously.
**Scaffolding:** Low. Here's a broken system and its symptom. Figure out why and fix it.

9. **Message queues and async processing** — new app — an order processing system or image processing pipeline

   **Why ninth:** This is a fundamental mindset shift. Every scenario so far has been synchronous — request comes in, do the work, send the response. Message queues introduce asynchronous processing: "accept the request, put the work on a queue, return immediately, process later." This is how real production systems handle email sending, image processing, PDF generation, and anything that takes more than a few hundred milliseconds.

   **Why first in Running:** Async processing is the simplest form of decoupling. One producer, one queue, one consumer. It's conceptually clean. The learner sees the benefit (faster response times, better resilience) without dealing with the complexity of many-to-many communication yet.

   **Why the order processing app:** "User places an order → return 202 Accepted → process payment, send confirmation email, update inventory asynchronously." This is exactly what happens in real e-commerce backends. The learner sees a real pattern, not a contrived exercise.

   **Backpressure — what happens when the queue fills up:** This scenario also covers backpressure as a natural consequence of async processing. The implicit assumption with queues is that consumers keep up with producers. In production, they often don't. The queue grows, memory fills up, and the system falls over — not because anything is broken, but because the producer is faster than the consumer. The load test should make the learner feel this: orders arrive faster than the worker can process them, queue depth climbs, and eventually the system degrades. The learner then faces a real tradeoff: do you drop messages? Slow down the producer (reject new orders with 429)? Add more consumers? Each option has costs. This pairs naturally with message queues because backpressure is the first thing that goes wrong when you decouple a system — and the learner needs to see it here, not discover it for the first time in production.

10. **Pub/Sub and fan-out** — new app — a notification or activity feed system

    **Why tenth:** Queues are point-to-point. Pub/Sub is one-to-many. "A user posts a photo. The timeline service needs to know. The notification service needs to know. The analytics service needs to know. The search index needs to know." Instead of the photo service calling four other services directly, it publishes an event and every interested service subscribes.

    **Why after message queues:** Pub/Sub builds directly on the queue concept. The learner already understands "put a message somewhere and something else processes it." Now the "something else" is multiple somethings. That's a natural extension, not a new concept.

    **Why a notification/activity system:** Fan-out is what notifications ARE. One event triggers many actions. The domain makes the architecture pattern feel obvious rather than imposed.

11. **API design, rate limiting, and graceful degradation** — new app — a public API that gets hammered

    **Why eleventh:** The learner has now built systems with multiple components communicating asynchronously. The final Running scenario asks: "how do you protect your system from the outside world?" Rate limiting, timeout handling, and graceful degradation are the answer. The lesson is deliberately broader than just rate limiting — it asks "when your system is under pressure, what do you sacrifice and what do you protect?" That judgment call sets up Track 2's tradeoff-heavy thinking.

    **Why last in Running:** It's the most "outward facing" concept. Everything else in Running is about internal system architecture. This scenario is about the boundary between your system and the world. It's a natural transition to Sprinting, where the learner builds complete systems with all these concerns integrated.

**WHY THIS ORDER:** Decouple internally (queues) → broadcast internally (pub/sub) → protect externally (rate limiting and degradation). The progression moves from simplest decoupling pattern to the system's boundary with the outside world.

#### Sprinting — apply everything to real systems

**Goal:** The learner applies everything from Crawling through Running to build complete systems. No hints, no before/after code, no commands handed to them.
**Scaffolding:** None. Here's a system. It's broken or naive. Fix it.

##### Core Path

12. **URL shortener**

    **Why first in Sprinting:** It's the simplest complete system the learner can build. Database design (storing URLs and short codes), caching (popular URLs should be served from cache), and basic API design (create, redirect, maybe analytics). It uses 2-3 Track 1 concepts in combination. Low complexity, high confidence-building.

    **Why this order:** The learner needs a win. After 11 scenarios of increasingly challenging diagnostic exercises, the first Sprinting scenario should feel achievable. "I can actually build this from what I know." That confidence is what carries them through the harder Sprinting scenarios.

13. **Booking / reservation system**

    **Why second in Sprinting:** It introduces concurrency under contention — a problem the learner hasn't explicitly faced. "Two users try to book the last available slot at the same time. One should succeed, one should get an error. How do you prevent double-booking?" This is solvable with Track 1 tools (database transactions, SELECT FOR UPDATE, proper connection pooling under load) but it's the first time the learner faces a correctness problem, not just a performance problem. Every scenario before this asked "how do you make it faster?" This one asks "how do you make it correct?" That's a fundamentally different kind of engineering challenge, and it foreshadows Track 2's consistency and distributed transaction concerns.

    **Why before the capstone:** Moving from "make it fast" to "make it correct" is the bridge between Track 1 thinking (performance) and Track 2 thinking (correctness, consistency, tradeoffs). The learner needs to feel the tension — "transactions and locks have performance costs, but without them your data is wrong" — before facing the chat system, where correctness AND performance collide across multiple servers.

14. **Chat system** — real-time messaging between users

    **Why the capstone:** The chat system is the ultimate Track 1 integration exercise. A naive chat system breaks in predictable ways under load, and every fix maps directly to a Track 1 concept: messages don't reach users on other servers (pub/sub from Scenario 10), message history loads slowly (indexes from Scenario 2), connections exhaust under load (pooling from Scenario 3), single server can't handle the connections (horizontal scaling from Scenario 4), recent messages hit the database every time (caching from Scenario 5). It tests breadth of integration — can the learner recognize and apply six different concepts in one system?

    **Why after booking:** The booking system teaches the learner that correctness under concurrency is hard even on one server. The chat system expands the blast radius — correctness AND performance across multiple servers, multiple concerns (messaging, presence, history), and multiple Track 1 concepts applied simultaneously. It's the scenario that proves the learner can hold the full picture.

    **Why WebSockets aren't a blocker:** WebSocket code is provided in the codebase. The learner doesn't build real-time infrastructure from scratch — they diagnose why the chat architecture breaks under load and fix it with everything they've learned. WebSockets are a transport mechanism. The system design problems behind a chat system — cross-server message routing, connection management, message persistence, caching — are all Track 1 concepts applied together.

##### Bonus Challenges

These scenarios are available for learners who want deeper integration practice before moving to Track 2. They combine multiple Track 1 concepts and provide valuable reps, but are not required for progression.

**Notification system**

Combines message queues, pub/sub, fan-out, caching, and database design. The learner has seen queues and pub/sub individually in Running. Now they combine them into a real system: "user triggers an event → multiple notification channels (email, push, in-app) need to fire → each channel has different delivery characteristics." Moderate complexity — 3-4 concepts combined. A good stepping stone for learners who want extra practice before the booking system or the chat capstone.

**News feed / timeline**

The most complex optional challenge. It touches almost every concept: database design, indexing, caching strategy, fan-out (when a user posts, whose feeds get updated?), message queues (async feed generation), and read replicas (feed reads vs. post writes). Scoped to Track 1 tools — this is NOT the distributed news feed design problem from system design interviews. This is: "build a working news feed with PostgreSQL, Redis, a message queue, and a load balancer." The distributed concerns (eventual consistency, sharding the social graph, fan-out-on-write vs. fan-out-on-read at scale) are Track 2 questions that get planted but not answered.

**WHY THIS ORDER:** Core path goes confidence builder (URL shortener, 2-3 concepts) → fundamentally different challenge type (booking system, correctness under concurrency) → full integration capstone (chat system, 6+ concepts). Each core scenario does something the previous one didn't. Bonus challenges provide additional integration reps for learners who want them.

---

## Track 2 — Mid to Senior

### The Learner

A mid-level engineer who knows the building blocks but is stuck. They can implement solutions but struggle to design systems from scratch, reason about failure modes before they happen, or make defensible tradeoff decisions under ambiguity. This is the jump most engineers find hardest and stay stuck at longest — sometimes years.

### What Makes This Jump Different

Mid to senior is mostly about **judgment**, not knowledge. Senior engineers don't know more facts — they know which tradeoffs matter in a given context, can design systems they've never built before by reasoning from first principles, think about failure modes before they happen, and make decisions under ambiguity without needing all the information.

This means the Sprinting scenarios for Track 2 can't be purely code-based. They require open-ended reasoning — designing under ambiguity, defending tradeoffs, critiquing other designs. AI evaluation becomes essential here because there's no single right answer to check against.

### The Curriculum

#### Crawling — distributed systems fundamentals

**Goal:** Shatter the single-server, reliable-network, one-source-of-truth mental model.
**Scaffolding:** High again (new tier, new mental model). Concepts explained before needed, but the systems are distributed and the failures are harder to reproduce.

**Why scaffolding resets here:** The learner just finished Track 1 Sprinting with zero scaffolding. Going back to high scaffolding might feel like regression, but it's not — it's a new mental model. Track 1 scaffolding taught "how production systems work." Track 2 scaffolding teaches "why everything you assumed about networks and consistency is wrong." The concepts are fundamentally different, so the guidance comes back temporarily. This should be communicated explicitly in the Track 2 SCENARIO.md files: "You've proven you can work without guidance. Now we're breaking your mental model, so the training wheels come back — temporarily."

1. **Why distributed systems are hard** — partial failures, network unreliability, no shared clock

   **Why first:** Every single scenario in Track 1 operated under three silent assumptions: the network is reliable, the database is always available, and there's one source of truth. This scenario breaks all three. "Server A sent a request to Server B. It didn't get a response. Did Server B receive the request? Did it process it? Did it respond and the response got lost? You don't know. You CAN'T know." That's the fundamental challenge of distributed systems, and every concept in Track 2 exists because of it.

   **Why before CAP:** CAP theorem is the formalization of a tradeoff. The learner needs to feel the tradeoff before seeing the formalization. "Your database is partitioned. Do you serve stale data or return an error?" only hits hard if the learner first understands why partitions happen and why you can't just "fix" them.

2. **CAP theorem in practice** — not the theory, but feeling the tradeoff through a real system

   **Why second:** The most misunderstood concept in system design. Most engineers think CAP means "pick 2 of 3." It doesn't. It means: during a network partition (which WILL happen), you must choose between consistency and availability. You can't have both. This scenario should make the learner FEEL that tradeoff — not read about it, but experience a system where they have to choose and live with the consequences.

   **Why after "why distributed systems are hard":** Scenario 1 establishes that partitions happen and you can't prevent them. Scenario 2 asks: "given that partitions happen, what do you sacrifice?" The learner can't engage with the tradeoff without first understanding why it's unavoidable.

3. **Eventual consistency** — what it means when two nodes disagree and how systems reconcile

   **Why third:** CAP tells you that you might have to sacrifice consistency. Eventual consistency is what that sacrifice looks like in practice: "User updates their profile on Server A. User reads their profile from Server B. They see the old data. Eventually Server B catches up. But 'eventually' might be 5 milliseconds or 5 seconds." This scenario shows what eventual consistency feels like as a user and as an engineer.

   **Why after CAP:** CAP introduces the consistency/availability tradeoff as a binary choice. Eventual consistency is the nuanced reality — most systems don't choose "always consistent" or "always available." They choose "consistent most of the time, eventually consistent during partitions." This scenario explores that nuance.

**WHY THIS ORDER:** Feel the problem (Scenario 1) → formalize the tradeoff (Scenario 2) → live with the consequences (Scenario 3). Each step requires the previous one to land.

#### Walking — scaling patterns that hurt

**Goal:** Learn scaling techniques where every solution creates new problems. This is where "engineering judgment" starts meaning something — the right answer depends on context.

4. **Database sharding** — what it solves, what it breaks, how to pick a shard key

   **Why first in Walking:** This is the first scaling technique where the tradeoffs are genuinely painful. In Track 1, every optimization was mostly upside: indexes make reads faster (small write cost), caching reduces load (small staleness cost). Sharding solves write scaling but breaks joins across shards, breaks transactions across shards, and makes operations dramatically more complex. This is the senior engineer lesson: at scale, every solution creates new problems. The learner needs to feel that. Track 1 already covers horizontal scaling (Scenario 4), stateless design (Scenario 6), and session management (Scenarios 5-6) — those are assumed knowledge by Track 2. Sharding is genuinely new territory and the right starting point.

5. **Consistent hashing** — why naive sharding breaks when you add or remove nodes

   **Why immediately after sharding:** "You have 4 shards. User data is distributed by user_id % 4. You add a 5th shard. Now user_id % 5 gives different results for almost every user. You have to move almost all your data." Consistent hashing solves this specific problem. Teaching it right after sharding makes the motivation concrete and visceral — the learner just saw the problem.

6. **Replication lag and its consequences** — when read replicas serve stale data and it causes real bugs

   **Why here and not earlier:** Track 1 Scenario 8 introduces read replicas as a scaling tool. This scenario shows what goes wrong. "User updates their email, immediately loads their profile page, sees the old email." This is a real production bug caused by replication lag, and fixing it requires understanding consistency models — which the learner just learned in Crawling.

   **Why separate from Track 1's read replicas scenario:** Track 1's version is "add read replicas to scale reads." Track 2's version is "your read replicas are lying to your users, and the fix isn't obvious." The first is a scaling technique. The second is a consistency problem. They require different mental models.

7. **Distributed tracing** — tracing requests across service boundaries, understanding causality in multi-service systems

   **Why here:** Track 1 Scenario 7 taught observability across multiple instances of the same service behind a load balancer. That's structured logging, request IDs, and reading dashboards. Track 2's systems are fundamentally different — multiple independent services communicating via queues, pub/sub, and direct calls. When a saga fails on step 3 of 5 across 3 services, the learner needs to trace the request across service boundaries to understand what happened and why. Correlation IDs that propagate across services, span trees that show causality, understanding where in a multi-service call chain something failed — these are different skills from Track 1's observability.

   **Why after replication lag:** The learner has now seen data distribution (sharding), node placement (consistent hashing), and staleness (replication lag). Each of those creates problems that are invisible without proper cross-service visibility. Before the curriculum adds more distributed complexity — distributed caching in Walking, circuit breakers and sagas in Running — the learner needs the diagnostic tool to see across service boundaries. The same argument that earned Track 1 observability its own scenario applies: teach the diagnostic skill before the tier that demands it.

   **Why before distributed caching:** Distributed caching involves coordinating invalidation across multiple cache nodes and app servers. Debugging cache coherence problems — "why is this server serving stale data when the cache was invalidated 5 seconds ago?" — requires tracing the invalidation event across service boundaries. The learner needs distributed tracing before distributed caching problems are debuggable.

8. **Distributed caching** — cache coherence, stampede, thundering herd, invalidation at scale

   **Why this replaces "horizontal scaling done right":** Track 1 taught single-node Redis caching. At scale, caching becomes a distributed systems problem. "You have 10 app servers behind a load balancer and 3 Redis nodes. A cache entry is invalidated. How do you ensure all 10 app servers stop serving stale data? What happens if 10,000 users hit the same uncached key at the exact same time?" These are real problems (cache stampede, thundering herd) that senior engineers deal with regularly, and they connect familiar Track 1 knowledge (Redis) to new Track 2 complexity (distributed coordination).

   **Why last in Walking:** It's the most operationally complex topic in the tier. The learner needs sharding (understanding data distribution), consistent hashing (understanding how data is placed on nodes), replication lag (understanding staleness), and distributed tracing (the ability to see across service boundaries) before distributed caching makes full sense.

**WHY THIS ORDER:** Each scenario takes a familiar Track 1 concept and shows what breaks at scale. Sharding introduces painful tradeoffs → consistent hashing solves the problem sharding creates → replication lag reveals consistency bugs → distributed tracing gives the learner visibility across service boundaries → distributed caching shows what happens when a simple tool meets distributed complexity.

#### Running — resilience and failure design

**Goal:** Design for the unhappy path. Every scenario is about what goes wrong and how to survive it.

9. **Circuit breakers and retries** — designing for failure, not the happy path, stop calling a dead service

   **Why first in Running:** This is the most intuitive resilience pattern. "Service B is down. Do you keep calling it, timing out after 30 seconds each time, making your users wait? Or do you detect that it's down and fail fast?" Circuit breakers are the distributed systems equivalent of a fuse box — they protect your system from cascading failure. Starting with this establishes the Running tier's mindset: "design for failure, not for the happy path."

   **Why retries are paired with circuit breakers:** Retries and circuit breakers are opposing forces. Retries say "try again, it might work." Circuit breakers say "stop trying, it's broken." Understanding when to retry (transient failures) vs. when to stop (persistent failures) is the actual engineering judgment. Teaching them together forces the learner to reason about the difference.

10. **Idempotency** — why it matters and what breaks without it, why "process this exactly once" is a lie

    **Why second:** "The payment was charged twice." This is one of the most expensive distributed systems bugs. It happens because: Client sends a request. Server processes it. Response gets lost. Client retries. Server processes it again. Without idempotency keys, the server has no way to know "I already did this."

    **Why after circuit breakers:** Circuit breakers teach the learner that calls fail and get retried. Idempotency teaches them what happens when those retries cause duplicate processing. The connection is direct: "you just learned that retries are necessary. Now learn why retries are dangerous without idempotency."

11. **Distributed transactions** — two-phase commit, saga pattern, and why this is the hardest problem

    **Why third:** "Transfer $100 from Account A (on Database 1) to Account B (on Database 2). Both databases must agree on the outcome. What if Database 2 goes down after Database 1 has already deducted the money?" This is the hardest practical problem in the curriculum. Two-phase commit (the "simple" solution) has terrible performance characteristics. Saga pattern (the practical solution) requires compensating transactions and is complex to implement correctly.

    **Why after idempotency:** Distributed transactions rely on idempotent operations. A saga that retries a step must be idempotent or it'll corrupt data. The learner needs idempotency as a foundation before tackling the complexity of coordinating operations across multiple databases.

12. **Rate limiting at scale** — distributed rate limiting across multiple servers

    **Why last in Running:** "User is allowed 100 requests per minute. Their requests hit 5 different servers behind a load balancer. How does each server know how many requests the user has already made?" This combines distributed state (a counter shared across servers), consistency (all servers must agree on the count), and performance (checking the rate limit can't add significant latency). It's a capstone that touches every concept from Track 2 so far.

    **Why moved from Track 1 to Track 2:** Single-server rate limiting is a few lines of middleware. It's not a system design problem. Distributed rate limiting is a genuine distributed systems challenge. It belongs where the distributed systems concepts have been taught.

**WHY THIS ORDER:** Each scenario builds on the previous: circuit breakers introduce retries → retries require idempotency → coordinating across systems requires distributed transactions → controlling access across systems requires distributed rate limiting.

#### Sprinting — architecture design problems

**Goal:** Open-ended design challenges with no single right answer. AI-evaluated reasoning quality, not output correctness.
**Scaffolding:** None. The learner makes design decisions under ambiguity, defends tradeoffs, and critiques architectures.

13. **Design under ambiguous requirements** — given vague requirements, make defensible decisions

    **Why first in Sprinting:** This is the defining senior engineer skill. "The PM says 'we need a system that handles user uploads.' How big are the uploads? How many users? What's the latency requirement? What's the budget? They don't know yet. Design something defensible anyway." The learner must identify what questions matter, make reasonable assumptions, and design a system that works under those assumptions while being adaptable if the assumptions are wrong.

14. **Spot what's wrong** — given someone else's architecture, identify failure modes

    **Why second:** The inverse of Scenario 13. Instead of designing from scratch, the learner reads an existing design and finds the problems. "Here's an architecture diagram and a description. Where will it fail? Under what conditions? What would you change?" This tests a different skill — critical analysis rather than generative design. Senior engineers do this in every design review.

15. **Scale an existing system** — given a system at 10x load, what changes and in what order

    **Why third:** This is the most common real-world scenario for a senior engineer. You rarely design from zero. You usually have an existing system that needs to handle more traffic. The learner must reason about: what breaks first? What's the cheapest fix? What's the most impactful fix? What order do you implement changes? What's the rollback plan if something goes wrong?

16. **Cost vs performance tradeoffs** — given a budget constraint, where do you cut and what do you sacrifice?

    **Why last:** This is the ultimate judgment exercise. "Your system needs to handle 10x traffic, but you can only spend 2x more on infrastructure. Where do you invest? What do you sacrifice?" This forces the learner to make tradeoff decisions that have no objectively correct answer — only defensible ones. It's the closest thing in the curriculum to what a senior engineer does in a real architecture meeting.

**WHY THIS ORDER:** Four core senior skills in ascending difficulty — generative design → critical analysis → prioritization → judgment under constraints. Each exercise has less structure than the previous, culminating in the most constrained and ambiguous challenge.

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
- **Dev server:** nodemon (auto-restarts on file save, same as real development workflow)
- **Database:** PostgreSQL
- **Metrics:** Prometheus + Grafana
- **Load testing:** autocannon
- **Containers:** Docker Compose

---

## Current Status

- Track 1, Crawling stage (Scenarios 1–4) is complete
- Scenario 1: social feed app — connection pooling, indexes
- Scenario 2: e-commerce shop — query planning, cardinality, EXPLAIN ANALYZE, composite indexes
- Scenario 3: job queue API — pool sizing, connection timeout, PostgreSQL connection ceiling
- Scenario 4: product catalog API — CPU ceiling, horizontal scaling, nginx load balancer, pool budget split
- Testing with real learners is the immediate next step
- Walking stage (Scenarios 5–8) is next to build after learner feedback on Crawling

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

**Booking / reservation system added to Track 1 Sprinting**
Added as Scenario 13 (moved up from its original position as Scenario 14 when Sprinting was restructured into a core path and bonus challenges). Every scenario before this asks "how do you make it fast?" The booking system asks "how do you make it correct?" — two users trying to book the last available slot at the same time is a correctness-under-concurrency problem, not a performance problem. This is solvable with Track 1 tools (database transactions, `SELECT FOR UPDATE`, proper pooling) but introduces the concept that correctness matters as much as speed. It foreshadows Track 2's consistency and distributed transaction topics and serves as the conceptual bridge between "Track 1 thinking" (performance) and "Track 2 thinking" (correctness, consistency, tradeoffs).

**Chat system kept in Track 1 Sprinting**
Originally considered removing it because WebSockets aren't covered in Track 1. Kept it because in a Sprinting scenario, the WebSocket code is provided — the learner doesn't build real-time infrastructure from scratch. Every architectural fix in a broken chat system maps to a Track 1 concept: cross-server message delivery (pub/sub), slow message history (indexes), connection exhaustion (pooling), single-server bottleneck (horizontal scaling), repeated database hits for recent messages (caching). The chat system is the strongest possible capstone because it tests breadth of integration — can the learner recognize and apply six different concepts in one system?

**Track 2 Walking restructured — "horizontal scaling done right" removed, "distributed caching" added**
Track 1 already covers horizontal scaling (Scenario 4), stateless design (Scenario 6), and session management (Scenarios 5-6). Revisiting these as a standalone Track 2 scenario would feel like review. Sticky sessions (the one genuinely new concept) doesn't warrant its own scenario. Distributed caching replaces it because it takes familiar Track 1 knowledge (Redis caching) and shows what breaks at scale — cache stampede, thundering herd, invalidation across multiple cache nodes. This is genuinely new content that bridges Track 1 and Track 2, rather than re-covering Track 1 material at a slightly deeper level.

**Track 1 restructured to 16 scenarios (14 core + 2 bonus)**
With the addition of the observability scenario to Walking and the restructuring of Sprinting into a core path and bonus challenges, Track 1 is now: 4 Crawling, 4 Walking, 3 Running, 3 Sprinting core + 2 Sprinting bonus. The required path is 14 scenarios. The notification system and news feed/timeline are available as bonus challenges for learners who want deeper integration practice but are not required to progress to Track 2. Track 2 has 16 scenarios, bringing the total to 32 (30 required + 2 bonus).

**Observability scenario added to Walking**
Added as Scenario 7 between stateless servers/load balancing (Scenario 6) and read replicas (Scenario 8). Multi-server architecture is what makes observability non-optional — the learner can no longer diagnose problems by looking at one server. This is the first scenario where the learner must develop their own diagnostic approach rather than reading a pre-built dashboard. It also strengthens the transition into read replicas, where tracing problems across app servers AND database nodes requires the skills taught here.

**Distributed tracing scenario added to Track 2 Walking**
Added as Scenario 7 between replication lag (Scenario 6) and distributed caching (Scenario 8). Track 1's observability (Scenario 7) teaches tracing across multiple instances of the same service behind a load balancer. Track 2's systems involve multiple independent services communicating via queues, pub/sub, and direct calls. Tracing a request across service boundaries — correlation IDs that propagate across services, span trees, understanding causality in a multi-service call chain — is a different skill from Track 1's observability. The same argument that earned Track 1 observability its own scenario applies here: the learner needs diagnostic visibility across service boundaries before Track 2 Running introduces circuit breakers, idempotency, and distributed transactions, all of which involve failures spanning multiple services.

**Sprinting restructured into core path and bonus challenges**
The original 5 Sprinting scenarios (URL shortener, notification system, news feed, booking system, chat system) were restructured into 3 core (URL shortener → booking system → chat system) and 2 bonus (notification system, news feed). The core path provides a tighter arc: confidence builder → correctness shift → full integration capstone. The bonus challenges remain available for learners who want additional reps combining multiple concepts. The booking system was moved up to second position in Sprinting because the correctness-vs-performance shift is too important to risk a learner never reaching it due to burnout from back-to-back capstone projects.

**DNS and CDN awareness added to Scenario 6**
Woven into the stateless servers and load balancing scenario as a conceptual section, not a standalone scenario. The learner's mental model of the request path up to this point is: load balancer → app server → database. The real path starts earlier — DNS resolution and CDN for static assets. This doesn't warrant its own broken-codebase exercise (DNS/CDN problems are hard to simulate in the hands-on format), but a bootcamp grad heading to mid-level needs to understand the full request lifecycle. Scenario 6 is the natural home because it already covers load balancing and traffic routing — DNS and CDN are the layers immediately in front of the load balancer.

**Backpressure added to Scenario 9**
Woven into the message queues and async processing scenario, not a standalone scenario. When you decouple producers from consumers, the first thing that goes wrong in production is the producer outpacing the consumer. Queue depth climbs, memory fills, the system degrades. The learner needs to see this the first time they work with queues — not discover it later. The load test naturally creates backpressure (orders arrive faster than the worker processes them), and the tradeoff — drop messages, reject new work, or add consumers — pairs directly with the queue concept being taught.

---

## Lessons Learned

_Updated as user testing reveals what works and what doesn't._

None yet — user testing with real learners is the immediate next step.

---

## What We've Tried and Rejected

**Separate repos per scenario**
Considered and rejected. Managing 30 separate repos is too much overhead. Monorepo with subfolders is cleaner and Codespaces supports it.

**Combining indexes and connection pooling into one scenario**
Scenario 1 introduces both briefly. We considered making Scenarios 2 and 3 go deeper on both together. Rejected — too much in one scenario, and the separation allows each concept to get a full load test and full diagnostic exercise.

**Starting with connection pooling before diagnosing failures**
Considered putting connection pooling or indexes before the diagnosing failures scenario since they're more foundational. Rejected — the diagnosing failures scenario earns its place first because it establishes the mindset (production systems break under load) before going deep on any specific concept. Without that hook, indexes and pooling are abstract.

**Strict prerequisite chain**
Considered requiring learners to complete scenarios in strict order with no jumping allowed. Rejected in favor of standalone with recommended order. Flexibility matters — a working engineer with a specific gap should be able to jump to the relevant scenario without doing all the ones before it.

**Adding an N+1 scenario to the Crawling tier**
Considered adding N+1 queries as a standalone scenario or slotting it into Scenario 1 (social feed) or Scenario 2 (e-commerce indexes). Rejected — N+1 is an application-level query pattern problem, not a system design concept. You fix it by writing a better query (JOIN instead of a loop). Every concept in the current curriculum is an architectural or infrastructure decision: how you connect to the database, how you index it, how you scale it, how you cache it. N+1 sits in a different category and doesn't extend the Crawling arc. The one place it could earn its spot is in the Sprinting tier — when building a news feed or notification system at scale, N+1 becomes an architectural concern because the fix might involve denormalization or a separate read model rather than just a better query. If learner testing reveals it's a gap blocking understanding of later concepts, add it then. Until then, leave it out.

---

## Current Open Questions

**How to handle the devcontainer per scenario in a monorepo**
Each scenario has its own .devcontainer with auto-seed and auto-open SCENARIO.md. In a monorepo, Codespaces launches from the repo root, not from a subfolder. This means the per-scenario devcontainer magic (auto-seed, auto-open) may not fire automatically. Need to test this and find the right solution — either a root devcontainer that asks which scenario to load, or per-scenario repos linked from the monorepo, or another approach.

**Web interface design**
What does the web interface look like when we're ready to build it? Exercise panel alongside the Codespace, progress tracking, signup flow. This is a future decision — not until 2-3 scenarios are validated with real learners.

**Track 2 Sprinting format**
Open-ended design challenges evaluated by AI. What does the rubric look like? How does the AI push back on weak reasoning? How is progress tracked when there's no right answer? This needs to be designed before Track 2 Sprinting scenarios are built.

**Assessment in Sprinting scenarios (Track 1)**
Crawling through Running scenarios use comprehension, observation, and reflection questions embedded in SCENARIO.md. Sprinting has zero scaffolding — no questions, no step-by-step guide. What does assessment look like for Scenarios 12-14 (core path) and the bonus challenges? Is success purely metric-based (latency improved, errors dropped, no double-bookings)? Does the platform evaluate the learner's approach or just the outcome? Can the platform detect whether the learner applied a good architectural fix vs. a hacky workaround that happens to pass the metrics? This needs to be designed before the Sprinting scenarios are built.

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
By the time a learner reaches the Sprinting tier (URL shortener, notification system, news feed, booking system, chat), the codebases should feel closer to real production systems — multiple interacting services, realistic data volumes, failure modes that aren't immediately obvious. The simplification scaffolding should be removed progressively as the learner advances.

---

## Scaffolding Reduction Principle

Each tier of the curriculum should feel noticeably less guided than the one before it. The goal is to develop diagnostic instincts, not recipe-following. If every scenario gives learners the problem, the fix, and the command to run, they complete the scenario but don't develop the ability to figure things out on their own.

**Crawling (Scenarios 1-4): High scaffolding**
Tell them what to look for. Give them the before/after code. Give them the commands. Explain the concepts before they need them. The goal is to get the concept to land cleanly on a first exposure. A bootcamp grad who has never seen a production system fail needs this level of guidance or they'll abandon the scenario in frustration before the lesson lands.

**Walking (Scenarios 5-8): Medium scaffolding**
Tell them what the problem category is but not exactly where it is. Give them the diagnostic tools but not the diagnosis. Let them find the problem themselves before showing the fix.

**Running (Scenarios 9-11): Low scaffolding**
Here's a broken system. Here's the symptom. Figure out why and fix it. Concepts are referenced but not explained — the learner should know them by now. Hints exist but are buried, not upfront.

**Sprinting (Scenarios 12-14 core, plus bonus challenges): No scaffolding**
Here's a system. It's slow, failing, or behaving unexpectedly. No hints. No before/after code. No commands handed to them. This is the job. The learner is expected to bring everything from the previous tiers and apply it independently.

**What this means for Scenarios 1 and 2:**
The current level of hand-holding in Scenarios 1 and 2 is correct for Crawling tier. Nothing needs to change. The scaffolding reduction happens in future scenarios — each tier should be built with progressively less guidance than the one before it.

---

## Symptoms Before Code Principle

Every scenario's investigation flow must follow the same order: observe the problem first, then read the code to understand why.

1. **See the symptoms** — run the load test, open Grafana, record what's slow or broken. The learner experiences the problem before knowing anything about the codebase.
2. **Understand the system** — read the code, read the schema, answer comprehension questions. Now the learner knows what the system does and can form hypotheses about why it's slow.
3. **Diagnose** — use specific tools (EXPLAIN ANALYZE, connection stats, logs) to confirm or disprove their hypotheses with evidence.
4. **Fix and verify** — apply the fix, rerun the load test, compare before/after.

This matches how engineers actually work in production. Nobody opens the codebase first — they look at the dashboard, see the spike, and then dig into the code that's causing it. Scenario 1 establishes this habit explicitly. Every scenario after it must reinforce it through structure, not repeat the lesson.

**What this prevents:** The "read the code and guess what's wrong" approach that bootcamp projects teach. Production debugging starts with observable symptoms, not source code.

---

## No Magic Fix Scripts

Fix scripts — `npm run apply-fix`, `apply-fix.sh`, or any script that applies a fix automatically — are banned from all scenarios. Running a script that implements a fix teaches nothing. The learner didn't do anything. A script did it for them.

**The rule:** every fix a learner applies must be typed by them directly. SQL goes into psql directly. Code changes go into the editor directly. The act of writing it is the learning.

**What this means in practice:**

Instead of:

```bash
npm run apply-fix
```

The scenario should say:

```bash
psql postgresql://postgres:postgres@postgres:5432/feedapp
```

Then have the learner type the SQL themselves:

```sql
CREATE INDEX idx_posts_created_at ON posts (created_at);
```

**Solution files:**
`server.fixed.js` and `fix.sql` can remain in the repo as last-resort references but should be moved to a `solution/` folder and only mentioned in the Stuck table — never in the main exercise flow. They are not a step. They are a fallback for someone who has genuinely tried and is completely stuck.

**Apply to all scenarios from Scenario 1 onwards.** Remove all `apply-fix` npm scripts and shell scripts from every scenario.

---

## Scenario App Choices and Narrative Bridges

Each scenario uses a distinct app so learners aren't just seeing the same codebase with different problems. The app is chosen to make the scenario's core problem feel natural and realistic.

**Scenario 1 — Social feed app**
A Twitter-like feed with users and posts. Justification: every bootcamp grad has built something like this. The broken pool and missing index feel immediately real.

**Scenario 2 — E-commerce shop**
Products, categories, orders. Justification: familiar domain, naturally write-heavy, index problems on category and price_cents feel authentic.

**Scenario 3 — Job queue API**
Background job processing (image resize, email send, report generation). Justification: write-heavy, high concurrency, makes pool exhaustion feel earned. Workers competing for jobs via `SELECT FOR UPDATE SKIP LOCKED` is a real production pattern.

**Scenario 4 — Product catalog API**
Product listings and sales reports. Justification: read-heavy with a CPU-intensive aggregation endpoint (`/report`) that saturates a single server under load. Pool and indexes are correct — the bottleneck is pure throughput.

**Scenario 7 — Multi-server API (observability)**
A multi-server API behind a load balancer where intermittent failures are invisible without proper instrumentation. Justification: this is the first scenario where the learner can't diagnose problems by looking at one server. With multiple stateless servers behind nginx, a request could hit any server, and a problem might only manifest on one of them. The learner needs structured logging, request correlation, and targeted metric queries — skills that were given to them for free (via pre-built Grafana dashboards) in Crawling but now must be developed independently.

**Scenario 13 — Booking / reservation system**
Venue bookings, appointment slots, or ticket reservations. Justification: introduces concurrency under contention — "two users try to book the last available slot at the same time." This is the first scenario where the problem is correctness, not performance. Every previous scenario asked "how do you make it faster?" This one asks "how do you make it correct?" Solvable with Track 1 tools (database transactions, `SELECT FOR UPDATE`, proper pooling under load) but the failure mode — double-booking — is a correctness bug, not a performance bug. This foreshadows Track 2's consistency and distributed transaction concerns.

**Scenario 14 — Chat system**
Real-time messaging between users. Justification: the ultimate Track 1 integration exercise. A naive chat system breaks in predictable ways under load, and every fix maps to a Track 1 concept: messages don't reach users on other servers (pub/sub from Scenario 10), message history loads slowly (indexes from Scenario 2), connections exhaust under load (pooling from Scenario 3), single server can't handle the connections (horizontal scaling from Scenario 4), recent messages hit the database every time (caching from Scenario 5). WebSocket code is provided in the codebase — the learner doesn't need to build real-time infrastructure from scratch. Their job is diagnosing why the chat architecture breaks under load and fixing it with everything they've learned across all tiers.

**Narrative bridges between scenarios (preserve these):**

Scenario 3 → 4: The learner discovers PostgreSQL's `max_connections` ceiling at the end of Scenario 3. The natural question — "what if I add more servers?" — is planted but not answered. Scenario 4 opens with that answer.

Scenario 4 → 5: The learner ends Scenario 4 with Q9 — "if a user's session lives on app1's memory, what happens when nginx routes their next request to app2?" That question has no solution in Scenario 4. Scenario 5 (Redis) is where the shared store answer lives.

Scenario 5 → 6: Caching solves the shared data problem but introduces cache invalidation complexity. The learner ends Scenario 5 knowing that stateless design — not just caching — is the real answer. Scenario 6 covers stateless servers properly.

Scenario 6 → 7: The learner has stateless servers behind a load balancer. Everything works — until users report intermittent slowness and the learner realizes they can't just `console.log` on one server anymore. "Which server is the problem? Which endpoint? When did it start?" Scenario 7 (observability) gives them the diagnostic skills to answer these questions across a multi-server system.

Scenario 7 → 8: The learner can now trace problems across multiple app servers. Scenario 8 (read replicas) adds database-layer complexity — queries might go to the primary or a replica, and stale reads are a new failure mode. The diagnostic instincts built in Scenario 7 become immediately necessary.

Scenario 8 → 9 (Walking → Running): The learner ends Scenario 8 with read replicas handling the read load and the primary handling writes. The system is scaled — but it's still synchronous. Every request waits for every operation to finish before responding. The natural question: "does every operation actually need to happen inside the request?" Scenario 9 (message queues) answers that question — "no, some work can happen later."

Scenario 11 → 12 (Running → Sprinting): The learner ends Scenario 11 having diagnosed and fixed individual problems in isolated systems. Every scenario so far has had one primary problem and one primary fix. Scenario 12 (URL shortener) is the first time the learner faces a complete system where multiple concerns interact — database design, caching, API design — and nobody tells them which one is the problem. The transition from "fix this specific thing" to "make this whole system work" is the jump into Sprinting.

Scenario 12 → 13: The URL shortener proves the learner can integrate 2-3 concepts independently. Scenario 13 shifts the question entirely: from "how do you make it fast?" to "how do you make it correct?" The double-booking problem under concurrent load is the first time the learner faces a correctness challenge, and the tension it creates — "transactions and locks have performance costs, but without them your data is wrong" — is the direct on-ramp to Track 2's consistency and distributed transaction topics.

Scenario 13 → 14: The booking system teaches the learner that correctness under concurrency is hard even on one server. The chat system expands the blast radius — correctness AND performance across multiple servers, multiple concerns (messaging, presence, history), and multiple Track 1 concepts applied simultaneously. It's the capstone that proves the learner can hold the full picture.

Track 1 → Track 2: The chat system plants questions it can't answer. "Messages arrive out of order across servers — which one is 'right'?" "A server crashes mid-delivery — was the message sent or not?" "Two users edit the same group name simultaneously on different servers — whose edit wins?" These aren't performance problems. They're distributed systems problems. The learner finishes Track 1 knowing the building blocks work and feeling the limits of single-database, reliable-network thinking. Track 2 Scenario 1 opens with: "everything you assumed was true about networks and consistency — isn't."

EXPLAIN ANALYZE is introduced in Scenario 1 and used more deeply in Scenario 2. It is not explicitly covered as its own dedicated scenario — it's treated as a standard diagnostic tool that learners pick up through repeated use.

**The intended progression:**

- **Scenario 1:** Introduced briefly. Learner runs it once to verify the index is being used. The output is explained for them.
- **Scenario 2:** Used as the primary diagnostic tool across three queries. Learner reads the output themselves and draws conclusions.
- **Scenario 3 onwards:** Referenced without explanation. "Run EXPLAIN ANALYZE and look for sequential scans" becomes a standard instruction with no hand-holding.
- **Walking tier:** Assumed knowledge. Learner is expected to reach for it instinctively when a query feels slow.

This is the scaffolding reduction principle applied to a specific tool. By the time a learner reaches the Walking tier, EXPLAIN ANALYZE should feel like second nature — not something that needs to be explained each time.

---

## Platform Assessment Layer — How the Questions Scale

Every SCENARIO.md contains questions learners answer directly in the markdown file. This works for the Codespaces-only version. On a proper platform (LeetCode-style) these questions become the foundation of a full assessment layer.

**What each question type becomes on a platform:**

**Comprehension questions (Q1, Q2, Q3)** — text input fields that must be filled before the next step unlocks. Forces the learner to read and think before touching anything.

**Observation questions (Q4, Q5)** — fields tied to actual load test results. The platform can cross-reference the learner's answer against the actual metrics from their environment.

**Reflection questions (Q7, Q8, Q9)** — open-ended reasoning questions evaluated by AI. The AI checks whether the answer demonstrates genuine understanding or just pattern matching, and gives specific feedback on weak reasoning.

**Why the questions must stay in the scenarios now:**
Even before the platform is built, the questions serve their purpose — they slow the learner down and force them to think before acting. They're also the foundation the assessment layer will be built on. Removing them now would mean rebuilding that structure later.

**The platform advantage:**
The Codespaces-only version has no way to know if a learner skipped the questions and went straight to the fixes. A platform can enforce question completion, store answers for later review, show model answers after submission, and use AI evaluation on open-ended responses. That's what makes the platform meaningfully better than the markdown-in-Codespaces version — not the UI, but the accountability and feedback loop.

---

## Platform Vision — What We're Actually Building

When we say "platform" we mean something in the same category as LeetCode, Codewars, NeetCode, and Boot.dev — a structured curriculum with progression, assessment, and a browser-based experience. But with one fundamental difference that makes it harder to build and more valuable to use.

**How we compare to existing platforms:**

LeetCode, Codewars, NeetCode — algorithm and data structure challenges. Code runs against test cases in a sandboxed browser environment. No running systems, no infrastructure, no real failure modes.

Boot.dev — the closest reference point. Structured curriculum, progression through levels, real concepts taught through doing. Browser-based. Good audience overlap with what we're building.

**The fundamental difference:**

Every platform above runs your code against test cases or in a sandboxed environment. What we're building runs a **real Node.js server, a real PostgreSQL database, real Prometheus scraping real metrics, and real Grafana displaying real dashboards.** The learner is inside a live system watching it fail in real time and fixing it.

That's not a sandboxed challenge. That's the job.

**The infrastructure challenge this creates:**

This is harder to build as a fully browser-contained platform. LeetCode can run a function against test cases on a small server. We need to spin up a full Docker Compose stack — app, database, Prometheus, Grafana — per learner, per session. That's a different infrastructure problem entirely.

**How we're solving it now:**
GitHub Codespaces handles the per-learner environment for free during the validation phase. Each learner gets their own cloud VM with the full stack running. No infrastructure to manage, no cost to us.

**How the platform gets built later:**
When the time comes to build a proper platform, the architecture decision is real — either replicate the Codespaces approach with our own cloud environments spun up per learner (expensive but authentic), or find a way to run lighter simulated environments in the browser (cheaper but loses some realism). That decision gets made after the curriculum is validated with real learners, not before.

**The differentiator in one sentence:**
Boot.dev teaches you concepts through structured exercises. We drop you into a live broken production system and make you fix it. That's what nobody else has built.

---

## Language Agnostic Principle

The platform teaches system design concepts, not JavaScript. JavaScript is the vehicle — chosen because it's readable, widely known, and runs everywhere. But a developer coming from Python, Java, Ruby, Go, or any other backend language should be able to follow the code without being tripped up by JavaScript syntax they don't recognize.

**What this means in practice:**

- Scenarios never assume the learner knows JavaScript deeply
- The system design concept is always the focus — the code is just how it's expressed
- Any place where JavaScript syntax might confuse a non-JavaScript developer gets a brief inline comment explaining what it does
- The fixes and concepts taught apply equally to any backend language and stack

**This principle applies to all scenarios across both tracks.**

---

## Code Commenting Principle

Every `server.js` and code file across all scenarios follows the same commenting standard:

**Comment JavaScript-specific syntax** that a developer from another language might not recognize:

- Destructuring assignment: `const { userId, content } = req.body`
- The `next()` function in Express middleware
- The `req.params`, `req.body`, `req.query` object shapes
- npm package names that aren't self-explanatory (`pg`, `prom-client`)
- The `async/await` pattern if used in a non-obvious way
- Arrow functions used in non-obvious contexts

**Do not comment universal backend concepts** that any backend developer already knows regardless of language:

- What a 400, 404, or 500 status code means
- What try/catch/finally does
- What returning JSON means
- What console.error does
- What an if statement does
- HTTP verbs (GET, POST, etc.)

**Always keep:**

- Section headers (`DATABASE CONNECTION`, `ROUTES`, `METRICS`, `START SERVER`)
- Intentional problem comments — these are clues for the learner, not noise
- Notes explaining why an artificial delay or constraint exists

The goal is code that reads like a real production codebase with just enough annotation for a non-JavaScript developer to follow along without losing the thread.

---

## Tradeoffs Before Solutions Principle

Before any fix in any scenario, there must be a genuine tradeoff moment. Not "here's the problem, here's the fix" — but "here's the symptom, what are your options, what does each cost, and which one makes sense here and why?"

The thought process before the solution is the real engineering skill. Knowing that a slow query needs an index is pattern matching. Knowing whether to add an index, add a cache, paginate differently, or restructure the query entirely — and being able to defend that choice — is engineering judgment. That's what we're building.

**What this looks like in practice:**

Every fix section should have a tradeoff moment before the fix is revealed. The learner reasons through options before reaching for a tool. Example from Scenario 1, Fix 2:

> The feed query is slow. Before reaching for an index, consider your options:
>
> Option A — Add an index on created_at. Faster reads, slightly slower writes on every INSERT.
> Option B — Cache the feed response. Don't hit the database at all for most requests. Faster, but data is stale until cache expires.
> Option C — Paginate differently. Use cursor-based pagination that avoids the full sort entirely.
>
> For this system right now — which makes sense and why? What would change your answer if traffic was 100x higher?

The learner must reason through this before the fix is shown. There's no single right answer — the right answer depends on context, and the learner needs to learn to ask "what context changes my answer?"

**How this scales with the scaffolding reduction principle:**

- **Crawling tier:** Options are provided. The learner reasons through them and picks one with justification.
- **Walking tier:** The symptom is provided. The learner generates the options themselves, then reasons through them.
- **Running tier:** A broken system is provided. The learner identifies the symptom, generates options, reasons through tradeoffs, and picks a solution — no prompting.
- **Sprinting tier:** Nothing is provided except the system. The learner does everything.

**What this prevents:**

The "if you see X, do Y" reflex. That reflex is what keeps engineers at mid-level. A senior engineer doesn't reach for a tool because they recognize a pattern — they reason about whether that tool is the right one for this specific situation, at this specific scale, with these specific constraints. The tradeoff moment before every fix is what builds that habit.

**This principle applies to all scenarios across both tracks.**
