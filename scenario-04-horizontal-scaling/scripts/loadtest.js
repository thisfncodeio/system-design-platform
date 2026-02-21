/**
 * LOAD TEST — Scenario 4: Horizontal Scaling
 *
 * Hammers all three main endpoints simultaneously to simulate
 * realistic traffic: browsing products, viewing individual items,
 * and generating reports.
 *
 * Run: npm run loadtest
 *
 * Watch the Grafana dashboard while this runs.
 * What happens to req/sec and latency as connections climb?
 */

const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('='.repeat(60));
console.log('LOAD TEST — Horizontal Scaling Scenario');
console.log('='.repeat(60));
console.log(`Target: ${BASE_URL}`);
console.log('Connections: 100 concurrent users');
console.log('Duration: 30 seconds');
console.log('');
console.log('Watch the dashboard while this runs.');
console.log('Note the req/sec ceiling. Can one server break through it?');
console.log('='.repeat(60));
console.log('');

const instance = autocannon({
  url: BASE_URL,
  connections: 100,
  duration: 30,
  timeout: 10,
  requests: [
    {
      method: 'GET',
      path: '/products?category=electronics',
    },
    {
      method: 'GET',
      path: '/products/1',
    },
    {
      method: 'GET',
      path: '/report',
    },
  ],
}, (err, results) => {
  if (err) {
    console.error('Load test error:', err);
    return;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Requests completed:  ${results.requests.total}`);
  console.log(`Requests/sec (avg):  ${results.requests.average}`);
  console.log(`Errors:              ${results.errors}`);
  console.log(`Timeouts:            ${results.timeouts}`);
  console.log('');
  console.log('Response times:');
  console.log(`  Average:  ${results.latency.average}ms`);
  console.log(`  p50:      ${results.latency.p50}ms`);
  console.log(`  p99:      ${results.latency.p99}ms`);
  console.log(`  Max:      ${results.latency.max}ms`);
  console.log('');

  if (results.latency.p99 > 2000 || results.errors > 10) {
    console.log('🔴 The single server is at its limit.');
    console.log('   No amount of tuning will fix this — it needs more servers.');
  } else if (results.latency.p99 > 500) {
    console.log('🟡 Getting close to the ceiling. Try increasing connections.');
  } else {
    console.log('🟢 Handling the load. Try more connections to find the ceiling.');
  }
});

autocannon.track(instance, { renderProgressBar: true });
