/**
 * LOAD TEST — Scenario 3: Connection Pooling
 *
 * Hammers three endpoints simultaneously to simulate the real load
 * a job queue system sees: submitting jobs, workers claiming jobs,
 * and the admin dashboard fetching stats.
 *
 * Run: npm run loadtest
 *
 * Watch the Grafana dashboard while this runs.
 * With the broken pool config, the error rate spikes immediately.
 */

const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('='.repeat(60));
console.log('LOAD TEST — Connection Pooling Scenario');
console.log('='.repeat(60));
console.log(`Target: ${BASE_URL}`);
console.log('Connections: 50 concurrent users');
console.log('Duration: 30 seconds');
console.log('Endpoints: POST /jobs · GET /jobs/next · GET /jobs/stats');
console.log('='.repeat(60));
console.log('');

const instance = autocannon(
  {
    url: BASE_URL,
    connections: 50,
    duration: 30,
    timeout: 5,
    requests: [
      {
        method: 'POST',
        path: '/jobs',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'image_resize',
          payload: { user_id: 1, resource_id: 42 },
          priority: 1,
        }),
      },
      {
        method: 'GET',
        path: '/jobs/next',
      },
      {
        method: 'GET',
        path: '/jobs/stats',
      },
    ],
  },
  (err, results) => {
    if (err) {
      console.error('Load test error:', err);
      return;
    }

    const total = results.requests.total;
    const non2xx = results['non2xx'] || 0;
    const successRate = total > 0 ? (((total - non2xx) / total) * 100).toFixed(1) : 0;

    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Requests completed:  ${total}`);
    console.log(`Successful (2xx):    ${total - non2xx}`);
    console.log(`Failed (non-2xx):    ${non2xx}`);
    console.log(`Success rate:        ${successRate}%`);
    console.log(`Timeouts:            ${results.timeouts}`);
    console.log('');
    console.log('Response times:');
    console.log(`  Average:  ${results.latency.average}ms`);
    console.log(`  p50:      ${results.latency.p50}ms`);
    console.log(`  p99:      ${results.latency.p99}ms`);
    console.log(`  Max:      ${results.latency.max}ms`);
    console.log('');
    console.log(`Errors/sec (peak):   ${results.errors}`);
    console.log('');

    if (non2xx > total * 0.1 || results.latency.p99 > 2000) {
      console.log('🔴 The pool is failing under this load.');
      console.log(`   ${non2xx} out of ${total} requests failed.`);
      console.log('   Open server.js and look at the pool configuration.');
    } else if (non2xx > 0 || results.latency.p99 > 500) {
      console.log('🟡 Degrading under load. Some requests are timing out.');
    } else {
      console.log('🟢 Looking good! The pool fix is working.');
    }
  },
);

autocannon.track(instance, { renderProgressBar: true });
