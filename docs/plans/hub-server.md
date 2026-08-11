Você é um Engenheiro de Software Sênior e Arquiteto de Sistemas. A sua tarefa é inicializar e estruturar do zero o projeto `hub-server` dentro do nosso monorepo modular, seguindo as melhores práticas do Ruby on Rails 8.

---

### 🎯 Contexto e Responsabilidades do Hub Server
O `hub-server` é um servidor de código aberto responsável por:
1. **Gestão de Releases e Auto-Update:** Servir o manifesto JSON e redirecionamentos de download para o plugin de auto-update das aplicações Tauri (`@tauri-apps/plugin-updater`).
2. **Distribuição da Base de Conhecimento:** Servir os bancos de dados estático compilados (`vet_system.db.gz` e `vet_system_media.db.gz`) e mídias CAS.
3. **API Interna para Publicação:** Expor endpoints autenticados via Bearer Token para processos de publicação registrarem novas compilações de bancos e binários.

---

### 📂 Localização no Monorepo
- **Caminho da aplicação:** `apps/hub-server/`.

---

### 🛠️ Especificações Técnicas

1. **Stack & Opções de Inicialização:**
   - Ruby on Rails 8 em modo API (`rails new apps/hub-server --api --database=sqlite3 --skip-asset-pipeline`).
   - Utilizar as gems nativas do Rails 8 (`solid_queue`, `solid_cache`).
   - Configuração do `config/initializers/cors.rb` para permitir requisições das origens locais e de produção das aplicações.

2. **Estrutura de Rotas e Controlo de Versão (`config/routes.rb`):**
   A API deve ser versionada sob o namespace `/api/v1/`:

   - **Healthcheck:**
     - `GET /up` (Nativo do Rails 8)
     - `GET /api/v1/health`

   - **Gestão da Base de Conhecimento (Knowledge DB):**
     - `GET /api/v1/knowledge/version` -> Retorna a versão atual, checksum SHA-256 e tamanho do `vet_system.db.gz`.
     - `GET /api/v1/knowledge/download` -> Download do ficheiro `vet_system.db.gz`.
     - `GET /api/v1/knowledge/media/download` -> Download do ficheiro `vet_system_media.db.gz`.

   - **Servidor de Auto-Update do Tauri (`@tauri-apps/plugin-updater`):**
     - `GET /api/v1/updates/:target/:current_version` -> Retorna o JSON de manifesto do Tauri contendo a versão mais recente, notas da release, assinaturas e URLs dos binários para cada plataforma (`windows-x86_64`, `darwin-aarch64`, `linux-x86_64`).

   - **API Interna de Publicação (Protegida):**
     - `POST /api/v1/internal/releases` -> Recebe dados de processos de publicação para registrar novas releases de software e atualizações do banco estático.

3. **Autenticação da API Interna:**
   - Criar um Concern ou Middleware simples (`AuthenticateInternalApi`) que valida o cabeçalho `Authorization: Bearer <INTERNAL_RELEASE_TOKEN>` consultando a variável de ambiente `INTERNAL_RELEASE_TOKEN`.

4. **Modelos e Migrações de Dados Inicial (SQLite):**
   - **`Release`**: `app_name` (string), `version` (string), `notes` (text), `published_at` (datetime).
   - **`ReleaseArtifact`**: `release_id` (foreign key), `platform` (string), `url` (string), `signature` (text), `checksum` (string).
   - **`KnowledgeRelease`**: `version` (string), `db_checksum` (string), `media_checksum` (string), `db_url` (string), `media_url` (string), `published_at` (datetime).

5. **Organização do Código:**
   - Controllers organizados em `app/controllers/api/v1/` e `app/controllers/api/v1/internal/`.
   - Services para isolar a lógica de geração de manifestos em `app/services/tauri_updater_service.rb`.

---

### 📋 Gates de Qualidade e Entrega
Após gerar o código, execute e garanta que os seguintes comandos passem sem erros:
1. `bin/rails db:prepare` (Criação e migração do banco SQLite local).
2. `bin/rails test` (Criação de pelo menos um teste de integração para cada rota criada).
3. `bin/rails server` (Subida limpa do servidor na porta 3000 ou 3333).

Por favor, proceda com a inicialização e escrita dos ficheiros necessários.
