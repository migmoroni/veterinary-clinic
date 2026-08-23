#!/usr/bin/env node
import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_ROOT = resolve(ROOT, 'apps/vet-app');
const TAURI_ROOT = resolve(APP_ROOT, 'src-tauri');
const APP_ID = 'io.github.migmoroni.VeterinaryClinic';
const COMMAND = 'veterinary_clinic';
const FLATPAK_REMOTE = 'flathub';
const FLATPAK_RUNTIME = 'org.gnome.Platform';
const FLATPAK_SDK = 'org.gnome.Sdk';
const FLATPAK_RUNTIME_VERSION = '50';
const FLATPAK_DIR = resolve(ROOT, 'flatpak');
const MANIFEST = resolve(FLATPAK_DIR, `${APP_ID}.json`);
const STAGING_DIR = resolve(FLATPAK_DIR, 'staging');
const BUILD_DIR = resolve(FLATPAK_DIR, 'build-dir');
const REPO_DIR = resolve(FLATPAK_DIR, 'repo');
const BUNDLE = resolve(FLATPAK_DIR, `${APP_ID}.flatpak`);

try {
  await requireCommand('flatpak-builder', 'Install flatpak-builder to build Flatpak bundles.');
  await requireCommand('flatpak', 'Install flatpak to export single-file Flatpak bundles.');
  await requireFlatpakRef(`${FLATPAK_RUNTIME}//${FLATPAK_RUNTIME_VERSION}`);
  await requireFlatpakRef(`${FLATPAK_SDK}//${FLATPAK_RUNTIME_VERSION}`);

  await run('pnpm', ['--filter', 'vet-app', 'run', 'tauri', 'build', '--no-bundle']);
  await prepareStaging();
  await run('appstreamcli', ['validate', resolve(STAGING_DIR, `share/metainfo/${APP_ID}.metainfo.xml`)]);
  await run('desktop-file-validate', [resolve(STAGING_DIR, `share/applications/${APP_ID}.desktop`)]);
  await run('flatpak-builder', ['--force-clean', '--default-branch=stable', `--repo=${REPO_DIR}`, BUILD_DIR, `${APP_ID}.json`], {
    cwd: FLATPAK_DIR
  });
  await rm(BUNDLE, { force: true });
  await run('flatpak', ['build-bundle', REPO_DIR, BUNDLE, APP_ID, 'stable']);

  console.log(`Flatpak bundle written to ${relative(BUNDLE)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

async function prepareStaging() {
  await rm(STAGING_DIR, { recursive: true, force: true });

  await copyExecutable();
  await writeDesktopFile();
  await writeMetainfoFile();
  await copyIcons();
  await copyDocs();
}

async function copyExecutable() {
  const source = resolve(ROOT, 'target/release/veterinary_clinic');
  const target = resolve(STAGING_DIR, `bin/${COMMAND}`);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

async function writeDesktopFile() {
  const source = await readTauriFile('desktop/veterinary-clinic.appimage.desktop');
  const contents = source
    .replace(/^Icon=.*$/m, `Icon=${APP_ID}`)
    .replace(/^StartupWMClass=.*$/m, `StartupWMClass=${COMMAND}`);
  await writeStagedFile(`share/applications/${APP_ID}.desktop`, contents);
}

async function writeMetainfoFile() {
  const source = await readTauriFile('metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml');
  const contents = source.replace(
    /<launchable type="desktop-id">[^<]+<\/launchable>/,
    `<launchable type="desktop-id">${APP_ID}.desktop</launchable>`
  );
  await writeStagedFile(`share/metainfo/${APP_ID}.metainfo.xml`, contents);
}

async function copyIcons() {
  await copyTauriFile('icons/32x32.png', `share/icons/hicolor/32x32/apps/${APP_ID}.png`);
  await copyTauriFile('icons/128x128.png', `share/icons/hicolor/128x128/apps/${APP_ID}.png`);
  await copyTauriFile('icons/128x128@2x.png', `share/icons/hicolor/256x256/apps/${APP_ID}.png`);
}

async function copyDocs() {
  await copyProjectFile('LICENSE.md', 'share/doc/veterinary-clinic/LICENSE.md');
  await copyProjectFile('CHANGELOG.md', 'share/doc/veterinary-clinic/CHANGELOG.md');
}

async function copyProjectFile(sourceRelativePath, targetRelativePath) {
  const target = resolve(STAGING_DIR, targetRelativePath);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(ROOT, sourceRelativePath), target);
}

async function copyTauriFile(sourceRelativePath, targetRelativePath) {
  const target = resolve(STAGING_DIR, targetRelativePath);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(TAURI_ROOT, sourceRelativePath), target);
}

async function readTauriFile(relativePath) {
  const { readFile } = await import('node:fs/promises');
  return readFile(resolve(TAURI_ROOT, relativePath), 'utf8');
}

async function writeStagedFile(relativePath, contents) {
  const target = resolve(STAGING_DIR, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents.endsWith('\n') ? contents : `${contents}\n`);
}

async function requireCommand(command, message) {
  const result = await run(command, ['--version'], { allowFailure: true, silent: true });
  if (result !== 0) throw new Error(`${message}\nMissing command: ${command}`);
}

async function requireFlatpakRef(ref) {
  const result = await run('flatpak', ['info', ref], { allowFailure: true, silent: true });
  if (result === 0) return;

  throw new Error([
    `Missing Flatpak runtime: ${ref}`,
    'Install the required runtime before building:',
    `flatpak remote-add --if-not-exists ${FLATPAK_REMOTE} https://flathub.org/repo/flathub.flatpakrepo`,
    `flatpak install ${FLATPAK_REMOTE} ${FLATPAK_RUNTIME}//${FLATPAK_RUNTIME_VERSION} ${FLATPAK_SDK}//${FLATPAK_RUNTIME_VERSION}`
  ].join('\n'));
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      stdio: options.silent ? 'ignore' : 'inherit'
    });

    child.on('error', (error) => {
      if (options.allowFailure && error.code === 'ENOENT') {
        resolvePromise(127);
        return;
      }
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0 || options.allowFailure) {
        resolvePromise(code ?? 0);
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
    });
  });
}

function relative(path) {
  return path.replace(`${ROOT}/`, '');
}
