# Ambiente de desenvolvimento no Debian 13

Este documento registra o ambiente usado atualmente no Linux Debian 13 para desenvolver, testar, executar e empacotar o Veterinary Clinic.

## Ambiente verificado

Verificado em Debian GNU/Linux 13 (trixie), `VERSION_ID=13`, `DEBIAN_VERSION_FULL=13.4`.

Ferramentas em uso nesta maquina:

| Ferramenta | Versao verificada |
| --- | --- |
| Node.js | `v22.21.1` |
| pnpm | `11.22.0` |
| Rust | `rustc 1.95.0` |
| Cargo | `cargo 1.95.0` |
| rustup | `1.29.0` |
| Tauri CLI | `2.11.1` via scripts pnpm |
| WebKitGTK | `2.52.3` via `webkit2gtk-4.1` |

O `Cargo.toml` declara Rust minimo `1.77.2`, mas o ambiente atual usa Rust stable recente. Para evitar diferencas sutis entre maquinas, use Node 22.x e Rust stable.

## Pacotes do Debian

Instale os pacotes do sistema antes de rodar `pnpm install --frozen-lockfile` ou
qualquer comando Tauri:

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
  mesa-utils \
  libclang-dev \
  clang

```

Notas:

- `libwebkit2gtk-4.1-dev`, `libjavascriptcoregtk-4.1-dev` e `libsoup-3.0-dev` sao a base do webview Linux usado pelo Tauri 2 no Debian 13.
- `patchelf` e necessario para gerar `.appimage` com `bundleMediaFramework: true`; sem ele o plugin GStreamer do linuxdeploy falha no empacotamento.
- `mesa-utils` fornece `glxinfo`, util para confirmar aceleracao grafica.
- `dpkg-dev` e `fakeroot` ajudam na geracao de pacote `.deb`.
- `libclang-dev` e `clang` são necessários para compilar bundle de rusqlite.


Ferramentas opcionais, recomendadas para diagnosticar camera e pipeline de video:

```sh
sudo apt install -y gstreamer1.0-tools v4l-utils
```

Com elas, ficam disponiveis comandos como `gst-device-monitor-1.0` e `v4l2-ctl`.

Ferramentas opcionais para gerar e validar Flatpak:

```sh
sudo apt install -y flatpak flatpak-builder appstream desktop-file-utils
```

Notas:

- `flatpak` fornece o runtime, a instalacao local e o comando `flatpak build-bundle` usado para gerar o arquivo `.flatpak` final.
- `flatpak-builder` executa o manifesto em `flatpak/io.github.migmoroni.VeterinaryClinic.json`.
- `appstream` fornece `appstreamcli`, usado para validar o metainfo antes e durante o build Flatpak.
- `desktop-file-utils` fornece `desktop-file-validate`, usado para validar o arquivo `.desktop` exportado.

## Node e Rust

Use qualquer gerenciador de versões que mantenha Node 22.x disponível, por
exemplo `nvm`, `fnm` ou `asdf`. O arquivo `.nvmrc` seleciona a versão instalada
mais recente da linha 22.x. Ative o Corepack distribuído com Node 22.x e
confirme a versão fixada em `packageManager`:

O contrato `engines` aceita Node.js `>=22.0.0`; a linha 22.x é a versão
recomendada e verificada para o desenvolvimento local.

```sh
nvm use
corepack enable
pnpm --version
pnpm install --frozen-lockfile
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
pnpm install --frozen-lockfile
```

Depois valide que o ambiente esta saudavel:

```sh
pnpm check
pnpm test:run
pnpm build
cargo check --workspace
```

## Executar em desenvolvimento

Para executar o aplicativo desktop com Tauri:

```sh
pnpm tauri:dev
```

Esse comando já executa a UI configurada em
`apps/vet-app/src-tauri/tauri.conf.json` por meio de
`beforeDevCommand: pnpm run dev`. Em geral, não é necessário iniciar `pnpm dev`
em outro terminal antes.

Para remover o banco SQLite local de desenvolvimento, o armazenamento local do WebView e iniciar o Tauri em seguida:

```sh
pnpm tauri:dev:new
```

Esse comando executa `scripts/new-state.mjs`, aguarda 1 segundo e então chama o
fluxo normal de `pnpm tauri:dev`. A limpeza remove o estado local de
desenvolvimento do app, incluindo bancos SQLite, WAL/SHM, CAS em `vault/`, fila
e baselines de `replication/`, armazenamento do WebView e cache. Diretórios de
saída do usuário, como `backups/`, `exports/`, `import_safety_exports/` e pastas
de backup contínuo rotuladas como `Veterinary Clinic - <database_id>`, são
preservados.

Para testar apenas a camada web no navegador, sem shell Tauri e sem todos os recursos nativos:

```sh
pnpm dev
```

Para visualizar a construcao web estatica:

```sh
pnpm build
pnpm preview
```

## Banco SQLite local

O app usa `StorageManager` em Rust com `rusqlite`. A UI acessa dados por
comandos Tauri.

O conjunto de usuario em execucao e composto por:

No Debian atual, o arquivo local aparece em:

```sh
~/.local/share/app.veterinary-clinic.local/databases/veterinary_clinic_user.db
~/.local/share/app.veterinary-clinic.local/databases/veterinary_clinic_user_media.db
~/.local/share/app.veterinary-clinic.local/databases/veterinary_clinic_user_logs.db
~/.local/share/app.veterinary-clinic.local/vault/user/
```

Na primeira execucao, o app pergunta se deve importar uma base SQLite compativel ou criar uma base vazia. Para reiniciar o estado local durante desenvolvimento, feche o app e remova ou renomeie esse arquivo.
O atalho `pnpm tauri:dev:new` faz essa limpeza automaticamente antes de iniciar
o app em modo dev, incluindo bancos do usuário, índices de mídia, CAS local,
fila de replicação e armazenamento web como o histórico recente da busca.

## Camera e video no Linux

O fluxo de avatar usa `navigator.mediaDevices.getUserMedia()` dentro do WebKitGTK. Na camada Rust do Tauri Linux, `apps/vet-app/src-tauri/src/lib.rs` habilita explicitamente:

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

## Verificações de desenvolvimento

Use estes comandos antes de abrir PR ou gerar pacote:

```sh
pnpm check
pnpm test:run
pnpm build
cargo check --workspace
```

## Pacotes desktop no Debian

AppImage:

```sh
pnpm tauri:appimage
```

O AppImage inclui suporte de midia por causa de `bundle.linux.appimage.bundleMediaFramework = true` em `apps/vet-app/src-tauri/tauri.conf.json`; isso requer `patchelf` no PATH.

Deb:

```sh
pnpm tauri:deb
```

MSI deve ser gerado no Windows ou em CI apropriado:

```sh
pnpm tauri:msi
```

Flatpak:

```sh
pnpm tauri:flatpak
```

O Tauri não possui `flatpak` como alvo nativo de `tauri build --bundles`; neste
projeto o Flatpak é gerado por `scripts/build-flatpak.mjs`. O script primeiro
executa `pnpm tauri build --no-bundle`, copia o binário Tauri e os metadados
Linux para `flatpak/staging`, valida AppStream e desktop file, executa
`flatpak-builder` e então exporta o pacote único:

```text
flatpak/io.github.migmoroni.VeterinaryClinic.flatpak
```

Antes do primeiro build Flatpak, adicione o Flathub e instale o runtime/SDK usados pelo manifesto:

```sh
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub org.gnome.Platform//50 org.gnome.Sdk//50
```

O manifesto atual usa `org.gnome.Platform//50` e `org.gnome.Sdk//50`. Se o Flathub avisar que esse branch entrou em fim de vida, atualize juntos:

- `FLATPAK_RUNTIME_VERSION` em `scripts/build-flatpak.mjs`
- `runtime-version` em `flatpak/io.github.migmoroni.VeterinaryClinic.json`
- os comandos documentados em `flatpak/README.md` e neste arquivo

Para instalar e executar o pacote localmente:

```sh
flatpak install --user flatpak/io.github.migmoroni.VeterinaryClinic.flatpak
flatpak run io.github.migmoroni.VeterinaryClinic
```

Para conferir rapidamente se o ambiente Flatpak esta pronto:

```sh
command -v flatpak
command -v flatpak-builder
flatpak info org.gnome.Platform//50
flatpak info org.gnome.Sdk//50
```

## Conversor legado

O conversor legado fica em `legacy-to-sqlite/`. O script atual de adocao le
`dist/veterinary_clinic-version-1.user.db` e gera em `build/` o conjunto de
usuario atual:

```sh
legacy-to-sqlite/build/veterinary_clinic_user.db
legacy-to-sqlite/build/veterinary_clinic_user_media.db
legacy-to-sqlite/build/veterinary_clinic_user_logs.db
legacy-to-sqlite/build/veterinary_clinic_user_import.zip
```

O pacote ZIP gerado segue o formato nativo de `distribution` e pode ser
importado pelo app.

Preparação e execução pela raiz do workspace:

```sh
mkdir -p legacy-to-sqlite/dist legacy-to-sqlite/build
# coloque o banco base em legacy-to-sqlite/dist/veterinary_clinic-version-1.user.db
pnpm adopt:version
```

O arquivo gerado pode ser importado pelo app na primeira execucao ou pelo fluxo de importacao de dados.

## Rebuild de banco exportado

Os scripts antigos de rebuild foram preservados em `legacy-to-sqlite/old_scripts`
apenas como referencia historica. O fluxo atual para preparar um pacote
importável é `pnpm adopt:version`.

Se for necessario reconstruir uma base antiga durante desenvolvimento, trate o
arquivo gerado como entrada para o script de adocao atual, nao como banco final
do app.

Comando principal:

```sh
pnpm adopt:version
```

## Scripts pnpm principais

| Script | Uso |
| --- | --- |
| `pnpm dev` | Vite dev server web-only |
| `pnpm tauri:dev` | App desktop Tauri em desenvolvimento |
| `pnpm check` | `svelte-check` com `tsconfig.json` |
| `pnpm test:run` | Vitest em modo não interativo |
| `pnpm build` | Construção web estática via SvelteKit |
| `pnpm tauri:appimage` | Pacote AppImage |
| `pnpm tauri:deb` | Pacote `.deb` |
| `pnpm tauri:flatpak` | Pacote `.flatpak` via `flatpak-builder` |

Scripts principais dentro de `legacy-to-sqlite/`:

| Script | Uso |
| --- | --- |
| `pnpm adopt:version` | Gera o conjunto atual de usuário e ZIP nativo a partir de `legacy-to-sqlite/dist/veterinary_clinic-version-1.user.db` |

## Diagnostico rapido

```sh
node --version
pnpm --version
rustc --version
cargo --version
pnpm tauri --version
pkg-config --modversion webkit2gtk-4.1
command -v patchelf
command -v flatpak
command -v flatpak-builder
flatpak info org.gnome.Platform//50
flatpak info org.gnome.Sdk//50
glxinfo -B
groups
ls -l /dev/video* /dev/media*
```

Se algum comando falhar, confira os pacotes apt acima e reinstale dependencias antes de investigar o app.
