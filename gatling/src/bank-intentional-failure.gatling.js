import { simulation, scenario, atOnceUsers, global, jsonPath } from '@gatling.io/core';
import { http, status } from '@gatling.io/http';

// Exemplo didático: a API retorna BRL, mas este check exige USD de propósito.
// Execute separadamente com npm run perf:fail; o resultado esperado é reprovação.
const protocol = http.baseUrl('http://127.0.0.1:3000')
  .acceptHeader('application/json');

const intentionalFailure = scenario('Intentional currency check failure')
  .exec(http('Get balance - intentional failure')
    .get('/api/account/balance')
    .requestTimeout(5)
    .check(
      status().is(200),
      jsonPath('$.currency').is('USD'),
    ));

export default simulation((setUp) => {
  setUp(intentionalFailure.injectOpen(atOnceUsers(1)))
    .protocols(protocol)
    // Mantém o gate de zero falhas para demonstrar também a saída com erro do CLI.
    .assertions(global().failedRequests().count().is(0));
});
