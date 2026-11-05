# Performance Engineering Lab

Laboratório educacional de testes de performance de APIs com **Gatling, OpenText DevWeb e Tricentis NeoLoad**. O projeto reúne uma API bancária local, exemplos de carga e um smoke de performance automatizado no GitHub Actions.

O objetivo é praticar modelagem de carga, validação de respostas e interpretação de métricas com execuções reproduzíveis. A API usa dados fixos e atrasos artificiais; não realiza transações financeiras nem persiste dados pessoais.

## O que está disponível

| Componente | Papel no laboratório | Validação registrada |
|---|---|---|
| API Node.js | Consultas de saldo e extrato, health e métricas básicas | Teste funcional local |
| Gatling JavaScript | Jornada de leitura com checks e critérios de aprovação | Baseline executado localmente; evidências em [revisão Gatling](docs/gatling-review.md) |
| Gatling: falha intencional | Demonstra reprovação por conteúdo incorreto | Exemplo separado do baseline e do CI |
| OpenText DevWeb | Exemplo de jornada de leitura | Requer validação no runtime oficial |
| NeoLoad as-code | Exemplo de carga com concorrência constante | Requer validação no runtime oficial |

```text
Gatling / DevWeb / NeoLoad
            |
            v
Demo Banking API — http://127.0.0.1:3000
            |
            v
Logs, métricas e relatórios
```

## Pré-requisitos

- Para reproduzir o ambiente do CI: **Node.js 24 e npm 11**.
- Porta local `3000` disponível.
- Acesso à rede para instalar as dependências e baixar o runtime Gatling no primeiro uso.
- DevWeb e NeoLoad exigem seus próprios runtimes; consulte as seções específicas abaixo.

Os comandos a seguir partem da raiz do repositório e usam Windows/PowerShell. Em shells como Bash, substitua `npm.cmd` por `npm` e `npx.cmd` por `npx`.

## Início rápido: API e Gatling

### 1. Testar e iniciar a API

A API usa apenas módulos nativos do Node.js e não precisa de instalação de dependências.

```powershell
npm.cmd test --prefix api
npm.cmd start --prefix api
```

Mantenha esse terminal aberto. Em outro terminal, na raiz do repositório, confira a disponibilidade:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/api/account/balance
```

O health deve retornar `status: ok`; o saldo deve conter a conta `demo`, moeda `BRL` e valor `1500`. Para encerrar a API, use `Ctrl+C` no terminal em que ela foi iniciada.

### 2. Instalar, compilar e executar o baseline

```powershell
npm.cmd ci --prefix gatling
npm.cmd test --prefix gatling
npm.cmd run perf --prefix gatling
```

`npm test` no projeto Gatling compila as simulações; não executa carga. `npm run perf` compila e executa somente `bank-baseline`, sem seleção interativa.

Ao final, confira as cinco assertions no console e abra o `index.html` da execução em `gatling/target/gatling/<execução>/`. Uma assertion reprovada faz o comando terminar com código diferente de zero.

### 3. Demonstrar uma falha de conteúdo

Com a API ainda em execução:

```powershell
npm.cmd run perf:fail --prefix gatling
```

A simulação `bank-intentional-failure` faz uma consulta de saldo e exige moeda `USD`, embora a API retorne `BRL`. O resultado esperado é uma requisição **KO**, reprovação da assertion de zero falhas e código de saída diferente de zero. Confira a comparação da moeda no console e o relatório gerado.

Esse exemplo é executado separadamente e não faz parte do workflow de CI. Conexão recusada ou timeout não demonstram a falha de conteúdo: verifique primeiro a disponibilidade da API.

## Perfil de carga e critérios do Gatling

A jornada consulta saldo, espera um segundo e consulta extrato. Cada usuário executa a jornada uma vez.

| Configuração | Baseline |
|---|---|
| Modelo | Aberto: 50 chegadas distribuídas em 20 segundos |
| Taxa média planejada | 2,5 chegadas/s durante a injeção |
| Requisições esperadas | 50 de saldo + 50 de extrato |
| Timeout | 5 segundos por requisição |
| Checks | HTTP 200 e conteúdo da massa fixa: conta, moeda, saldo, IDs e valores do extrato |
| Critérios de aprovação | Zero falhas; 50 requisições por operação; p95 de cada operação ≤ 500 ms |

**50 chegadas não significam 50 usuários simultâneos.** O término depende da conclusão das jornadas, e esse perfil não representa carga sustentada. O warm-up HTTP usa `/health`, mas não substitui uma fase de aquecimento da aplicação.

O limite de 500 ms é um orçamento didático, não um SLO de produção. Com 50 amostras por operação, o cenário serve como smoke; não demonstra capacidade máxima nem sustenta conclusões sobre p99.

A [revisão Gatling](docs/gatling-review.md) registra a execução local de 4 de novembro de 2026: 100 requisições OK, zero KO e cinco assertions aprovadas. Esses resultados se aplicam ao perfil e ambiente documentados; não constituem uma comparação entre ferramentas.

### Cache do runtime

O cache padrão do Gatling fica em `<usuário>/.gatling`. Para usar um diretório dentro do projeto, execute a partir da raiz:

```powershell
Set-Location gatling
npx.cmd gatling build --gatling-home target/gatling-home
npm.cmd run perf -- --gatling-home target/gatling-home
Set-Location ..
```

## API de demonstração

A API escuta em `127.0.0.1:3000` e aceita apenas requisições `GET`.

| Endpoint | Resposta ou finalidade | Atraso artificial |
|---|---|---|
| `/health` | Disponibilidade: `status: ok` | Sem atraso configurado |
| `/api/account/balance` | Conta `demo`, moeda `BRL`, saldo `1500` | ~25 ms |
| `/api/account/statement` | Conta `demo`, transações `tx-001` (-25) e `tx-002` (100) | ~55 ms |
| `/api/account/slow` | Demonstração de latência elevada | ~600 ms |
| `/metrics` | `requests`, `errors`, `durationSumMs` e `inflight` | Sem atraso configurado |

Os atrasos não são tempos de resposta garantidos. `/slow` não integra o baseline, e `/metrics` não é coletado pelo cenário. As métricas são locais ao processo: não oferecem histogramas ou percentis; `errors` contabiliza exceções, não todos os HTTP 4xx.

## Integração contínua

O workflow [Gatling smoke](.github/workflows/gatling.yml) roda em pushes, pull requests e acionamento manual. Em um runner Windows com Node.js 24, ele:

1. Instala as dependências Gatling pelo lockfile com `npm ci`.
2. Executa o teste funcional da API e compila as simulações.
3. Inicia a API local e aguarda `/health` com prazo limitado.
4. Executa o baseline e reprova o job se o Gatling retornar erro.
5. Encerra a API e preserva relatórios e logs, inclusive em falha.

Os arquivos ficam no artefato `gatling-smoke-results` da execução no GitHub Actions. A execução local documentada não comprova aprovação do workflow remoto; consulte o resultado do job para essa confirmação.

## OpenText DevWeb

O exemplo [loadrunner-devweb/main.js](loadrunner-devweb/main.js) consulta saldo e extrato e valida o status HTTP 200. Ele usa a API do runtime DevWeb e **não deve ser executado com `node main.js`**.

Com a API local em execução, abra o script no ambiente DevWeb/VuGen e valide uma execução funcional antes de configurar carga. O runtime pode exigir arquivos adicionais de configuração. O exemplo não define um perfil de carga equivalente ao Gatling.

## Tricentis NeoLoad

O arquivo [neoload/default.yaml](neoload/default.yaml) contém um exemplo de NeoLoad as-code para uso com NeoLoad Controller ou NeoLoad Web e uma licença disponível.

A configuração define 5 usuários simultâneos durante um minuto, com consultas de saldo e extrato separadas por uma pausa de um segundo. Os limiares didáticos consideram taxa de erro e tempo médio de resposta; são diferentes dos critérios de p95 do Gatling. Valide o arquivo no runtime antes de interpretar resultados.

## Como comparar as ferramentas

Padronize ambiente, hardware, estado inicial da API, duração, aquecimento, pausas, dados e regras de erro. Registre também versões, limites de licença e se o gerador disputa recursos com a API.

Os exemplos atuais têm perfis diferentes. Um modelo aberto controla chegadas; um modelo de concorrência constante mantém usuários simultâneos. A mesma quantidade de usuários não garante a mesma taxa de requisições.

Ao executar um experimento comparável, registre:

| Ferramenta e versão | Perfil e duração | Requisições OK/KO | RPS de sucesso | p95 por operação | p99 por operação | Ambiente e relatório |
|---|---|---|---|---|---|---|
| Preencher após a execução | — | — | — | — | — | — |

Não preencha métricas estimadas como se fossem resultados medidos. Avalie p99 apenas com volume de amostras e objetivos adequados.

## Estrutura do repositório

```text
api/                     API local e teste funcional
gatling/                 Projeto JavaScript, scripts npm e lockfile
gatling/src/             Baseline e exemplo de falha intencional
loadrunner-devweb/       Jornada de leitura para DevWeb
neoload/                 Configuração NeoLoad as-code
docs/gatling-review.md   Revisão técnica e evidências locais
.github/workflows/       Automação do smoke Gatling
```

Relatórios, logs, dependências e diretórios `target/` são ignorados pelo Git. Preserve as evidências necessárias fora desses diretórios ou como artefatos do CI.

## Solução de problemas

| Sintoma | O que verificar |
|---|---|
| Conexão recusada ou timeout | Inicie a API e consulte `/health`; os cenários apontam para `127.0.0.1:3000`. |
| Porta 3000 ocupada | Encerre a instância anterior ou libere a porta antes de iniciar a API. |
| Falha no primeiro download do Gatling | Verifique acesso à rede e permissão de escrita no diretório de cache. |
| Check de conteúdo reprovado | Compare a resposta com a massa fixa em `api/server.js`; mudanças nos dados exigem revisão dos checks. |
| p95 acima de 500 ms | Consulte o relatório por operação e investigue recursos do ambiente e concorrência com o gerador. |
| `perf:fail` termina com erro | É esperado quando o check de moeda detecta `BRL` em vez de `USD`. |

## Limitações e próximos passos

A API não possui autenticação, banco de dados ou integrações. Uma conta fixa e duas consultas limitam a representatividade; os atrasos artificiais não reproduzem um sistema bancário real. Execute os exemplos apenas localmente ou em sistemas de teste sob sua responsabilidade e com autorização.

Para evoluir o laboratório:

1. Definir um workload fundamentado em dados anonimizados e objetivos por operação.
2. Separar aquecimento, patamar sustentado e experimentos de degradação.
3. Estabelecer um ambiente controlado para gerar um baseline reproduzível.
4. Instrumentar a API e correlacionar latência, erros e uso de recursos.
5. Definir gates de performance com volume de amostras e metas documentadas.
