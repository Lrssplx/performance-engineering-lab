// OpenText Performance Engineering for Developers (DevWeb runtime), not Node.js.
// The script executes read-only requests against the local API.
load.action('ReadOnlyBankingJourney', async function () {
  const balanceRequest = new load.WebRequest({
    url: 'http://127.0.0.1:3000/api/account/balance',
    method: 'GET',
    returnBody: true
  });
  const balance = await balanceRequest.send();
  if (balance.status !== 200) throw new Error('Balance endpoint returned HTTP ' + balance.status);

  const statementRequest = new load.WebRequest({
    url: 'http://127.0.0.1:3000/api/account/statement',
    method: 'GET',
    returnBody: true
  });
  const statement = await statementRequest.send();
  if (statement.status !== 200) throw new Error('Statement endpoint returned HTTP ' + statement.status);
});
