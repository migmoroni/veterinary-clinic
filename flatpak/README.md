# Flatpak Build

Tauri does not expose Flatpak as a native `tauri build --bundles` target. This project builds the Tauri release binary first, then packages that binary and the Linux desktop metadata with `flatpak-builder`.

## Requirements

Install Flatpak tooling and the GNOME runtime/SDK used by the manifest:

```sh
sudo apt install flatpak flatpak-builder
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub org.gnome.Platform//50 org.gnome.Sdk//50
```

## Build

From the project root:

```sh
npm run tauri:flatpak
```

The script writes generated files under `flatpak/staging`, `flatpak/build-dir`, and `flatpak/repo`, then creates:

```text
flatpak/io.github.migmoroni.VeterinaryClinic.flatpak
```

If the runtime or SDK is missing, the script exits before compiling the Tauri app and prints the `flatpak install` command needed to continue.

## Install Locally

```sh
flatpak install --user flatpak/io.github.migmoroni.VeterinaryClinic.flatpak
flatpak run io.github.migmoroni.VeterinaryClinic
```

## Manifest

The manifest is `flatpak/io.github.migmoroni.VeterinaryClinic.json`. It exports:

- the Tauri binary as `/app/bin/veterinary_clinic`
- the desktop file as `io.github.migmoroni.VeterinaryClinic.desktop`
- the AppStream metainfo as `io.github.migmoroni.VeterinaryClinic.metainfo.xml`
- hicolor icons
- license and changelog documentation

The sandbox permissions are intentionally narrow: Wayland/X11 fallback, GPU rendering, PulseAudio, IPC, and network access for online lookups such as ViaCEP.