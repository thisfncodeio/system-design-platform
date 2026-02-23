const autocannon = require("autocannon");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log("=".repeat(60));
console.log("LOAD TEST — Single Server Scenario");
console.log("=".repeat(60));
console.log(`Target: ${BASE_URL}/feed`);
console.log("Connections: 200 concurrent users");
console.log("Duration: 30 seconds");
console.log("=".repeat(60));
console.log("");

const instance = autocannon(
  {
    url: `${BASE_URL}/feed`,
    connections: 200,
    duration: 30,
    timeout: 5,
  },
  (err, results) => {
    if (err) {
      console.error(err);
      return;
    }

    const total = results.requests.total;
    const non2xx = results["non2xx"] || 0;
    const succeeded = total - non2xx;
    const successRate = total > 0 ? ((succeeded / total) * 100).toFixed(1) : 0;

    console.log("");
    console.log("=".repeat(60));
    console.log("RESULTS");
    console.log("=".repeat(60));

    console.log("");
    console.log("  Did requests succeed?");
    console.log(`    ${succeeded} of ${total} requests got a valid response`);
    console.log(`    ${non2xx} failed (server returned an error or timed out)`);
    console.log(`    Success rate: ${successRate}%`);
    console.log(`    Timeouts: ${results.timeouts}`);

    console.log("");
    console.log("  How long did requests take?");
    console.log(`    Avg: ${results.latency.average}ms  — the typical response time`);
    console.log(`    p50: ${results.latency.p50}ms  — half of users waited at least this long`);
    console.log(
      `    p99: ${results.latency.p99}ms  — 1 in 100 users waited this long (the worst experience)`,
    );
    console.log(`    Max: ${results.latency.max}ms  — the slowest single request`);

    console.log("");
    if (non2xx > total * 0.1 || results.latency.p99 > 2000) {
      console.log("  🔴 The system is failing under this load.");
      console.log(`     ${non2xx} out of ${total} requests crashed or timed out.`);
      console.log("     This is what a broken production server looks like.");
      console.log("     Open SCENARIO.md and start diagnosing.");
    } else if (non2xx > 0 || results.latency.p99 > 500) {
      console.log("  🟡 Getting there — still some failures or slow responses.");
      console.log("     Check if both fixes are applied.");
    } else {
      console.log("  🟢 The system is handling the load. Both fixes are working.");
    }
  },
);

autocannon.track(instance, { renderProgressBar: true });
