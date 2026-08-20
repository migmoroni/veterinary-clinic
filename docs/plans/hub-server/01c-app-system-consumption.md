# Parte 1C: Consumo Local Dos Artefatos `system`

## Objetivo

Refatorar os apps e packages para consumir exclusivamente os artefatos completos
produzidos pelo `knowledge-builder`: o par localizado `system` e `system_media` e
o `CAS/system` compartilhado.

Esta parte conclui a separação entre autoria, compilação e consumo:

```text
data/knowledge       autoria de conteúdo
knowledge-builder    validação e compilação
apps e packages      leitura dos artefatos
```

O app não executa nem incorpora o builder. Comandos explícitos da raiz produzem
os artefatos; uma fronteira de preparação verifica e instala seus bytes nos
locais já gerenciados pelo app. Desenvolvimento e builds consomem somente essa
saída preparada.

## Pré-requisito

A [Parte 1B](./01b-knowledge-builder.md) está concluída e gera uma
`build_version` válida com os seis pares de bancos e o CAS compartilhado.

## Escopo

- criar uma fronteira única de resolução dos artefatos locais;
- instalar o par ativo nos arquivos de sistema já gerenciados pelo app;
- instalar objetos CAS em `vault/system` pela disposição fragmentada vigente;
- abrir sempre `system` e `system_media` do mesmo locale e da mesma versão;
- adaptar contratos, repositories e serviços aos campos localizados dos bancos;
- fazer buscas usarem nomes e aliases armazenados em `system`;
- retirar chaves de i18n dos modelos de conhecimento;
- retirar conteúdo de conhecimento dos arquivos de i18n do app;
- retirar agregadores, defaults, seeds e loaders substituídos;
- retirar a geração de `system`, `system_media` e `CAS/system` dos apps e de
  `core-local` e dos ramos de criação do `engine/storage`;
- conservar sem alterações funcionais a criação, migrations, escrita,
  sincronização, replicação e CAS do ramo `user`;
- preparar o fluxo local de desenvolvimento;
- preparar os builds empacotáveis por lista de locales;
- manter o i18n de interface;
- preservar a API pública de negócio quando ela continuar semanticamente válida.

Esta parte usa artefatos integrais em `build/knowledge-artifacts`. Aquisição por
manifest, instalação de releases, bootstraps e deltas pertencem à Parte 4.

## Fluxo

```mermaid
flowchart LR
    DATA["data/knowledge"] --> BUILDER["knowledge-builder Rust"]
    BUILDER --> OUTPUT["build/knowledge-artifacts"]
    OUTPUT --> PREPARE["Validar e instalar<br/>locale selecionado"]
    PREPARE --> ACTIVE["app_database_dir + vault/system"]
    ACTIVE --> ENGINE["engine/storage<br/>system somente leitura"]
    ENGINE --> CORE["core-local<br/>queries de leitura"]
    CORE --> MODULES["módulos e app-services"]
    MODULES --> ROUTES["rotas e componentes"]
```

O builder é executado por comando explícito. Iniciar o app ou empacotar um app
não dispara geração implicitamente.

## Fronteiras De Responsabilidade

### `data/knowledge`

- contém entidades, localizações e referências de mídia;
- não é importado por código do app;
- não é servido diretamente ao runtime;
- não contém TypeScript executável.

### `tools/knowledge-builder`

- escreve os bancos públicos e o CAS;
- valida e relata a saída;
- não é biblioteca de runtime do app.

### `packages/engine/storage`

- conserva integralmente a criação e a escrita de `user/main`, `user/media`,
  `user/logs` e `vault/user`;
- abre o `system` ativo por um perfil próprio de banco operacional de sistema;
- abre `system` e `system_media` com flags SQLite de somente leitura e
  `PRAGMA query_only = ON`;
- valida `PRAGMA user_version` e os metadados do par sem criar tabelas, elevar
  versões ou modificar os arquivos;
- resolve objetos de sistema em `vault/system/<2-hex>/<2-hex>/<hash>.bin`;
- recusa comandos SQL de escrita direcionados a `system` e `system_media`.

`DbType::MediaIndex` continua sendo o perfil gravável de `user_media`.
`DbType::SystemMediaIndex` passa a ser exclusivamente leitor do schema
`media_assets` produzido pelo builder. O perfil operacional de `system` não
reutiliza o modo gravável de `user/main`.

### `packages/engine/distribution`

- recebe bancos e objetos CAS já produzidos pelo builder;
- valida tamanho, checksum, identidade e caminhos antes da instalação;
- copia bytes para staging e finaliza arquivos por operações atômicas ou
  recuperáveis;
- é a única fronteira autorizada a substituir os arquivos ativos de sistema ou
  incorporar objetos prontos em `vault/system`;
- não executa SQL de escrita, DDL, seeds, projeção, geração de thumbnail ou
  autoria de objetos CAS.

Essa escrita é instalação de artefato, não criação de dados de sistema. Depois
da ativação, `engine/storage` mantém somente a leitura do conjunto.

### `packages/types`

- conserva tipos, IDs, DTOs e contratos de domínio;
- não contém catálogos padrão, raças padrão, protocolos públicos ou JSONs de
  autoria;
- não usa `import.meta.glob` para carregar dados de conhecimento;
- não exporta arrays `default*` que representem conteúdo público.

### `packages/core-local`

- solicita ao engine as conexões ativas de leitura para `system` e
  `system_media`;
- valida versões de schema, locale e identidade do par;
- oferece queries e repositories de infraestrutura;
- não cria, semeia, atualiza nem migra os bancos públicos;
- não resolve conteúdo de conhecimento por i18n;
- mantém i18n e demais recursos locais que não sejam dados públicos.

A criação e as migrations dos bancos de usuário permanecem no fluxo atual de
`core-local` e `engine`. A remoção de DDL, seeds e configuração de mídia nesta
parte se limita aos bancos públicos de sistema.

### `packages/modules`

- oferece APIs de negócio para catálogos, raças, protocolos e demais domínios;
- consome repositories públicos de leitura;
- não conhece caminhos de `build/`, JSONs de autoria ou schemas de geração.

### `packages/app-services`

- compõe buscas e análises reutilizáveis sobre as APIs públicas dos módulos;
- pesquisa os campos localizados e normalizados disponibilizados pelos bancos;
- não carrega fontes de conhecimento diretamente.

### `apps/vet-app`

- seleciona locale e versão preparados;
- compõe serviços e UI;
- não gera bancos nem CAS;
- não importa dados canônicos;
- não traduz nomes ou descrições de entidades retornadas pelos repositories.

## Resolução Local

O desenvolvimento seleciona explicitamente uma `build_version` e um ou mais
locales disponíveis em:

```text
build/knowledge-artifacts/versions/<build_version>/locales/<locale>/veterinary_clinic_system.db
build/knowledge-artifacts/versions/<build_version>/locales/<locale>/veterinary_clinic_system_media.db
build/knowledge-artifacts/CAS/system/<2-hex>/<2-hex>/<hash-sha256-hex>.bin
```

A origem do builder e o cofre ativo usam a mesma disposição relativa abaixo de
`system/`. A instalação copia um objeto de
`CAS/system/ab/cd/<hash>.bin` para `vault/system/ab/cd/<hash>.bin`, sem criar uma
representação plana intermediária.

Esses caminhos são fontes preparadas e nunca são abertos diretamente pelos
repositories. Uma fronteira de preparação recebe a origem de artefatos:

```text
prepareLocalKnowledgeResources({ artifactRoot, buildVersion, locale })
  -> validar a saída do builder
  -> instalar o par ativo
  -> incorporar os objetos CAS ausentes
  -> ativar o conjunto
```

Antes de instalar, a fronteira:

1. lê `build-result.json`;
2. valida seu contrato;
3. resolve somente caminhos internos ao diretório de artefatos;
4. confere tamanho e SHA-256 dos dois bancos;
5. confere `PRAGMA integrity_check` quando exigido pela política local;
6. valida versões e fingerprints dos schemas;
7. confirma a linha singleton de `knowledge_build_metadata` nos dois bancos;
8. confirma `build_version`, builder, digest da fonte e locale idênticos no par;
9. confirma a presença dos objetos exigidos por `system_media`;
10. verifica cada objeto CAS pelo hash antes de instalá-lo.

O destino ativo preserva os locais gerenciados pelo app:

```text
<app_database_dir>/veterinary_clinic_system.db
<app_database_dir>/veterinary_clinic_system_media.db
<app_data_dir>/vault/system/<2-hex>/<2-hex>/<hash-sha256-hex>.bin
```

`<app_database_dir>` é o nome lógico do diretório que reúne os arquivos SQLite
gerenciados pelo app. Na implementação Tauri, ele resolve para
`app.path().app_data_dir()/databases`.

Os objetos CAS são aditivos e imutáveis. A preparação copia somente hashes
ausentes para um arquivo temporário no diretório de destino, confirma o SHA-256 e
finaliza por `rename`. O par de bancos é copiado para staging, validado e
substituído como uma unidade recuperável antes da reabertura.

O runtime consulta uma fronteira estável, sem receber `buildVersion` ou caminhos
da origem editorial:

```text
getActiveKnowledgeResources()
  -> identity
  -> locale
  -> systemDatabase
  -> systemMediaDatabase
  -> systemCasResolver
```

Na Parte 1C, `identity` representa uma compilação local. A Parte 4 fornece o
mesmo contrato a partir de uma release instalada, sem alterar repositories,
módulos ou app-services.

Um par incompleto, divergente ou corrompido produz erro explícito. O consumidor
nunca combina `system` de um locale com `system_media` de outro.

Rotas, componentes, módulos e app-services não constroem caminhos para
`build/knowledge-artifacts`, `app_database_dir` ou `vault/system`.

## Ordem De Inicialização

O setup nativo respeita esta ordem:

1. resolver a origem local ou incorporada e o locale inicial;
2. recuperar qualquer substituição interrompida;
3. instalar e validar o par ativo quando ele estiver ausente ou não corresponder
   à seleção;
4. construir o `StorageManager`;
5. abrir os bancos de usuário por seus perfis graváveis;
6. abrir `system` e `system_media` pelos perfis de somente leitura;
7. disponibilizar o storage ao restante do app.

Assim, `StorageManager::new` não cria arquivos de sistema vazios quando ainda não
há artefato preparado. Em um bundle instalado, a cópia inicial dos recursos
incorporados ocorre antes da abertura do par. Em desenvolvimento, o comando da
raiz pode concluir a mesma preparação antes de iniciar o processo Tauri.

## Troca De Locale

Ao alterar o locale ativo, a camada de conhecimento:

1. resolve e valida o novo par completo na origem preparada;
2. incorpora e verifica os objetos ausentes em `vault/system`;
3. prepara os dois bancos em staging ao lado dos arquivos ativos;
4. grava um marcador de substituição recuperável;
5. encerra ou drena as leituras do par ativo;
6. substitui os dois arquivos ativos e os abre em modo somente leitura;
7. remove o marcador e os backups somente depois da validação final;
8. invalida caches e read models dependentes do locale.

Falha antes do fechamento conserva o par anterior. Falha ou encerramento durante
a substituição usa o marcador e os backups para restaurar o par anterior na
mesma execução ou na próxima inicialização. Como as conexões permanecem fechadas
durante essa janela, uma tela nunca observa arquivos de locales diferentes.

## Contratos Localizados

DTOs e modelos de conhecimento expõem valores resolvidos:

```text
id
name
aliases
description
sections
classification
relations
originPlaces
media
```

Campos como `labelKey`, `originLabelKey` e equivalentes deixam os contratos de
conhecimento. Relações de origem expõem `geo_place` por ID e conteúdo localizado,
sem reconstruir localizações no módulo de raças. Códigos técnicos continuam
disponíveis em campos próprios quando possuem significado de domínio.

Cada item de `sections` expõe `sectionKey`, `parentSectionKey` quando houver,
ordem e corpo Markdown compilado. `sectionKey` é um enum semântico do domínio,
não uma chave de conteúdo. A camada de interface fornece o título padronizado da
seção no locale ativo, enquanto nomes, aliases e corpos permanecem integralmente
resolvidos pelo banco.

Repositories não chamam `translate()` para montar uma entidade. O locale é
determinado pelo banco ativo, e o retorno já contém o conteúdo correto.

## Resolução De Mídia

Contratos de domínio expõem `mediaKey`, papel e metadados compilados. Eles não
expõem caminho de autoria nem usam o hash como identidade lógica.

Uma fronteira única resolve a mídia no par ativo:

```text
mediaKey
-> consultar system_media.media_assets
-> obter contentHash e metadados técnicos
-> converter contentHash BLOB(32) para hexadecimal minúsculo
-> resolver vault/system/<2-hex>/<2-hex>/<hash>.bin pelo engine
-> fornecer URL ou stream seguro ao consumidor
```

O renderer de Markdown reconhece somente o contrato interno:

```markdown
![Texto alternativo](knowledge-media://asset/<media-key> "Legenda opcional")
```

Ele extrai e valida a `media_key`, usa a mesma fronteira de resolução e nunca a
converte em caminho físico diretamente. Uma referência ausente produz estado
explícito de mídia indisponível, sem buscar arquivos em `data/knowledge` nem
aceitar caminhos relativos de autoria.

Ao ativar outra build ou locale, a mesma `mediaKey` pode resolver para outro
`contentHash` conforme o `system_media` ativo. Caches de URLs e metadados usam a
identidade composta por versão, locale, `mediaKey` e `contentHash`, evitando
reutilizar bytes de outra versão.

Esse fluxo é exclusivo de mídias públicas de sistema. Mídias do usuário
continuam identificadas por hash em `user_media.blobs`, com escrita, remoção
lógica, status de sincronização e CAS em `vault/user`.

Os contratos nativos refletem essa diferença: operações de conhecimento recebem
`mediaKey` e resolvem o hash internamente; operações de mídia do usuário continuam
recebendo o hash. Não se adiciona `mediaKey` a `user_media` nem se mantém uma API
gravável comum aos dois ramos.

## Busca E Normalização

Os bancos armazenam campos normalizados derivados do conteúdo de cada locale.
As APIs de busca utilizam:

- nome localizado;
- aliases do locale;
- nomes localizados de relações relevantes;
- termos de taxonomia localizados;
- campos estruturais pesquisáveis definidos pelo domínio.

`@vet/app-services/search` continua responsável pela composição reutilizável das
buscas. SQL e filtros pertencentes a um domínio permanecem no repository ou
módulo dono. Nenhuma busca mantém mapas paralelos de aliases em i18n.

## Limpeza Do I18n

Remover dos bundles de i18n os conteúdos transferidos para os bancos:

- nomes de raças;
- nomes de origens usados como dados;
- descrições e seções de raças;
- aliases de catálogo;
- rótulos das taxonomias e classificações armazenadas em `system`;
- nomes e observações de protocolos públicos.

Permanecem no i18n:

- títulos e subtítulos de telas;
- ações e comandos;
- rótulos de campos e controles;
- mensagens de validação e erro;
- estados vazios;
- textos de acessibilidade da interface;
- unidades ou termos de UI que não representem uma entidade pública.

O nome do mecanismo `i18n` não é removido do projeto. A refatoração elimina
somente seu uso como banco paralelo de conhecimento.

## Remoção Das Fontes Substituídas

Após todas as leituras apontarem para os novos bancos, remover:

```text
packages/types/src/catalog/defaults/
packages/types/src/domain/pet/defaults/
packages/types/src/domain/treatment/defaults/
```

Remover também:

- agregadores TypeScript que carregam esses arquivos;
- arrays públicos de conteúdo `default*`;
- imports `import.meta.glob` de conhecimento;
- seeds de catálogo, raças e protocolos em `core-local`;
- criação e atualização de bancos `system` pelo app;
- loaders de mídia pública usados para preencher `system_media`;
- DDL, criação automática e elevação de versão de `system_media` no
  `engine/storage`;
- escrita de mídia com `StorageDomain::System`, incluindo inserção de metadados,
  geração de CAS e atualização de status;
- uso da API de autoria `write_cas_file` para produzir conteúdo de sistema; a
  instalação usa uma operação própria que exige hash e bytes já publicados;
- mapas de traduções de conhecimento substituídos;
- fallbacks que consultem as fontes removidas.

Arquivos compartilhados de tipos, validação e lógica de domínio permanecem
quando não contêm dados publicados.

Não remover nem generalizar junto com esse trabalho:

- DDL e validação de `user_media.blobs`;
- `save_media`, remoção lógica e atualização de sincronização para
  `StorageDomain::User`;
- criação e migrations de `user/main` e `user/logs`;
- replicação, exportação, importação e CAS em `vault/user`.

## Preparação Local

A raiz oferece comandos explícitos e documentados para:

```text
validar data/knowledge
gerar uma build_version integral
verificar uma build_version existente
iniciar o app com build_version e locales selecionados
```

O comando de desenvolvimento verifica a saída existente e informa o comando de
geração quando ela estiver ausente. Em seguida, prepara o locale selecionado nos
caminhos ativos do app antes de iniciar o runtime. Ele não executa o builder
silenciosamente.

O diretório `build/` é saída descartável, não é versionado e nunca se torna fonte
de verdade.

## Builds Empacotáveis

Cada build declara:

- uma `build_version` existente;
- uma lista não vazia de locales.

O empacotamento inclui somente:

- o par `system` e `system_media` de cada locale selecionado;
- a união dos hashes referenciados por esses bancos `system_media`;
- metadados necessários para validar os recursos incorporados.

Objetos CAS compartilhados são copiados uma vez. O build falha quando faltar um
banco, checksum, locale ou objeto obrigatório.

Os artefatos incorporados são uma origem somente leitura do bundle. Na primeira
ativação de um locale, a fronteira de preparação instala o par nos nomes fixos do
`app_database_dir` e incorpora os objetos ausentes no `vault/system` fragmentado.
Esse processo copia e valida bytes prontos; ele não executa DDL, seeds, geração
de thumbnail ou criação de conteúdo CAS.

A regra vale para:

```text
tauri:build
tauri:appimage
tauri:deb
tauri:msi
tauri:flatpak
```

O app instalado abre somente o par ativo nos caminhos gerenciados pelo storage.
A Parte 4 substitui a origem incorporada por releases publicadas sem mudar as
APIs de consulta de conhecimento nem o formato físico do CAS local.

## Sequência De Implementação

1. Definir configuração explícita de `build_version` e locales.
2. Implementar a preparação e instalação nos caminhos gerenciados pelo app.
3. Separar no engine os perfis graváveis de usuário dos perfis de sistema em
   somente leitura.
4. Adaptar conexões de `system` e `system_media` para o par ativo localizado.
5. Implementar o contrato estável de recursos ativos e suas validações.
6. Adaptar a leitura de `system_media` de `blobs` para `media_assets` por
   `mediaKey`.
7. Adaptar repositories e DTOs aos campos resolvidos.
8. Adaptar módulos, buscas e consumidores.
9. Implementar a troca recuperável de locale e invalidação de caches.
10. Remover o conteúdo de conhecimento do i18n.
11. Remover defaults, agregadores, seeds e produção de sistema substituídos em
    `core-local` e `engine`.
12. Integrar a preparação explícita ao desenvolvimento.
13. Integrar a seleção de locales aos builds empacotáveis.
14. Auditar que os ramos de criação e escrita de usuário permanecem funcionais.
15. Auditar imports, caminhos, termos e fontes paralelas.
16. Executar a validação integral do workspace e dos bundles.

## Testes

Cobrir:

- resolução de cada um dos seis locales;
- validação de `build-result.json`, tamanho e SHA-256;
- validação de `knowledge_build_metadata` nos dois bancos;
- validação dos fingerprints de `system` e `system_media`;
- recusa de par ausente, incompleto ou divergente;
- recusa de schema ou locale incompatível;
- abertura dos doze bancos pelas APIs de leitura;
- nomes, aliases, descrições e taxonomias corretos por locale;
- queries e buscas sem consulta a i18n de conhecimento;
- troca de locale sem reutilizar conexão ou cache anterior;
- conservação do par ativo quando a troca falha;
- leitura das mídias pelo `system_media` correspondente;
- resolução de `mediaKey` para `contentHash` e objeto CAS;
- Markdown resolvendo `knowledge-media://asset/<media-key>`;
- mesma `mediaKey` resolvendo novo conteúdo após troca de build;
- invalidação de cache de mídia após troca de locale ou hash;
- recusa de `mediaKey`, caminho físico ou URI de mídia inválida;
- detecção de objeto CAS ausente ou corrompido;
- instalação CAS em `vault/system/<2-hex>/<2-hex>/<hash>.bin`;
- recusa de artefato CAS em layout plano ou cujos prefixos não correspondam ao
  próprio hash;
- recuperação após falha em cada etapa da substituição do par ativo;
- recusa de escrita SQL, criação de schema ou elevação de versão em `system` e
  `system_media`;
- leitura de sistema por `media_assets.media_key`;
- recusa de `save_media` e atualização de sincronização para
  `StorageDomain::System`;
- criação, escrita, remoção lógica e sincronização de `user_media.blobs` sem
  regressão;
- criação e migrations dos três bancos de usuário sem regressão;
- escrita e leitura do CAS em `vault/user` sem regressão;
- ausência de imports de `data/knowledge` no runtime;
- ausência de JSONs, defaults, seeds e agregadores substituídos;
- ausência de `labelKey` nos contratos de conhecimento;
- permanência e funcionamento do i18n de interface;
- desenvolvimento com artefatos preparados;
- falha clara quando os artefatos não estão preparados;
- inicialização sem arquivos ativos instalando o locale incorporado antes de
  construir o `StorageManager`;
- ausência de criação de banco de sistema vazio durante a inicialização;
- seleção de locales no empacotamento;
- cópia da união exata dos objetos CAS;
- bundles Tauri suportados;
- `pnpm check`, `pnpm test:run`, `pnpm build` e testes Rust.

## Critérios De Aceite

- Apps e packages consultam conhecimento somente pelos bancos produzidos.
- O app não executa o builder nem lê `data/knowledge`.
- `packages/types` não armazena conteúdo público padrão.
- `core-local` não cria, semeia, atualiza ou migra bancos públicos.
- `engine/storage` não cria, eleva, semeia ou aceita escrita nos bancos públicos
  ativos.
- `knowledge_build_metadata` prova a identidade comum do par antes da abertura.
- Os contratos retornam conteúdo localizado, sem chaves de tradução.
- Busca, catálogo, raças e protocolos usam nomes e aliases dos bancos.
- O i18n contém somente textos pertencentes à interface e a outras
  responsabilidades locais legítimas.
- Não permanecem fontes paralelas nem fallbacks de conhecimento.
- O par do locale é validado e aberto como unidade indivisível.
- Entidades e Markdown compilado referenciam mídia por `mediaKey`; somente a
  fronteira de mídia conhece hashes e caminhos CAS.
- Desenvolvimento consome uma `build_version` explicitamente preparada.
- Builds empacotáveis incluem somente os locales e objetos CAS necessários.
- O app não gera bancos ou CAS em desenvolvimento, runtime ou build.
- A preparação instala os bancos nos nomes ativos do `app_database_dir` e os
  objetos no `vault/system` fragmentado.
- Bancos e CAS do usuário conservam criação, migrations, escrita, sincronização,
  replicação, exportação e importação.
- O workspace e os bundles suportados passam na validação integral.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 2: base Rails e contratos públicos](./02-rails-api-contracts.md).
