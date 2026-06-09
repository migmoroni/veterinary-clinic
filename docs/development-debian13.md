# Ambiente de desenvolvimento no Debian 13

Este documento registra o ambiente usado atualmente no Linux Debian 13 para desenvolver, testar, executar e empacotar o Veterinary Clinic.

## Ambiente verificado

Verificado em Debian GNU/Linux 13 (trixie), `VERSION_ID=13`, `DEBIAN_VERSION_FULL=13.4`.

Ferramentas em uso nesta maquina:

| Ferramenta | Versao verificada |
| --- | --- |
| Node.js | `v22.21.1` |
| npm | `11.11.1` |
| Rust | `rustc 1.95.0` |
| Cargo | `cargo 1.95.0` |
| rustup | `1.29.0` |
| Tauri CLI | `2.11.1` via `npx tauri`/scripts npm |
| WebKitGTK | `2.52.3` via `webkit2gtk-4.1` |

O `Cargo.toml` declara Rust minimo `1.77.2`, mas o ambiente atual usa Rust stable recente. Para evitar diferencas sutis entre maquinas, use Node 22 e Rust stable.

## Pacotes do Debian

Instale os pacotes do sistema antes de rodar `npm ci` ou qualquer comando Tauri:

```sh
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  wget \
  file \
  pkg-config \
  python3 \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libjavascriptcoregtk-4.1-dev \
  libsoup-3.0-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  dpkg-dev \
  fakeroot \
  mesa-utils
```

Notas:

- `libwebkit2gtk-4.1-dev`, `libjavascriptcoregtk-4.1-dev` e `libsoup-3.0-dev` sao a base do webview Linux usado pelo Tauri 2 no Debian 13.
- `patchelf` e necessario para gerar `.appimage` com `bundleMediaFramework: true`; sem ele o plugin GStreamer do linuxdeploy falha no empacotamento.
- `mesa-utils` fornece `glxinfo`, util para confirmar aceleracao grafica.
- `dpkg-dev` e `fakeroot` ajudam na geracao de pacote `.deb`.

Ferramentas opcionais, recomendadas para diagnosticar camera e pipeline de video:

```sh
sudo apt install -y gstreamer1.0-tools v4l-utils
```

Com elas, ficam disponiveis comandos como `gst-device-monitor-1.0` e `v4l2-ctl`.

## Node e Rust

Use qualquer gerenciador de versoes que mantenha Node 22 disponivel, por exemplo `nvm`, `fnm` ou `asdf`. O projeto usa `package-lock.json`, entao em maquinas limpas prefira:

```sh
npm ci
```

Para Rust, instale via `rustup` e use a toolchain stable:

```sh
rustup toolchain install stable
rustup default stable
rustup update
```

Nao e necessario instalar `@tauri-apps/cli` globalmente. Use os scripts do `package.json`, que chamam a CLI local instalada em `node_modules`.

## Primeira preparacao do projeto

Na raiz do projeto:

```sh
cd /home/miguel/Projects/proprios/veterinary-clinic
npm ci
```

Depois valide que o ambiente esta saudavel:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Executar em desenvolvimento

Para executar o aplicativo desktop com Tauri:

```sh
npm run tauri:dev
```

Esse comando ja executa o frontend configurado em `src-tauri/tauri.conf.json` por meio de `beforeDevCommand: npm run dev`. Em geral, nao precisa iniciar `npm run dev` em outro terminal antes.

Para remover o banco SQLite local de desenvolvimento, o armazenamento local do WebView e iniciar o Tauri em seguida:

```sh
npm run tauri:dev:new
```

Esse comando executa `scripts/new-state.mjs`, aguarda 1 segundo e entao chama o fluxo normal de `npm run tauri:dev`. A limpeza remove o banco de dados, de "~/.config/app.veterinary-clinic.local/veterinary_clinic.db" e tambem remove `localStorage`, cujo diretorio é "~/.local/share/app.veterinary-clinic.local/localstorage", incluindo a lista recente da busca.

Para testar apenas a camada web no navegador, sem shell Tauri e sem todos os recursos nativos:

```sh
npm run dev
```

Para visualizar o build web estatico:

```sh
npm run build
npm run preview
```

## Banco SQLite local

O banco de runtime se chama `veterinary_clinic.db` e e aberto via `tauri-plugin-sql`; o app nao usa `rusqlite` diretamente.

No Debian atual, o arquivo local aparece em:

```sh
~/.config/app.veterinary-clinic.local/veterinary_clinic.db
```

Na primeira execucao, o app pergunta se deve importar uma base SQLite compativel ou criar uma base vazia. Para reiniciar o estado local durante desenvolvimento, feche o app e remova ou renomeie esse arquivo.
O atalho `npm run tauri:dev:new` faz essa limpeza automaticamente antes de iniciar o app em modo dev, incluindo armazenamento web como o historico recente da busca.

## Camera e video no Linux

O fluxo de avatar usa `navigator.mediaDevices.getUserMedia()` dentro do WebKitGTK. No backend Tauri Linux, `src-tauri/src/lib.rs` habilita explicitamente:

- `enable-media`
- `enable-webrtc`
- `enable-media-stream`
- permissao para `UserMediaPermissionRequest`
- permissao para `DeviceInfoPermissionRequest`
- `hardware-acceleration-policy = Always`

O usuario precisa ter acesso aos dispositivos de video. Nesta maquina, o usuario `miguel` esta no grupo `video`, e ha dispositivos `/dev/video0` a `/dev/video3` e `/dev/media0` a `/dev/media1`.

Para preparar outro usuario:

```sh
sudo usermod -aG video "$USER"
```

Depois faca logout/login para a sessao recarregar os grupos.

Comandos uteis para conferir permissao e dispositivos:

```sh
groups
ls -l /dev/video* /dev/media*
```

Com ferramentas opcionais instaladas:

```sh
v4l2-ctl --list-devices
v4l2-ctl --device=/dev/video0 --list-formats-ext
gst-device-monitor-1.0 Video/Source
```

## Aceleracao grafica

No ambiente atual, `glxinfo -B` mostra renderizacao direta e acelerada via Intel/Mesa:

```text
direct rendering: Yes
Vendor: Intel
Device: Mesa Intel(R) Graphics (ADL GT2)
Accelerated: yes
```

Para conferir em outra maquina:

```sh
glxinfo -B
```

Se aparecer renderizacao por software, a camera e o webview podem ficar menos fluidos mesmo com o app configurado corretamente.

## Checks de desenvolvimento

Use estes comandos antes de abrir PR ou gerar bundle:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Bundles desktop no Debian

AppImage:

```sh
npm run tauri:appimage
```

O AppImage inclui suporte de midia por causa de `bundle.linux.appimage.bundleMediaFramework = true` em `src-tauri/tauri.conf.json`; isso requer `patchelf` no PATH.

Deb:

```sh
npm run tauri:deb
```

MSI deve ser gerado no Windows ou em CI apropriado:

```sh
npm run tauri:msi
```

## Conversor legado

O conversor legado fica em `legacy-to-sqlite/`. Ele le `dist/old-clinic.csv` dentro desse diretorio e grava `build/veterinary_clinic.db`.

O banco gerado segue sempre o schema canonico atual, incluindo os perfis locais vazios de veterinario e local de trabalho, o endereco da clinica e os vinculos compartilhados de contato em `owner_contacts`.

Preparacao e execucao:

```sh
cd legacy-to-sqlite
npm ci
mkdir -p dist build
# coloque o CSV legado em dist/old-clinic.csv
npm run build:csv
npm run csv
```

O arquivo gerado pode ser importado pelo app na primeira execucao ou pelo fluxo de importacao de dados.

## Rebuild de banco exportado

A partir da versao `0.2.0`, o app pode entrar em teste de producao com um unico cliente. Como ainda nao existe contrato de migracao multi-cliente no runtime, atualizacoes de bancos exportados devem passar por um processo externo em `legacy-to-sqlite/`.

O rebuild de banco exportado le um arquivo `.db`, `.sqlite` ou `.sqlite3` em `legacy-to-sqlite/dist` e grava `legacy-to-sqlite/build/veterinary_clinic.db`:

```sh
cd legacy-to-sqlite
npm run build:exported-db
npm run exported-db
```

Se houver mais de um banco em `dist`, informe a origem explicitamente:

```sh
npm run exported-db -- --source dist/export-veterinary-clinic.db
```

Ao usar `npm run`, os argumentos do script precisam vir depois de `--`. O conversor tambem aceita `node exported-db-to-sqlite.js --source dist/export-veterinary-clinic.db` e resolve nomes simples como `--source export-veterinary-clinic.db` dentro de `dist` quando o arquivo existir.

Na `0.2.0`, esse processo nao aplica transformacoes estruturais. Ele valida as tabelas e colunas esperadas, executa `PRAGMA integrity_check` e `PRAGMA foreign_key_check`, e cria uma copia limpa para importacao/teste. Futuras transformacoes entre versoes devem ser implementadas nesse conversor externo, nao em `src/lib/persistence/sqlite/migrations.ts`.

## Scripts npm principais

| Script | Uso |
| --- | --- |
| `npm run dev` | Vite dev server web-only |
| `npm run tauri:dev` | App desktop Tauri em desenvolvimento |
| `npm run check` | `svelte-check` com `tsconfig.json` |
| `npm run test:run` | Vitest em modo nao interativo |
| `npm run build` | Build web estatico via SvelteKit |
| `npm run tauri:appimage` | Bundle AppImage |
| `npm run tauri:deb` | Bundle `.deb` |

Scripts principais dentro de `legacy-to-sqlite/`:

| Script | Uso |
| --- | --- |
| `npm run build:csv` | Compila o conversor do CSV legado |
| `npm run csv` | Gera `build/veterinary_clinic.db` a partir de `dist/old-clinic.csv` |
| `npm run build:exported-db` | Compila o rebuild de banco exportado da app |
| `npm run exported-db` | Rebuilda um SQLite exportado de `dist` para `build/veterinary_clinic.db` |

## Diagnostico rapido

```sh
node --version
npm --version
rustc --version
cargo --version
npx tauri --version
pkg-config --modversion webkit2gtk-4.1
command -v patchelf
glxinfo -B
groups
ls -l /dev/video* /dev/media*
```

Se algum comando falhar, confira os pacotes apt acima e reinstale dependencias antes de investigar o app.
