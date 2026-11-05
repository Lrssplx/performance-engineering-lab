# Performance Engineering Lab | Gatling, OpenText DevWeb e NeoLoad

Laboratório educacional de performance de APIs, com foco em modelagem de carga, SLIs/SLOs, resultados reproduzíveis e comparação de ferramentas. **Não há resultados de performance alegados sem uma execução real.**

## Arquitetura

```
Gatling / OpenText DevWeb / NeoLoad
              |
              v
  Demo Banking API (Node.js, local)
              |
              v
   Logs, métricas e relatórios
```

## Endpoints

- `GET /health`: disponibilidade
- `GET /api/account/balance`: consulta simulada com latência artificial de ~25 ms
- `GET /api/account/statement`: consulta simulada com latência artificial de ~55 ms
- `GET /api/account/slow`: demonstra latência artificial de ~600 ms
- `GET /metrics`: contadores básicos da API, não substitui APM

**Atenção:** latências são artificiais para fins didáticos e não representam um sistema bancário real. Este laboratório não realiza transações financeiras nem persiste dados pessoais.

## 1. Executar API no Windows/PowerShell

```powershell
cd api
npm.cmd test
npm.cmd start
```

Em outro terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/api/account/balance
```

## 2. Gatling

O projeto JavaScript está em `gatling/`, e a simulação fica em `gatling/src/bank-baseline.gatling.js`. Use Node.js 24 e npm 11. Com a API rodando em outro terminal:

```powershell
cd gatling
npm.cmd ci
npm.cmd test
npm.cmd run perf
```

`npm test` compila a simulação; `npm run perf` compila e executa explicitamente `bank-baseline`, sem seleção interativa. O runtime Gatling é baixado no primeiro uso e requer acesso à rede. O cache padrão fica em `<usuário>/.gatling`; para usar um caminho dentro do projeto:

```powershell
npx.cmd gatling build --gatling-home target/gatling-home
npm.cmd run perf -- --gatling-home target/gatling-home
```

Perfil aberto: 50 chegadas em 20 segundos, uma jornada por usuário e pausa de 1 segundo entre saldo e extrato. Não representa 50 usuários simultâneos nem carga sustentada. Assertions: zero falhas, 50 requisições por operação e p95 por operação até 500 ms (orçamento didático, não SLO medido). O timeout de cada requisição é de 5 segundos. Os checks conferem a massa fixa da API. Relatórios: `gatling/target/gatling/`.

O workflow `.github/workflows/gatling.yml` instala dependências pelo lockfile, testa a API, compila e executa a simulação contra a API local. Uma falha do Gatling reprova o job. Relatórios e logs são preservados mesmo em falha. Consulte a [revisão e as evidências](docs/gatling-review.md).

## 3. OpenText Performance Engineering for Developers (DevWeb)

O script `loadrunner-devweb/main.js` usa o runtime gratuito DevWeb do ecossistema OpenText. Ele **não** é executado com `node main.js`. Instale o runtime oficial, abra o script no ambiente DevWeb/VuGen e execute um teste funcional simples antes de configurar carga. É possível que o ambiente exija arquivos de configuração adicionais gerados pelo próprio runtime.

[Documentação oficial DevWeb](https://admhelp.microfocus.com/lrd/en/26.1/help/Content/DevWeb/DW-protocol_intro.htm)

## 4. Tricentis NeoLoad

`neoload/default.yaml` contém um exemplo de **NeoLoad as-code**, seguindo o esquema documentado pela Tricentis. Use NeoLoad Controller ou NeoLoad Web com uma licença disponível. Configuração: 5 VUs simultâneos por 1 minuto, 100% consultas, pausa de 1 segundo e limiares de SLA didáticos.

[Documentação NeoLoad as-code](https://docs.tricentis.com/neoload-2026.2/en-us/content/user_guides.htm/neoload_as_code/yaml_format.htm)

## Como comparar corretamente

Não compare resultados de cargas diferentes. Padronize hardware, condição inicial da API, duração, carga, pausas, dados, limites da licença e regras de erro. Alguns mecanismos modelam taxa de chegada e outros concorrência constante, então uma equivalência numérica entre VUs não garante a mesma taxa de chegada.

| Execução | Ferramenta | Perfil de carga | RPS medido | p95 | p99 | Erro % | Observações |
|---|---|---|---|---|---|---|---|
| 1 | Gatling | ramp-up | Não executado | - | - | - | Registrar resultado real |
| 2 | DevWeb | A definir | Não executado | - | - | - | Registrar resultado real |
| 3 | NeoLoad | 5 VUs / 1m | Não executado | - | - | - | Registrar resultado real |

## Evoluções

1. Definir um workload realista a partir de dados de produção anonimizados.
2. Criar baseline sob ambiente estável.
3. Instrumentar a API com Prometheus, OpenTelemetry e Grafana.
4. Criar gate de performance baseado em objetivos documentados.
5. Incluir experimentos controlados de degradação, sem testes de carga contra sistemas sem autorização.

## Limitações

- Exemplos Gatling/DevWeb/NeoLoad devem ser validados nos runtimes oficiais; a API Node foi testada localmente.
- As ferramentas possuem diferenças de modelo de carga, licença e disponibilidade de relatórios.
- Use apenas `127.0.0.1` e sistemas de teste sob sua responsabilidade.
# performance-engineering-lab
