# Política De Backup

O app possui dois mecanismos diferentes de movimentação de dados. Eles não
compartilham a mesma implementação:

- **Distribuição**: importação/exportação explícita de pacotes completos.
- **Replicação**: backup/sincronização contínua baseada em patches.

## Backup Contínuo

Backup contínuo é implementado em `src-tauri/src/replication`.

A UI pode chamar isso de "backup", mas internamente é replicação local-first
(primeiro local):

```text
Bancos do app -> capture -> outbox -> local_mirror / cloud_client
local_mirror / cloud_client -> applier -> bancos do app -> outbox para outros destinos
```

Para um destino local/USB/NAS, a pasta escolhida é tratada como raiz. O app cria
ou reutiliza uma subpasta rotulada:

```text
Veterinary Clinic - <database_id>
```

O rótulo é apenas visual. A fonte de verdade é a tabela `database_manifest`
dentro de `veterinary_clinic_user_logs.db` e do
`base_veterinary_clinic_user_logs.db` do espelho local.

O espelho local guarda:

```text
base_veterinary_clinic_user.db
base_veterinary_clinic_user_media.db
base_veterinary_clinic_user_logs.db
userMedia/vault/xx/yy/<hash_sha256>.bin
```

Replicação recusa misturar dados quando o espelho selecionado possui
`database_id` diferente.

## Exportação E Importação Completa

Pacotes locais completos são implementados em `src-tauri/src/distribution`.

Pacote ZIP nativo:

```text
data/
  veterinary_clinic_user.db
  veterinary_clinic_user_media.db
  veterinary_clinic_user_logs.db
vault/
  user/
    xx/
      yy/
        <hash_sha256>.bin
```

Pacote ZIP CSV:

```text
data_csv/
media_csv/
logs_csv/
vault/user/
```

Bancos SQLite são exportados com `VACUUM INTO`. Arquivos `.db` ativos não são
copiados diretamente, pois sidecars WAL/SHM poderiam tornar uma cópia bruta
inconsistente.

Exportação CSV inclui o banco de logs. Isso é necessário porque
`database_manifest` e logs de exclusão definitiva fazem parte do conjunto
lógico de dados do usuário.

## Segurança Antes De Importar

Antes de importar sobre o conjunto atual, `distribution` pede para `replication`
preparar a importação:

1. se houver destino de backup configurado, `replication` tenta uma sincronização
   final;
2. se a sincronização final der certo, a importação pode seguir sem pacote extra;
3. se falhar ou não houver destino, `distribution` cria uma exportação nativa de
   segurança em `AppData/import_safety_exports/`;
4. o user DB, media DB, logs DB e CAS ativos são substituídos;
5. a UI reabre o storage do usuário e limpa estado client-side.

Quando a importação vem de uma pasta de espelho local, `distribution` retorna a
raiz do espelho como `replicationTargetPath`, permitindo que a UI configure essa
mesma pasta para backup contínuo novamente.

## Histórico

`backup_history` permanece como tabela de histórico visível ao usuário. Ela
registra backup manual, exportação, importação e exportação de segurança antes
de importação.

Ela é metadado de UI/histórico, não a fonte de implementação do backup contínuo.

## Regras

- Backup contínuo pertence a `replication`.
- Importação/exportação completa pertence a `distribution`.
- Primitivas de storage ativo e CAS pertencem a `storage`.
- Não criar `manifest.json` solto; a identidade da base vive em `user_logs.db`.
- Não copiar SQLite ativo diretamente. Usar `VACUUM INTO`.
- Não exportar tabelas de catálogo/referência do sistema como CSV do usuário.
