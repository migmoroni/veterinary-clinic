# Plano De Implementação Do Hub Server

## Objetivo

`apps/hub-server/` é o hub aberto do ecossistema veterinário. Ele vive na
pasta `apps/` do monorepo e concentra dados públicos, manifests, releases,
artefatos de conhecimento e distribuição pública dos apps.

Este plano divide a implementação em cinco partes:

1. preparação da geração dos artefatos `system`;
2. base Rails e contratos públicos do `hub-server`;
3. dados públicos e publicação dos pacotes pelo `hub-server`;
4. updater próprio do Tauri com manifest local;
5. repositório dedicado e CI/CD com GitHub Releases.

O `hub-server` não é o servidor operacional do SaaS. Dados privados de
usuários, billing, permissões comerciais, sincronização privada e recursos
fechados pertencem a outro servidor.

## Decisões De Arquitetura

- A aplicação Rails fica em `apps/hub-server/`, seguindo o padrão `apps/*` do
  workspace.
- O app começa em Rails 8 API com SQLite.
- A API pública usa namespace `/api/v1`.
- A API interna usa Bearer Token via variável `INTERNAL_RELEASE_TOKEN`.
- O manifest é a fonte principal para os apps descobrirem updates e downloads.
- Downloads são URLs registradas ou redirects controlados pelo `hub-server`.
- A geração de `system`, `system_media` e `CAS/system` deve ficar limpa e
  determinística antes de ser movida para `apps/hub-server`.
- O updater próprio do Tauri deve ser validado com build e manifest locais antes
  da integração com GitHub.
- GitHub Releases é o provedor inicial dos arquivos publicados quando o projeto
  estiver em um repositório dedicado.
- GitLab é previsto no contrato de artefatos, mas não é implementado nesta
  sequência.
- Artefatos publicados são imutáveis: novo arquivo, hash ou assinatura geram
  novo registro publicado.
- Versão do app, versão de schema SQLite e versão do pacote de conhecimento são
  conceitos separados.
- Site público e painel admin entram em uma fase própria.

## Contrato De Artefatos

Todo arquivo publicado pelo `hub-server` segue um contrato comum:

```text
artifact_type
provider
app_name
platform
channel
version
url
storage_key
checksum_sha256
size_bytes
signature
published_at
metadata
```

Campos principais:

- `artifact_type`: tipo do arquivo publicado.
- `provider`: `github`, `gitlab` ou `local`.
- `app_name`: app relacionado, como `vet-app`, quando o artefato é de app.
- `platform`: plataforma alvo, como `linux-x86_64`, `windows-x86_64`,
  `darwin-aarch64` ou `darwin-x86_64`.
- `channel`: canal de publicação, como `stable`, `beta` ou `nightly`.
- `version`: versão do app ou do pacote de conhecimento.
- `url`: URL pública usada para download ou redirect.
- `storage_key`: identificador interno do arquivo no provider.
- `checksum_sha256`: hash SHA-256 do arquivo.
- `size_bytes`: tamanho do arquivo publicado.
- `signature`: assinatura usada pelo updater ou pelo validador do app.
- `metadata`: JSON com detalhes específicos do tipo de artefato.

Tipos de artefato iniciais:

```text
app_binary
app_bundle
app_updater_manifest
knowledge_system_db
knowledge_system_media_db
knowledge_cas_system
knowledge_manifest
```

## Versionamento

O `hub-server` trata três camadas de versão:

- `app_version`: versão do app publicado, como `0.2.0`;
- `schema_version`: versão técnica do SQLite usada pelo banco publicado;
- `knowledge_version`: versão do pacote público de conhecimento.

O app consulta manifests públicos e decide o que baixar com base em versão,
canal, plataforma, hash, assinatura e faixa de versões suportadas.

## Parte 1: Preparação Da Geração Dos Artefatos `system`

### Objetivo

Organizar o processo que gera `system`, `system_media` e `CAS/system` para que
ele fique determinístico, testável e isolado do runtime do app antes de mover
essa responsabilidade para `apps/hub-server`.

### Escopo

Mapear e refatorar a geração dos artefatos públicos do monorepo:

- banco `system`;
- banco `system_media`;
- árvore ou pacote `CAS/system`;
- manifest local de conhecimento;
- hashes SHA-256;
- tamanhos dos arquivos;
- versão técnica dos bancos;
- changelog técnico do pacote de conhecimento.

### Local Do Código

Nesta parte, a geração fica como ferramenta de build do monorepo:

```text
scripts/knowledge-artifacts/
```

Essa pasta contém a orquestração do processo:

- leitura dos dados fonte públicos;
- criação dos bancos de saída;
- montagem do `CAS/system`;
- cálculo de hashes;
- cálculo de tamanhos;
- geração do `knowledge_manifest.json`;
- comandos de build local.

Os schemas e utilitários reutilizáveis de SQLite continuam nos packages donos:

```text
packages/core-local/src/sqlite/create/system/main/
packages/core-local/src/sqlite/create/system/media/
packages/core-local/src/sqlite/create/shared/
```

Os dados fonte públicos continuam no pacote que os expõe hoje para o monorepo:

```text
packages/types/src/catalog/defaults/
packages/types/src/domain/**/defaults/
```

Nenhum código de geração deve ficar em:

```text
apps/vet-app/
packages/modules/
```

`apps/vet-app` apenas consome artefatos prontos. `packages/modules` mantém regra
de domínio e UI de negócio; não orquestra geração de pacotes públicos.

### Saída Local

Os artefatos versionados gerados pela Parte 1 ficam em:

```text
build/knowledge-artifacts/releases/<knowledge_version>/
```

O CAS do sistema fica em um cofre único:

```text
build/knowledge-artifacts/CAS/system/
```

Estrutura esperada:

```text
build/knowledge-artifacts/
├── CAS/
│   └── system/
└── releases/
    └── <knowledge_version>/
        ├── data/
        │   ├── veterinary_clinic_system.db
        │   └── veterinary_clinic_system_media.db
        ├── knowledge_manifest.json
        └── checksums.sha256
```

`CAS/system` é único dentro de `build/knowledge-artifacts/`. Cada build adiciona
somente os arquivos de mídia que ainda não existem no CAS. O
`knowledge_manifest.json` versionado referencia os hashes necessários para
aquela `knowledge_version`.

O diretório `build/` é saída gerada. Ele não é fonte de verdade.

### Entrada Para Builds Dos Apps

Após a Parte 1, builds empacotáveis do `vet-app` recebem os artefatos públicos
prontos antes de executar o build Tauri. Isso vale para:

```text
tauri:build
tauri:appimage
tauri:deb
tauri:msi
tauri:flatpak
```

O build do app deve executar ou exigir um passo anterior que prepare:

```text
build/knowledge-artifacts/releases/<knowledge_version>/data/veterinary_clinic_system.db
build/knowledge-artifacts/releases/<knowledge_version>/data/veterinary_clinic_system_media.db
build/knowledge-artifacts/CAS/system/
build/knowledge-artifacts/releases/<knowledge_version>/knowledge_manifest.json
```

Esses artefatos são então copiados ou referenciados como recurso inicial do
pacote do app. O app instalado pode nascer com uma versão inicial de conhecimento
sem precisar gerar `system`, `system_media` ou `CAS/system` no runtime.

Se os artefatos não existirem, o build empacotável deve falhar com erro claro
indicando o comando de geração necessário.

### Regras

- A geração deve rodar por comando explícito.
- A saída deve ser reproduzível para a mesma entrada.
- O app não deve depender dessa geração em runtime.
- O processo deve produzir artefatos prontos para consumo.
- Builds empacotáveis do app devem receber `system`, `system_media` e
  `CAS/system` prontos.
- O build do app não deve gerar bancos ou CAS públicos por conta própria.
- `CAS/system` não deve ser duplicado por `knowledge_version`.
- Arquivos de CAS são endereçados por hash e reaproveitados entre builds.
- Os dados fonte públicos continuam separados dos dados privados do usuário.
- Nenhuma regra SaaS fechada entra no fluxo.

### Entregáveis

```text
veterinary_clinic_system.db
veterinary_clinic_system_media.db
CAS/system único e incremental
knowledge_manifest.json
checksums
```

### Testes

Cobrir:

- geração completa dos artefatos;
- validade dos bancos SQLite gerados;
- presença de versão técnica nos bancos;
- hash e tamanho de cada artefato;
- consistência do manifest local;
- falha clara quando dado fonte obrigatório está inválido.

### Critérios De Aceite

- A geração de `system`, `system_media` e `CAS/system` roda por comando.
- Os artefatos gerados têm manifest, hash, tamanho e versão.
- O app consegue consumir os artefatos prontos em desenvolvimento.
- AppImage, deb, msi, Flatpak e build geral recebem os artefatos prontos.
- Build empacotável falha quando os artefatos públicos não estão disponíveis.
- O processo fica preparado para ser movido para `apps/hub-server`.

## Parte 2: Base Rails E Contratos Públicos

### Objetivo

Criar o servidor Rails em `apps/hub-server/` com estrutura mínima, APIs públicas,
API interna protegida, modelos de release e testes.

### Escopo

Criar a aplicação:

```sh
rails new apps/hub-server --api --database=sqlite3 --skip-asset-pipeline
```

Configurar:

- Rails 8 API;
- SQLite;
- `solid_queue`;
- `solid_cache`;
- CORS para desenvolvimento local e domínios públicos do ecossistema;
- `GET /up`;
- `GET /api/v1/health`;
- autenticação interna por `Authorization: Bearer <INTERNAL_RELEASE_TOKEN>`.

### Modelos Iniciais

`Release`

```text
app_name
version
channel
notes
status
published_at
metadata
```

`ReleaseArtifact`

```text
release_id
artifact_type
provider
platform
url
storage_key
checksum_sha256
size_bytes
signature
metadata
published_at
```

`KnowledgeRelease`

```text
knowledge_version
schema_version
channel
status
notes
manifest_json
published_at
metadata
```

`KnowledgeArtifact`

```text
knowledge_release_id
artifact_type
provider
url
storage_key
checksum_sha256
size_bytes
signature
metadata
published_at
```

### Rotas Públicas

```text
GET /api/v1/health
GET /api/v1/apps/:app_name/updates/:platform/:current_version
GET /api/v1/knowledge/manifest
GET /api/v1/downloads/:artifact_id
```

`/api/v1/apps/:app_name/updates/:platform/:current_version` devolve o manifest
esperado pelo updater do Tauri para o app, plataforma e canal solicitados.

`/api/v1/knowledge/manifest` devolve a release pública atual dos dados de
conhecimento, incluindo artefatos, hashes, tamanhos, schema SQLite e versão do
pacote.

`/api/v1/downloads/:artifact_id` resolve o artefato publicado e devolve redirect
ou resposta de download.

### Rotas Internas

```text
POST /api/v1/internal/releases
POST /api/v1/internal/knowledge_releases
```

As rotas internas registram releases e artefatos publicados por processos de
publicação. Elas exigem Bearer Token e validam campos obrigatórios do contrato
de artefato.

### Services

```text
app/services/tauri_updater_manifest.rb
app/services/knowledge_manifest.rb
app/services/artifact_resolver.rb
```

### Testes

Cobrir:

- healthcheck público;
- resposta sem release publicada;
- criação de release por API interna com token válido;
- recusa da API interna sem token;
- geração do manifest de update do app;
- geração do manifest de conhecimento.

### Critérios De Aceite

- `apps/hub-server/` existe no workspace.
- Rails sobe com `bin/rails server` dentro de `apps/hub-server`.
- `bin/rails db:prepare` passa dentro de `apps/hub-server`.
- `bin/rails test` passa dentro de `apps/hub-server`.
- API interna exige Bearer Token.
- Manifests públicos existem mesmo quando não há release publicada.
- Nenhum código de SaaS fechado entra no servidor.

## Parte 3: Dados Públicos E Pacotes No `hub-server`

### Objetivo

Fazer o `hub-server` ser a fonte dos dados públicos e gerar os artefatos de
referência usados pelos apps.

### Escopo

Modelar e validar dados públicos:

- raças;
- fabricantes;
- produtos;
- princípios ativos;
- condições clínicas;
- protocolos públicos;
- mídias públicas associadas aos catálogos.

Mover para `apps/hub-server` o processo organizado na Parte 1.

Criar tarefas Rails para:

```text
rails knowledge:validate
rails knowledge:build_system
rails knowledge:build_system_media
rails knowledge:build_cas_system
rails knowledge:build_manifest
rails knowledge:publish
```

### Artefatos Gerados

```text
veterinary_clinic_system.db.gz
veterinary_clinic_system_media.db.gz
cas_system.zip
knowledge_manifest.json
```

`cas_system.zip`, quando gerado para publicação, é derivado do CAS único e do
manifest da release. Ele não representa uma cópia completa e isolada do
`CAS/system` para cada `knowledge_version`.

O manifest de conhecimento inclui:

- `knowledge_version`;
- `schema_version` de `system`;
- `schema_version` de `system_media`;
- lista de artefatos;
- hash SHA-256 de cada arquivo;
- tamanho de cada arquivo;
- canal;
- changelog técnico;
- faixa de versões de app suportadas.

### Regras

- Os apps consomem artefatos prontos.
- Os apps não carregam JSONs fonte de catálogo público.
- Os apps não geram `system`, `system_media` ou `CAS/system` em runtime.
- O `hub-server` valida os dados antes de publicar.
- Publicação incompleta não vira release pública.
- Hash, tamanho e assinatura são gravados junto do artefato.

### Testes

Cobrir:

- validação dos dados públicos;
- geração dos bancos `system` e `system_media`;
- geração do pacote `CAS/system`;
- geração do manifest;
- recusa de publicação com artefato ausente;
- publicação de release de conhecimento completa.

### Critérios De Aceite

- O `hub-server` gera os artefatos públicos de conhecimento.
- O manifest de conhecimento aponta para todos os arquivos publicados.
- O manifest contém hashes e tamanhos.
- A API pública retorna a release de conhecimento atual.
- A publicação só ocorre quando todos os artefatos obrigatórios existem.
- A produção dos artefatos públicos sai do runtime dos apps.

## Parte 4: Updater Tauri Com Manifest Local

### Objetivo

Adicionar o fluxo de atualização própria do app Tauri e validar o comportamento
usando build local, manifest local e artefatos locais antes da integração com
GitHub.

### Escopo

Configurar no `vet-app`:

- plugin oficial de updater do Tauri;
- endpoint ou arquivo local de manifest para desenvolvimento;
- geração local de manifest de update;
- build local assinado quando o fluxo exigir assinatura;
- verificação de versão disponível;
- download do artefato local;
- aplicação de update em ambiente controlado.

### Regras

- O primeiro teste do updater usa provider `local`.
- O app deve consumir o mesmo formato de manifest que será servido pelo
  `hub-server`.
- O teste local valida o consumidor antes de automatizar publicação externa.
- O fluxo de updater do app não depende de GitHub nesta parte.
- Hash e assinatura devem ser tratados como parte do contrato de update.

### Testes

Cobrir:

- parsing do manifest local;
- detecção de versão disponível;
- ausência de update quando a versão publicada é igual ou menor;
- recusa de manifest inválido;
- recusa de artefato com hash inválido quando aplicável;
- smoke test manual documentado para build local.

### Critérios De Aceite

- O app consulta um manifest local de update.
- O app reconhece quando existe versão nova.
- O formato local segue o mesmo formato do manifest público do `hub-server`.
- O fluxo não exige GitHub para ser validado.
- O procedimento local fica documentado.

## Parte 5: Repositório Dedicado E GitHub Releases

### Objetivo

Conectar o projeto ao fluxo de publicação automatizada usando GitHub Actions e
GitHub Releases depois que o repositório dedicado do projeto estiver definido.

### Pré-Requisito

O código precisa estar em um repositório focado neste projeto antes da integração
com GitHub Releases. A automação de release deve nascer no repositório que será
usado publicamente pelo projeto.

### Escopo

GitHub é o provider implementado nesta parte:

- GitHub Actions gera builds dos apps;
- GitHub Actions gera pacotes de conhecimento;
- GitHub Releases hospeda binários e pacotes;
- GitHub Actions chama a API interna do `hub-server`;
- o `hub-server` registra artefatos, checksums, assinaturas e URLs públicas.

O contrato de artefatos mantém `provider = github | gitlab | local`, mas esta
parte implementa apenas `github`. O provider `gitlab` fica reservado para
quando o repositório também for espelhado e publicado pelo GitLab.

### Fluxo De App

```text
CI builda app
-> CI assina artefatos
-> CI calcula SHA-256 e tamanho
-> CI publica em GitHub Release
-> CI chama POST /api/v1/internal/releases
-> hub-server publica manifest do updater
-> app consulta hub-server
-> app baixa pelo provider registrado
```

### Fluxo De Conhecimento

```text
CI executa tarefas knowledge
-> CI publica system, system_media, CAS/system e manifest
-> CI chama POST /api/v1/internal/knowledge_releases
-> hub-server registra release de conhecimento
-> app consulta manifest
-> app baixa artefatos pelo provider registrado
```

### Regras

- GitHub Releases é usado para arquivos que precisam permanecer disponíveis.
- Artefatos temporários do CI não são usados como fonte pública do app.
- O `hub-server` não precisa armazenar arquivos localmente para cada provider.
- O `hub-server` sempre guarda metadados, hashes, tamanhos e URLs.
- O contrato de API interna é genérico o suficiente para receber outros
  providers depois.
- Falha de publicação no provider impede registro público no `hub-server`.

### Testes

Cobrir:

- payload de release vindo do provider `github`;
- payload de knowledge release vindo do provider `github`;
- recusa de artefato sem checksum;
- recusa de artefato sem URL;
- manifest público apontando para artefatos registrados.

### Critérios De Aceite

- O projeto está em repositório dedicado.
- CI/CD registra releases no `hub-server` por API interna.
- GitHub Releases é a fonte inicial dos arquivos publicados.
- App updater recebe manifest gerado pelo `hub-server`.
- Knowledge manifest recebe URLs, hashes e tamanhos dos artefatos publicados.

## Ordem Recomendada

1. Implementar a Parte 1.
2. Validar consumo local dos artefatos `system`.
3. Implementar a Parte 2.
4. Implementar a Parte 3.
5. Conectar os apps ao manifest de conhecimento do `hub-server`.
6. Implementar a Parte 4 com build e manifest locais.
7. Criar ou mover para o repositório dedicado do projeto.
8. Implementar a Parte 5 com GitHub Releases.

## Expansão Prevista: GitLab

GitLab permanece previsto no contrato de artefatos pelo valor `provider =
gitlab`. A implementação entra em fase própria quando houver espelhamento do
repositório e fluxo de publicação pelo GitLab.

Essa fase própria deve cobrir:

- GitLab CI;
- GitLab Releases ou package registry;
- registro de releases via API interna existente;
- fixtures e testes do provider `gitlab`;
- fallback de download quando houver mais de um provider publicado para o mesmo
  artefato.

## Fora De Escopo

- front-end web separado;
- painel administrativo visual;
- site público do projeto;
- implementação do provider `gitlab`;
- servidor SaaS fechado;
- dados privados de usuários;
- sincronização privada;
- billing;
- permissões comerciais;
- geração de prontuários ou dados clínicos privados.
