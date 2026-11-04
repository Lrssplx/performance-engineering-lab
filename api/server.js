const http = require('node:http');
const { performance } = require('node:perf_hooks');
const port = Number(process.env.PORT || 3000);
let inflight = 0;
const metrics = { requests: 0, errors: 0, durationSumMs: 0 };
const send = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req, res) => {
  const start = performance.now();
  inflight += 1;
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
    if (path === '/health') return send(res, 200, { status: 'ok' });
    if (path === '/metrics') return send(res, 200, { ...metrics, inflight });
    if (path === '/api/account/balance') {
      await new Promise(r => setTimeout(r, 25));
      return send(res, 200, { accountId: 'demo', currency: 'BRL', balance: 1500.00 });
    }
    if (path === '/api/account/statement') {
      await new Promise(r => setTimeout(r, 55));
      return send(res, 200, { accountId: 'demo', transactions: [{ id: 'tx-001', amount: -25.00 }, { id: 'tx-002', amount: 100.00 }] });
    }
    if (path === '/api/account/slow') {
      await new Promise(r => setTimeout(r, 600));
      return send(res, 200, { message: 'intentional latency demonstration' });
    }
    return send(res, 404, { error: 'not_found' });
  } catch (err) {
    metrics.errors += 1;
    return send(res, 500, { error: 'internal_error' });
  } finally {
    inflight -= 1;
    metrics.requests += 1;
    metrics.durationSumMs += performance.now() - start;
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Demo API at http://127.0.0.1:${port}`));
