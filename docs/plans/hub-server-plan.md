# Plano Do Hub Server

Atualizado em 2026-08-04.

## Objetivo

`hub-server` é o hub aberto do ecossistema. Ele deve prover dados
publicos, pacotes versionados, updates e builds dos apps.

Ele nao e o backend operacional do SaaS. Operacoes comerciais, billing,
sincronizacao privada, recursos fechados e dados privados de usuarios ficam em
outro servidor, fora do escopo deste repositorio publico.

## Responsabilidades

`hub-server` deve concentrar:

- dados fonte publicos;
- geracao dos bancos publicos de referencia;
- publicacao de pacotes prontos para os apps;
- manifests de versao e compatibilidade;
- updates completos ou incrementais;
- catalogo publico de releases;
- empacotamento e disponibilizacao dos apps para download.

## Dados Publicos

Os dados fonte publicos ficam no `hub-server`, nao dentro dos apps.

Entram aqui:

- racas;
- fabricantes;
- produtos;
- principios ativos;
- condicoes clinicas;
- protocolos publicos;
- midias publicas associadas aos catalogos;
- metadados necessarios para montar pacotes de referencia.

O app deve receber esses dados como artefatos prontos e versionados. Ele nao
deve carregar os JSONs fonte nem gerar esses bancos dentro do runtime do app.

## Bancos E Pacotes Gerados

O `hub-server` deve gerar e publicar artefatos como:

- banco `system`;
- banco `system_media`;
- arvore ou pacote `CAS/system`;
- manifest de versao;
- hashes de integridade;
- metadados de compatibilidade com versoes dos apps;
- changelog tecnico dos dados publicados.

Os apps baixam, validam e instalam esses artefatos pelo fluxo de distribuicao e
atualizacao.

## Updates Para Apps

O app deve conseguir perguntar ao `hub-server`:

- qual e a versao atual dos dados publicos;
- se existe update compativel com a versao local;
- quais arquivos precisam ser baixados;
- quais hashes devem ser conferidos;
- qual changelog acompanha a atualizacao.

Quando possivel, o servidor pode oferecer updates incrementais. Quando isso nao
for pratico, ele pode oferecer pacote completo.

## Builds E Downloads

O `hub-server` tambem pode ser o ponto publico de distribuicao dos apps:

- releases do `vet-app`;
- releases futuros de `lab-app`, `customer-app`, `store-app`, `cleaner-app` e
  `pharma-app`;
- checksums;
- assinatura dos artefatos, quando existir;
- metadados de plataforma;
- changelog de release;
- links publicos de download.

O servidor pode empacotar builds diretamente ou registrar artefatos gerados por
CI. O ponto importante e que ele seja a fonte publica organizada para descobrir
e baixar versoes dos apps.

## Rails

Rails entra como base do `hub-server` para:

- painel administrativo dos dados publicos;
- validacao dos dados fonte;
- tarefas de geracao de pacotes;
- APIs publicas de manifests e downloads;
- historico de publicacao;
- controle de compatibilidade entre dados e apps.

## Modo Desenvolvimento

Em desenvolvimento, os apps tambem devem consumir dados prontos gerados pelo
`hub-server`, usando servidor local, fixture publicada ou snapshot gerado por
tarefa do proprio `hub-server`.

A regra continua a mesma: o app nao deve voltar a carregar JSONs fonte dos
catalogos publicos nem assumir a responsabilidade de gerar os bancos publicos.

## Fora De Escopo

Nao entram no `hub-server`:

- prontuarios de usuarios;
- tutores e pets privados;
- contas comerciais;
- assinatura ou billing;
- permissoes comerciais;
- sincronizacao privada do SaaS;
- recursos fechados;
- regras operacionais do servidor comercial.

Essas responsabilidades pertencem a outro servidor, fechado, fora do escopo
deste plano.

## Ordem De Implementacao

1. Definir schema dos dados fonte publicos no Rails.
2. Migrar dados fonte publicos para o `hub-server`.
3. Criar tarefas de validacao dos dados fonte.
4. Criar tarefas de geracao de `system`, `system_media` e `CAS/system`.
5. Publicar manifests de versao, hashes e compatibilidade.
6. Ajustar os apps para consumir pacotes prontos.
7. Remover dependencia dos apps em JSONs fonte publicos.
8. Adicionar fluxo de update de dados publicos.
9. Adicionar catalogo publico de releases/builds dos apps.

## Criterios De Aceite

- Os apps nao carregam JSONs fonte publicos.
- Os apps nao geram bancos publicos de referencia em runtime.
- `hub-server` gera e publica `system`, `system_media` e `CAS/system`.
- Cada pacote publicado tem manifest, versao, hash e compatibilidade declarada.
- O app consegue detectar e instalar update de dados publicos.
- O servidor publica metadados e downloads dos apps.
- Nenhuma regra SaaS fechada entra no `hub-server`.
