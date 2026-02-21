const autocannon = require('autocannon');

const instance = autocannon({
  url: 'http://localhost:3000',
  connections: 50,
  duration: 30,
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
}, (err, result) => {
  if (err) console.error(err);
});

autocannon.track(instance, { renderProgressBar: true });
