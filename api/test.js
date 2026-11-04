const { test } = require('node:test');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

test('Demo API serves the banking fixture and rejects unsupported requests', async () => {
  const child = spawn(process.execPath, ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: '3107' }, stdio: 'ignore' });
  try {
    let response;
    for (let i = 0; i < 40; i++) {
      try { response = await fetch('http://127.0.0.1:3107/api/account/balance'); break; }
      catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(response, 'server did not start');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.currency, 'BRL');
    assert.equal(body.accountId, 'demo');
    assert.equal(body.balance, 1500);
    assert.match(response.headers.get('content-type'), /^application\/json\b/);

    const statement = await fetch('http://127.0.0.1:3107/api/account/statement');
    assert.equal(statement.status, 200);
    assert.deepEqual(await statement.json(), {
      accountId: 'demo',
      transactions: [{ id: 'tx-001', amount: -25 }, { id: 'tx-002', amount: 100 }],
    });

    const health = await fetch('http://127.0.0.1:3107/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const missing = await fetch('http://127.0.0.1:3107/missing');
    assert.equal(missing.status, 404);
    const unsupported = await fetch('http://127.0.0.1:3107/api/account/balance', { method: 'POST' });
    assert.equal(unsupported.status, 405);
  } finally { child.kill(); }
});
