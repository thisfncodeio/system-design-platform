/**
 * LOAD TEST — Scenario 2: Indexes and Slow Queries
 *
 * Tests three read endpoints under concurrent load.
 *
 * Run: npm run loadtest
 */

const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTest(label, url, connections = 50, duration = 20) {
  return new Promise((resolve) => {
    console.log(`\nTesting: ${label}`);
    console.log(`URL: ${url}`);
    console.log('-'.repeat(50));

    const instance = autocannon({
      url,
      connections,
      duration,
      timeout: 10,
    }, (err, results) => {
      if (err) { console.error(err); resolve(null); return; }

      const total = results.requests.total;
      const non2xx = results['non2xx'] || 0;
      const successRate = total > 0 ? (((total - non2xx) / total) * 100).toFixed(1) : 0;

      console.log(`Success rate:  ${successRate}%`);
      console.log(`Req/sec:       ${results.requests.average}`);
      console.log(`Avg latency:   ${results.latency.average}ms`);
      console.log(`p99 latency:   ${results.latency.p99}ms`);
      console.log(`Failed:        ${non2xx}`);

      if (results.latency.p99 > 1000 || non2xx > total * 0.05) {
        console.log('🔴 This endpoint is struggling.');
      } else if (results.latency.p99 > 300) {
        console.log('🟡 Slow but functional. Could be better.');
      } else {
        console.log('🟢 Healthy.');
      }

      resolve({ label, successRate, avg: results.latency.average, p99: results.latency.p99, non2xx });
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  console.log('='.repeat(50));
  console.log('LOAD TEST — Scenario 2: Indexes and Slow Queries');
  console.log('='.repeat(50));

  // Pick a random user_id between 1 and 1000
  const userId = Math.floor(Math.random() * 1000) + 1;

  const results = [];

  results.push(await runTest(
    'GET /orders?user_id',
    `${BASE_URL}/orders?user_id=${userId}`
  ));

  results.push(await runTest(
    'GET /products?category&price',
    `${BASE_URL}/products?category=electronics&min_price=100&max_price=500`
  ));

  results.push(await runTest(
    'GET /orders/summary?status',
    `${BASE_URL}/orders/summary?status=pending`
  ));

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log('Endpoint                          | p99    | Healthy?');
  console.log('-'.repeat(50));
  results.forEach(r => {
    if (!r) return;
    const status = r.p99 > 1000 ? '🔴' : r.p99 > 300 ? '🟡' : '🟢';
    console.log(`${r.label.padEnd(34)}| ${String(r.p99 + 'ms').padEnd(7)}| ${status}`);
  });
  console.log('\nNow open SCENARIO.md to diagnose why each endpoint behaves differently.');
}

main();
