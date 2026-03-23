const http = require('http');

function triggerJobs() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/internal/trigger-jobs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-request': 'true'
    }
  };

  const req = http.request(options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Failed to trigger jobs: ${res.statusCode}`);
    }
  });

  req.on('error', (err) => {
    console.error('Error triggering jobs:', err);
  });

  req.end();
}

// Trigger jobs every second
setInterval(triggerJobs, 1000);

// Initial trigger
triggerJobs();