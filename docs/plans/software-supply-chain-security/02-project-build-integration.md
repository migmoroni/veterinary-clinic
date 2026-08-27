# Fase 2 — integração ao projeto e build protegido

## Estado e dependência

Proposto. Executar somente após a conclusão e validação de
`01-supply-chain-guard-package.md`.

O protocolo canônico permanece em `../software-supply-chain-security-plan.md`.
Esta fase conecta o guard ao veterinary-clinic e protege aquisição, CI e build;
proteções de runtime e release pertencem às fases 3 e 4.

## Objetivo

Aplicar a ferramenta autocontida a todos os comandos oficiais de
desenvolvimento, CI e build do veterinary-clinic. A integração deve garantir
cooldown de 72 horas antes da aquisição, cache seguro, snapshot imutável e
execução offline do código de terceiros.

Devem permanecer verdadeiras estas propriedades:

- o guard continua copiável e sem imports do produto;
- configuração e decisões do veterinary-clinic ficam em `security/`;
- nenhuma parte do guard, cache ou relatório entra no aplicativo compilado;
- um output só é promovível quando vem do caminho canônico protegido.

## Fora de escopo

- publicar o guard em npm/crates.io ou movê-lo para outro repositório;
- sincronizar automaticamente cópias do guard entre projetos;
- implementar o futuro build operado pela Rails API;
- implementar o boundary de rede do aplicativo, tratado na fase 3;
- assinar/publicar releases ou implantar rotinas periódicas, tratados na fase 4;
- criar migration, compatibilidade ou fluxo de build legado;
- adotar firewall corporativo obrigatório para todas as estações.

O futuro Hub Server/Rails deve chamar o mesmo comando canônico desta fase e
consumir sua decisão/evidência; não deve reimplementar a policy.

## Fronteiras de responsabilidade

| Local | Responsabilidade |
| --- | --- |
| `tools/supply-chain-guard/` | engine e adaptadores genéricos; tratado como cópia vendorizada |
| `security/` | policy, exceções, baseline e IOCs deste produto |
| `.security-cache/` | cache local ignorado pelo Git e não promovível |
| `package.json` e scripts root | wrappers canônicos que invocam o guard |
| workflows/ambiente de build | autoridade de CI, aquisição e isolamento |
| fases 3 e 4 | boundary de runtime, assinatura, publicação e operação |

Mudanças específicas do produto nunca são feitas dentro do guard. Uma
necessidade genericamente útil recebe primeiro contrato e teste no pacote;
configuração concreta continua fora dele.

## Estrutura específica do projeto

```text
security/
  README.md
  policy.json
  exceptions.json
  approved-dependencies.json
  network-policy.json        # contrato preenchido na fase 3
  iocs/
    denylist.json
  reports/                   # ignorado pelo Git
.security-cache/             # ignorado pelo Git
```

`security/policy.json` referencia a versão/digest do guard vendorizado e fixa as
versões finais das referências normativas adotadas. `security/exceptions.json`
é a única fonte canônica de exceções; qualquer representação exigida pelo pnpm
deve corresponder exatamente a ela.

## Baseline, toolchains e registries

1. Regenerar o inventário real de Cargo/pnpm e não copiar contagens históricas.
2. Confirmar todos os targets/features suportados e classificar o alerta atual
   de `rkyv`; remover resíduo pelo Cargo ou atualizar o consumidor somente após
   autorização explícita para mudar dependências.
3. Criar `rust-toolchain.toml` com stable patch exato, componentes e targets.
4. Fixar Node patch LTS e preservar `pnpm@11.22.0` enquanto essa for a versão
   aprovada.
5. Fixar registries autorizados, TLS estrito e reprovar Git/URL/tarball/exotic
   sources fora da policy.
6. Criar `deny.toml`, inicializar `cargo-vet` e fixar por versão/checksum
   `cargo-audit`, `cargo-deny`, `cargo-vet` e geradores de SBOM.
7. Gerar `approved-dependencies.json` somente depois de gate completo e revisão
   humana do estado real.

Instalação de ferramentas ou atualização de dependências não é autorizada apenas
por este plano; durante a execução, respeitar os checkpoints do usuário e da
skill `$validate-workspace`.

## Policy de 72 horas e aquisição

Configurar no `pnpm-workspace.yaml`:

```yaml
minimumReleaseAge: 4320
minimumReleaseAgeStrict: true
minimumReleaseAgeIgnoreMissingTime: false
minimumReleaseAgeExcludePrune: true
trustPolicy: no-downgrade
trustLockfile: false
blockExoticSubdeps: true
```

Preservar `strictDepBuilds: true` e somente os `allowBuilds` necessários.

Para Rust, o guard verifica todas as crates de registry presentes em
`Cargo.lock` antes de qualquer `cargo fetch` protegido. Não confiar apenas no
`min-publish-age` experimental, porque uma versão jovem já adicionada ao
lockfile não pode ser presumida aprovada.

O fluxo obrigatório é:

1. consultar metadata/advisories sem baixar payload;
2. aplicar cooldown de 72 horas a todas as versões diretas/transitivas;
3. alertar correção crítica com `publishedAt`/`eligibleAt`, sem update;
4. aceitar adoção precoce somente por `early-publication` manual e exata;
5. depois da aprovação, liberar `pnpm fetch --frozen-lockfile` e
   `cargo fetch --locked` apenas para registries permitidos;
6. verificar integridade/checksum e materializar bundle imutável.

Severity, `fixed`, dist-tag e metadata de registry nunca criam exceção nem
enfraquecem outro controle. A vulnerabilidade atual pode bloquear mesmo enquanto
a correção permanece em quarentena.

## Comandos oficiais

Adicionar scripts root que chamem o binário vendorizado com paths explícitos:

- `security:gate`;
- `security:scheduled`;
- `security:dependencies`;
- `security:incident`;
- `security:approve-dependencies`;
- `security:release`.

Nesta fase, `security:scheduled` e `security:release` ganham seus contratos e
validações de entrada; sua automação operacional e autoridade de release são
concluídas na fase 4.

Conectar `security:gate` antes de comandos públicos que executem código de
terceiros ou produzam evidência/artefato: dev, check, testes, builds web/Rust,
knowledge build e comandos Tauri/empacotamento.

Não criar flag de bypass nem script rápido alternativo. Cache hit válido reduz o
custo sem mudar a cobertura. Chamadas diretas às ferramentas internas podem ser
usadas para diagnóstico, mas seus outputs não são oficiais nem promovíveis.

Um `pnpm install` comum recebe também a proteção versionada do próprio pnpm. No
Cargo stable, o preflight completo depende do wrapper; impedir fisicamente um
`cargo fetch` bruto na estação exigiria ambiente gerenciado/firewall e não faz
parte da baseline. CI e release, contudo, não oferecem caminho bruto promovível.

## CI, cache e autoridade

1. Criar jobs de PR e mudança de lockfile com versões fixadas.
2. Ignorar cache/evidência fornecido pelo checkout ou PR.
3. Limitar cache local à estação e cache CI à autoridade do workflow.
4. Enquanto não houver assinatura de evidência entre execuções, limitar reuse ao
   próprio job/run.
5. Autenticar evidências CI por workload identity/control plane e verificar
   signer/verifier e raiz allowlisted.
6. Fixar actions por SHA completo, permissões mínimas e nenhum secret em PR.
7. Proteger `security/`, lockfiles e workflows por branch protection/CODEOWNERS
   quando houver revisor independente.

Falha de cache, assinatura, relógio ou fonte externa resulta em nova análise ou
`indeterminate`; nunca em aprovação. Jobs agendados e autoridade específica de
release são concluídos na fase 4.

## Snapshot e build isolado

1. O gate produz manifesto completo e `buildContextDigest`.
2. Congelar snapshot somente leitura do código/configuração aprovado.
3. Materializar bundle de dependências após o preflight de metadata.
4. Compilar/testar usando snapshot e bundle exatos, nunca o workspace vivo.
5. Executar pnpm offline/frozen e Cargo offline/locked.
6. Remover rede, segredos, tokens, SSH agent e filesystem desnecessário da etapa
   que executa lifecycle scripts, proc macros e `build.rs`.
7. Adicionar canários de DNS, socket, loopback, segredo e path externo.
8. Revalidar digests antes/depois do build.
9. Entregar o artefato pronto à fase 4; assinatura/publicação não recompilam
   dependências.

Linux usa imagem fixada por digest e network namespace desabilitado. Windows/MSI
e Android exigem isolamento verificável equivalente antes de receberem a mesma
garantia de release.

## Sequência de execução

1. Confirmar a versão validada da fase 1 e seu digest.
2. Implementar `security/`, policies, exceptions, gitignore e baseline inicial.
3. Fixar toolchains/registries e aplicar configurações pnpm de 72 horas.
4. Resolver/classificar bloqueios reais de dependência com autorização.
5. Conectar comandos root e validar gate/cache local.
6. Criar jobs CI e autoridade própria de evidência.
7. Implementar aquisição, snapshot e build sem rede.
8. Validar o contrato de entrega para runtime e release.

Não avançar enquanto o critério de saída anterior estiver reprovado ou
`indeterminate`.

## Estratégia de testes

- gate obrigatório em todos os scripts oficiais e ausência de bypass;
- cache hit/miss seletivo, fontes temporais, exceção vencida e relógio regredido;
- versão jovem em qualquer lockfile bloqueia antes de request de payload;
- advisory crítico apenas alerta e não altera manifests/locks/exceções;
- `early-publication` exata não libera pacote/versão/checksum vizinhos;
- `cargo audit`, `cargo deny`, `cargo vet` e auditoria pnpm em todos os targets;
- lockfile adulterado, source exótica, integridade ausente e publisher downgrade;
- build script/proc macro/lifecycle fixture sem DNS, socket, segredo ou path
  externo;
- mudança entre gate/build detectada pelo `buildContextDigest`;
- CI rejeita evidência local/forjada e cache poisoning;
- guard, policy, cache e reports ausentes dos bundles produzidos.

## Critérios de aceite

- O guard permanece autocontido e sem código específico do veterinary-clinic.
- Todo comando oficial passa pelo mesmo gate, por recomputação ou evidência
  equivalente.
- Nenhum payload jovem é adquirido antes da decisão de 72 horas.
- Advisory crítico nunca autoriza versão corretiva automaticamente.
- Adoção precoce é manual, exata, justificável e expira.
- Builds oficiais executam terceiros offline, sem segredos e sobre
  snapshot/bundle aprovados.
- Cache local não é autoridade de CI ou de release.
- Guard, cache, policy e relatórios não entram no artefato da aplicação.
- O futuro Rails pode chamar o comando canônico sem duplicar a implementação.

Depois dos testes específicos, executar a skill `$validate-workspace` como gate
geral final da fase. Somente um resultado aprovado permite iniciar a fase 3.

## Entrega para as fases seguintes

A fase termina entregando:

- comandos oficiais protegidos e sem bypass;
- policy, baseline, exceptions e IOCs versionados;
- aquisição autorizada seguida de build offline sobre snapshot imutável;
- artefato e evidências ligados a digests verificáveis;
- contratos de `security:scheduled` e `security:release` prontos para a fase 4.

