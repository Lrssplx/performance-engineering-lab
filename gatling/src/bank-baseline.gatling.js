// Simulação de leitura da API bancária local, executada pelo runtime do Gatling.
// Os checks abaixo usam os valores fixos retornados pela API de demonstração.
// Primitivas para definir a simulação, a jornada, a carga e suas validações.
import { simulation, scenario, rampUsers, global, details, jsonPath } from '@gatling.io/core';

import { http, status } from '@gatling.io/http';


const users = 50;

const responseTimeBudgetMs = 500;

const protocol = http.baseUrl('http://127.0.0.1:3000')

  .acceptHeader('application/json')

  .warmUp('http://127.0.0.1:3000/health');

const browse = scenario('Read-only banking journey')

  .exec(http('Get balance').get('/api/account/balance').requestTimeout(5).check(
    // Exige sucesso HTTP; falhas de checks também tornam a requisição falha no Gatling.
    status().is(200),
    // Confirma que a resposta pertence à conta da massa de demonstração.
    jsonPath('$.accountId').is('demo'),
    // Confirma a moeda esperada pelo contrato local.
    jsonPath('$.currency').is('BRL'),
    // Valida o saldo como número, permitindo representação com casas decimais.
    jsonPath('$.balance').ofDouble().is(1500),
  ))
 
  .pause(1)
  // Consulta o extrato com timeout de cinco segundos, mesmo se a consulta de saldo falhar.
  .exec(http('Get statement').get('/api/account/statement').requestTimeout(5).check(
    // Exige que a consulta do extrato tenha sucesso HTTP.
    status().is(200),
    // Confirma a conta retornada no extrato.
    jsonPath('$.accountId').is('demo'),
    // Extrai todos os IDs e compara a lista completa, incluindo sua ordem.
    jsonPath('$.transactions[*].id').findAll().is(['tx-001', 'tx-002']),
    // Compara números individualmente: a igualdade de listas no runtime distinguia
    // os tipos numéricos de [-25, 100] e [-25.0, 100.0], gerando falsos erros.
    // A lista de IDs acima também exige exatamente duas transações nessa ordem.
    jsonPath('$.transactions[0].amount').ofDouble().is(-25),
    jsonPath('$.transactions[1].amount').ofDouble().is(100),
  ));

// Ponto de entrada que o Gatling usa para configurar e executar a simulação.
export default simulation((setUp) => {
  // Distribui as 50 chegadas ao longo de 20 segundos em um modelo aberto.
  // Cada usuário percorre a jornada uma vez; o término depende da conclusão das jornadas.
  setUp(browse.injectOpen(rampUsers(users).during(20)))
    // Aplica a configuração HTTP a toda a população desta simulação.
    .protocols(protocol)
    // Gates avaliados sobre os resultados ao final da execução.
    .assertions(
      // Nenhuma requisição pode falhar por erro HTTP, timeout ou check de conteúdo.
      global().failedRequests().count().is(0),
      // Exige uma consulta de saldo por usuário para detectar execuções incompletas.
      details('Get balance').allRequests().count().is(users),
      // Exige também uma consulta de extrato por usuário.
      details('Get statement').allRequests().count().is(users),
      // Limita o percentil 95 do tempo de resposta de saldo ao orçamento definido.
      details('Get balance').responseTime().percentile(95).lte(responseTimeBudgetMs),
      // Avalia o extrato separadamente para que a agregação não oculte sua latência.
      details('Get statement').responseTime().percentile(95).lte(responseTimeBudgetMs),
    );
});
