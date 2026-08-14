# Parte 6: Repositório Dedicado E GitHub Releases

## Objetivo

Publicar builds de apps e artefatos de conhecimento com GitHub Actions e GitHub
Releases, registrando cada release no `hub-server` sem alterar os contratos
validados localmente.

Esta parte depende do [updater local](./05-tauri-updater-local.md) e do consumo de
conhecimento já funcional pela API.

## Pré-Requisito

O código está em um repositório dedicado ao projeto. A automação nasce nesse
repositório e usa environments protegidos para canais que publicam releases.

## Papel Do GitHub

GitHub é o primeiro provider externo de:

- binários e bundles dos apps;
- pacotes globais `knowledge-bootstrap-<version>-<release-id>.zip`;
- pacotes globais `knowledge-delta-<version>-<release-id>.zip`.

O manifest de conhecimento é servido pelo `hub-server` como snapshot assinado do
canal. Sua renovação não depende da criação de GitHub Releases.

GitHub Releases não representa, nesta parte, uma árvore arbitrária com um asset
por hash. O download individual de `CAS/system` continua pela source
`hub_server`. A source `github` em `knowledge_cas_object` permanece desativada até
existir um mecanismo explícito, imutável e testado para objetos individuais.

GitHub distribui cada release de conhecimento como um único asset, sem depender
de milhares de arquivos individuais. Cloudflare R2 e IPFS são os providers
previstos para distribuição direta por conteúdo.

O `hub-server` mantém um armazenamento persistente para sua cópia de
`CAS/system`. Durante a validação de uma release, ele baixa o pacote global pela
delivery source, extrai com validação defensiva e materializa somente os objetos
ausentes. A source `hub_server` para hash
individual só fica habilitada depois que todos os hashes do `system_media.db`
forem resolvíveis.

## Workflows

Separar workflows reutilizáveis:

```text
.github/workflows/ci.yml
.github/workflows/release-app.yml
.github/workflows/release-knowledge.yml
```

`ci.yml` valida código, testes e geração determinística sem publicar.

`release-app.yml`:

```text
recebe versão e canal
-> valida tag e estado do repositório
-> builda a matriz de plataformas
-> assina cada artefato
-> calcula SHA-256 e tamanho
-> publica em GitHub Release imutável
-> registra draft pela API interna
-> solicita validação e publicação
-> promove a release no canal solicitado
-> confirma manifest público
```

`release-knowledge.yml`:

```text
invoca as tarefas knowledge do hub-server
-> valida componentes e pacote global
-> publica o pacote global no GitHub Release
-> confirma a KnowledgeDeliverySource GitHub configurada para o canal
-> solicita validação da KnowledgeRelease
-> Hub materializa objetos CAS ausentes a partir do pacote publicado
-> CI solicita publicação da KnowledgeRelease
-> CI solicita promoção da release no canal
-> confirma KnowledgeManifestSnapshot assinado, sequência e ponteiro do canal
```

## URLs E Imutabilidade

- Cada URL de pacote inclui o `releaseId` e aponta para tag e nome de asset
  imutáveis.
- O manifest não usa endpoint `latest` como URL de artefato.
- O endpoint de pacote do `hub-server` recebe `releaseId` e resolve exatamente o
  `KnowledgeReleasePackage` imutável correspondente.
- Substituir bytes de um asset exige nova release e novo registro.
- Checksums são calculados sobre os bytes efetivamente enviados ao provider.
- O CI verifica novamente o asset publicado antes de solicitar `published`.
- O armazenamento persistente do Hub nunca depende do filesystem efêmero do
  processo Rails ou do runner do GitHub Actions.

## Registro No Hub Server

O CI usa a API interna com:

- token armazenado em GitHub Environment Secret;
- `Idempotency-Key` derivada de workflow, release e tentativa lógica;
- payload com artefatos e sources separados;
- checksum, tamanho e assinatura do pacote global;
- geração, revisão, predecessor e componentes da release global;
- checksums de base e resultado dos patches de banco;
- nenhuma chave privada ou credencial de provider.

Uma falha no upload ou na verificação impede a publicação no Hub. Reexecutar o
workflow não cria releases duplicadas e não troca o canal até a conclusão.

O registro e a publicação da release são independentes do canal. A promoção
informa o canal e o `releaseId`; o Hub aloca `manifestSequence`, monta o snapshot
com as sources vigentes e troca o ponteiro de forma transacional.

A configuração inicial ou alteração do provider usa a rota interna idempotente de
`KnowledgeDeliverySource`, com provider, prioridade, `urlPattern` e canal. Ela não
é repetida no payload de cada release.

## Sources Externas

Depois da publicação do provider:

- GitHub fica habilitado para artefatos de app, pacotes globais e delivery
  sources;
- `hub_server` permanece prioridade 1 para o contrato consumido pelo app;
- GitHub pode ser fallback ou destino do redirect controlado;
- Cloudflare R2, GitLab e IPFS permanecem `enabled: false`;
- GitHub para objeto CAS individual permanece `enabled: false` nesta parte.

O `hub-server` pode entregar o pacote localmente ou redirecionar para GitHub
conforme a delivery source. A URL externa não precisa ser conhecida previamente
pelo app.

## Segurança Do CI/CD

- Workflows fixam actions de terceiros por commit SHA.
- Permissões de `GITHUB_TOKEN` usam o mínimo necessário por job.
- Publicação stable usa environment protegido e aprovação configurável.
- Pull requests de forks não recebem secrets de publicação.
- Artefatos são assinados antes do upload.
- Proveniência do build e logs de publicação são preservados.
- O token interno aceita rotação e fica restrito ao endpoint do Hub.
- Falhas não imprimem secrets, assinatura privada ou payload sensível.
- Concorrência por canal impede duas publicações simultâneas.

## Testes

Cobrir:

- CI sem publicação em pull request;
- matriz de builds suportada;
- assinatura, checksum e tamanho dos assets;
- cadeia global de bootstrap e deltas com os três componentes;
- nomes e URLs de pacote vinculados ao `releaseId`;
- pacote único contendo os dois bancos ou patches e as entradas CAS aplicáveis;
- patches internos vinculados à base e ao resultado corretos;
- payload idempotente para releases de app e conhecimento;
- recusa de registro com asset ausente ou divergente;
- reexecução segura depois de falha parcial;
- sources GitHub habilitadas somente para os tipos implementados;
- source GitHub desativada para objeto individual CAS;
- resolução pública por redirect controlado;
- manifest público apontando para a release registrada;
- sequência monotônica do snapshot promovido;
- manutenção do canal anterior quando a publicação falha.

## Critérios De Aceite

- O projeto usa um repositório dedicado.
- GitHub Actions executa CI sem acesso indevido a secrets.
- GitHub Releases hospeda os artefatos versionados definidos nesta parte.
- Releases de app e conhecimento são registradas de forma idempotente.
- O Hub valida os assets e publica a release antes da promoção de canal.
- A promoção publica um snapshot assinado com sequência e expiração válidas.
- O Hub materializa em armazenamento persistente todos os objetos exigidos pelo
  índice antes de habilitar download individual.
- O updater recebe um manifest válido gerado pelo `hub-server`.
- O app obtém cada release por uma delivery source publicada e verificada.
- O download individual CAS continua funcional pela source `hub_server`.
- Cloudflare R2, GitLab e IPFS permanecem previstos e desativados.

## Expansões

As expansões de Cloudflare R2, GitLab e IPFS estão descritas no
[índice arquitetural](./README.md) e entram em planos próprios.
