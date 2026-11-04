# Revisão Gatling — 2026-11-04

## Achados e correções

- O cenário verificava somente HTTP 200. Um corpo incorreto passava. Foram adicionados JSONPaths ancorados em `accountId`, `currency`, `balance` e nas listas de IDs e valores de `transactions`. Números usam `ofDouble()` para preservar valores decimais. As listas completas evitam aceitar apenas a primeira transação correta. Não há seletores CSS/XPath neste teste de API.
- Os valores exatos refletem exclusivamente a massa fixa em `api/server.js`. Para uma API dinâmica, substituir esses valores por dados esperados do feeder ou por regras de contrato; não reutilizar essas expectativas como regras bancárias gerais.
- Já existia uma assertion global de erros abaixo de 1%; não havia ausência total de assertions. Com 20 requisições previstas, uma falha já corresponde a 5%. Zero falhas explicita a mesma exigência nesse perfil. Contagens por operação agora detectam jornadas incompletas.
- Faltavam limites de tempo de resposta. Foram adicionados p95 <= 500 ms por operação, como orçamento didático de regressão, sem alegar que foi atingido. O percentil explícito não depende da configuração de `percentile3`. Timeout de 5 segundos limita a espera de cada requisição; não substitui a assertion de latência.
- O warm-up HTTP agora aponta para `/health` local, evitando a URL externa padrão do Gatling. Isso não equivale a uma fase de aquecimento representativa da aplicação.
- Removido o import `exec` sem uso. Estrutura, endpoints, pausa e injeção foram preservados. As duas consultas continuam sendo executadas mesmo se a primeira falhar, pois são leituras independentes; não foram adicionados retries que poderiam ocultar erros.
- README atualizado com cópia explícita do cenário para `src`, build e cache do Gatling dentro de `target`. Os comandos `npm.cmd`/`npx.cmd` funcionam no PowerShell sem alterar a política de execução de scripts.
- Teste funcional da API ampliado para validar a massa usada nos checks, o health e os status 404/405. Nenhuma alteração no servidor foi necessária.

## Modelo de carga e riscos restantes

`rampUsers(10).during(20)` injeta dez usuários no total, com taxa média planejada de 0,5 chegada/s durante a injeção. Cada um faz duas consultas, com pausa de um segundo. Esses valores descrevem configuração, não throughput medido. O teste termina depois que as jornadas terminam, não necessariamente aos 20 segundos.

Esse perfil serve como smoke/baseline didático. Dez amostras por endpoint não sustentam conclusões robustas sobre p95/p99, capacidade ou estabilidade. Uma etapa futura deve definir taxa de chegada e duração com dados de uso, incluir aquecimento e patamar sustentado e separar testes de estresse. Não foi escolhida carga maior arbitrariamente. O perfil NeoLoad de cinco VUs por um minuto não é equivalente; não comparar números diretamente.

A API tem atrasos artificiais, uma única conta e nenhuma persistência ou integração. O endpoint `/slow` permanece fora da jornada por não fazer parte do fluxo existente. O gerador e o servidor na mesma máquina disputam recursos. `/metrics` registra duração agregada, não percentis, e seu contador `errors` não abrange todos os HTTP 4xx. Não usar essas métricas como substitutas dos resultados Gatling.

## Validações realizadas e limitações

- Node.js v24.13.0 e npm 11.6.2 identificados.
- `npm.cmd test --prefix api`: passou, um teste funcional com verificações de saldo, extrato, health e rejeições HTTP.
- `Get-Content -Raw gatling/bank-baseline.gatling.js | node --input-type=module --check`: passou. `node --check` no servidor e no teste também passou. Isso valida sintaxe, não a execução da DSL Gatling.
- Na análise inicial, o starter disponível usava SDK/CLI 3.16.3. As assinaturas das assertions, `ofDouble`, `warmUp` e `requestTimeout` foram consultadas nos arquivos instalados.
- O build inicial falhou com EPERM ao criar o cache padrão fora do workspace. A tentativa com `--gatling-home target/gatling-home` superou esse caminho, mas o download do bundle no GitHub falhou com `connect EACCES` na porta 443. Essas tentativas ocorreram antes das alterações no cenário e não validam a versão final.
- Após a interrupção da sessão, `gatling-js-demo` já não estava no workspace. Não foi recriado nem substituído por outro projeto. O build final e a execução Gatling ficam pendentes da instalação do starter e disponibilidade do runtime. Não houve relatório de carga, RPS, latências ou taxa de erros medidos.
- O workspace não contém repositório Git utilizável (`git status` retornou “not a git repository”); não foi possível validar diff via Git.

## Reexecução

Seguir os comandos da seção Gatling do README, mantendo a API ativa em outro terminal. O primeiro build requer acesso ao bundle oficial do runtime. Depois de qualquer edição, copiar novamente o arquivo de `gatling` para `src`. Executar somente `bank-baseline`; o exemplo original do starter consulta uma API externa e não integra este laboratório.

Documentação oficial de referência: [checks](https://docs.gatling.io/concepts/checks/) e [assertions](https://docs.gatling.io/concepts/assertions/). A compilação completa e uma execução real ainda são necessárias para confirmar os checks e gates no runtime.
