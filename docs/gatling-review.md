# Revisão Gatling — 2026-11-04

## Estrutura e correções atuais

A fonte executável é `gatling/src/bank-baseline.gatling.js`. O projeto possui `package.json` e lockfile próprios em `gatling/`; não é mais necessário copiar a simulação para um starter externo.

Os relatórios `jssimulation-20261104134557859` e `jssimulation-20261104134740514` mostraram falha em todas as consultas de extrato: a comparação de listas rejeitou os valores esperados `[-25, 100]` diante de `[-25.0, 100.0]`. O check anterior introduzia uma reprovação indevida para a massa numérica da API.

A correção compara cada `amount` por um JSONPath escalar com `ofDouble().is(...)`, evitando a comparação entre listas com representações numéricas diferentes. O check da lista completa de IDs permanece para exigir duas transações e sua ordem. O saldo, os IDs e os valores continuam vinculados exclusivamente à massa fixa de `api/server.js`.

O comando `npm test` do projeto Gatling agora compila a simulação, substituindo o placeholder que sempre falhava. `npm run perf` compila e executa `bank-baseline` de forma não interativa. README atualizado para a estrutura real.

## Perfil e quality gates

São 50 chegadas em 20 segundos (média planejada de 2,5 chegadas/s), uma jornada de saldo e extrato por usuário, com pausa de um segundo. Não são 50 usuários simultâneos. O término depende da conclusão das jornadas.

Gates preservados: zero falhas, 50 requisições por endpoint e p95 por endpoint <= 500 ms. Esse limite é um orçamento didático, não um SLO obtido em produção. Timeout por requisição: cinco segundos. O warm-up HTTP usa `/health` local; não substitui uma fase de aquecimento da aplicação.

Não foram adicionados gates arbitrários de p99 ou throughput. O p99 precisa de amostragem maior e de objetivo documentado; o throughput deve ser avaliado em uma janela sustentada e distinguir operações bem-sucedidas de requisições totais.

## Validação da correção

- Teste funcional da API: um teste aprovado, incluindo saldo, extrato, health e rejeições 404/405.
- Sintaxe JavaScript do cenário: aprovada.
- `npm.cmd test` em `gatling/`: build aprovado. A tentativa no sandbox encontrou restrição de leitura do esbuild; a execução com liberação de acesso passou sem alteração de dependências.
- `npm.cmd run perf --prefix gatling`: execução real concluída com código zero e cinco assertions aprovadas.
- Relatório: `gatling/target/gatling/jssimulation-20261104140202871/index.html`.
- Resultados dessa execução local: 100 requisições, 100 OK, zero KO; 50 requisições por endpoint. p95 de saldo: 42 ms; p95 de extrato: 71 ms. Global: p95 71 ms, p99 72 ms e throughput médio 4,76 req/s, conforme saída do Gatling.

Esses resultados validam a correção neste perfil e ambiente. Não representam capacidade máxima, SLO de produção ou conclusão estatística sobre a cauda de latência.

## CI/CD

O workflow `.github/workflows/gatling.yml` usa Windows e Node.js 24, instala dependências com `npm ci`, executa o teste funcional da API, compila a simulação e inicia uma instância local da API. Aguarda `/health` com prazo limitado, verifica saída antecipada do processo e propaga o código de erro do Gatling. A API é encerrada no bloco `finally`. Relatórios e logs são publicados mesmo em falha.

O workflow foi adicionado, mas não foi executado no GitHub Actions nesta sessão. O primeiro uso do runtime requer acesso ao download oficial. O cache npm não inclui o bundle Gatling. As assertions já existentes são os gates do smoke; não há retry automático que oculte reprovações.

## Limitações e próximos passos

- A API é uma demonstração sem autenticação, banco ou integrações, com atrasos artificiais. Não foram criados endpoints novos.
- `/balance` e `/statement` estão na jornada; `/health` é usado no warm-up e na prontidão do CI. `/slow` deve ser avaliado em experimento separado; `/metrics` não é coletado pelo cenário.
- `/metrics` não oferece histogramas/percentis e seu contador `errors` contabiliza exceções, não todos os HTTP 4xx.
- Uma conta fixa, duas leituras e 50 amostras por endpoint limitam a representatividade. Mudanças legítimas na massa exigem revisão dos checks exatos.
- Gerador e API locais podem disputar recursos; runners compartilhados podem variar. Definir ambiente controlado antes de impor gates mais estritos.
- Manter este perfil como smoke. Para evolução, definir workload fundamentado, aquecimento, patamar sustentado, duração e volume suficientes, além de metas por operação para p95/p99, erro e throughput de sucesso.
