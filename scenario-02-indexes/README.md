# System Design: Scenario 2 — Indexes and Slow Queries

A hands-on exercise in database performance for entry-level engineers.

Three endpoints are getting slow as the database grows. You'll use EXPLAIN ANALYZE to diagnose each one, learn when indexes help and when they don't, and fix only the ones that actually need fixing.

**Concepts:** Database Indexes · Query Planning · Cardinality · EXPLAIN ANALYZE · Composite Indexes  
**Level:** Entry  
**Recommended:** Scenario 1 first, or read the recap in SCENARIO.md  
**Time:** ~45 minutes

---

## Get Started

1. Click the green **Code** button above
2. Select the **Codespaces** tab
3. Click **Create codespace on main**
4. Wait ~2 minutes for the environment to build
5. When VS Code opens, follow **SCENARIO.md**

No installs. No setup. Everything runs in your browser.

---

## What You'll Do

- Read a Node.js e-commerce backend with three slow endpoints
- Use EXPLAIN ANALYZE to see exactly what PostgreSQL is doing
- Add two indexes that genuinely help
- Understand why the third endpoint doesn't need one
- Learn the rule of thumb for when indexes are worth it

---

## Files

```
src/server.js       ← The backend with three slow queries
SCENARIO.md         ← Your guided walkthrough. Start here.
db/schema.sql       ← Database schema — no indexes yet
db/seed.js          ← Creates 1,000 users, 500 products, 100,000 orders
db/fix.sql          ← The solution — two indexes with explanations
scripts/loadtest.js ← Tests all three endpoints
```
