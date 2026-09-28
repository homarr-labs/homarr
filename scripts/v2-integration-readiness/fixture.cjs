const http = require('node:http');
let delayMs = 0;
const entries = [];
const stats = { time_units: 'hours', top_queried_domains: [], top_clients: [], top_blocked_domains: [], dns_queries: [123], blocked_filtering: [17], replaced_safebrowsing: [], replaced_parental: [], num_dns_queries: 123, num_blocked_filtering: 17, num_replaced_safebrowsing: 0, num_replaced_safesearch: 0, num_replaced_parental: 0, avg_processing_time: 0.001 };
const status = { version: 'fixture', language: 'en', dns_addresses: ['127.0.0.1'], dns_port: 53, http_port: 9077, protection_enabled: true, dhcp_available: false, running: true };
const filtering = { filters: [{ url: 'http://fixture.invalid/filter', name: 'fixture', id: 1, rules_count: 456, enabled: true }] };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/probe/reset') { delayMs = Number(url.searchParams.get('delay')); entries.length = 0; res.end('{}'); return; }
  if (url.pathname === '/probe/entries') { res.end(JSON.stringify(entries)); return; }
  if (url.pathname.endsWith('/v2-readiness-release')) {
    entries.push({path:url.pathname,startEpochMs:Date.now(),delayMs:0,finishEpochMs:Date.now()});
    res.end(JSON.stringify({name:'v2-readiness-release',time:{'1.0.0':new Date().toISOString()},versions:{'1.0.0':{description:'Controlled readiness fixture'}}}));
    return;
  }
  const entry = { path: url.pathname, startEpochMs: Date.now(), delayMs, finishEpochMs: null };
  entries.push(entry);
  const bodies = { '/control/stats': stats, '/control/status': status, '/control/filtering/status': filtering };
  if (!bodies[url.pathname]) { res.statusCode = 404; res.end('{}'); return; }
  setTimeout(() => { entry.finishEpochMs = Date.now(); res.end(JSON.stringify(bodies[url.pathname])); }, delayMs);
}).listen(9077, '127.0.0.1');
