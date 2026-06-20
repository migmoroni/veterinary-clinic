#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nextVersion = process.argv[2];
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!nextVersion || !SEMVER_PATTERN.test(nextVersion)) {
	console.error('Usage: npm run version:bump -- <semver>');
	process.exit(1);
}

async function readText(relativePath) {
	return readFile(resolve(ROOT, relativePath), 'utf8');
}

async function writeText(relativePath, contents) {
	await writeFile(resolve(ROOT, relativePath), contents);
}

async function updateJson(relativePath, updater) {
	const contents = await readText(relativePath);
	const json = JSON.parse(contents);
	updater(json);
	await writeText(relativePath, `${JSON.stringify(json, null, '\t')}\n`);
}

function replaceOrFail(contents, pattern, replacement, fileName) {
	const updated = contents.replace(pattern, replacement);
	if (updated === contents) throw new Error(`Could not update ${fileName}`);
	return updated;
}

await updateJson('package.json', (json) => {
	json.version = nextVersion;
	json.scripts ??= {};
	json.scripts['version:bump'] ??= 'node scripts/bump-version.mjs';
});

await updateJson('package-lock.json', (json) => {
	json.version = nextVersion;
	json.packages ??= {};
	json.packages[''] ??= {};
	json.packages[''].version = nextVersion;
});

await updateJson('src-tauri/tauri.conf.json', (json) => {
	json.version = nextVersion;
});

const cargoToml = await readText('src-tauri/Cargo.toml');
await writeText('src-tauri/Cargo.toml', replaceOrFail(cargoToml, /(\[package\][\s\S]*?\nversion = ")[^"]+(")/, `$1${nextVersion}$2`, 'src-tauri/Cargo.toml'));

const cargoLock = await readText('src-tauri/Cargo.lock');
await writeText(
	'src-tauri/Cargo.lock',
	replaceOrFail(cargoLock, /(\[\[package\]\]\nname = "veterinary_clinic"\nversion = ")[^"]+(")/, `$1${nextVersion}$2`, 'src-tauri/Cargo.lock')
);

await writeText('src/lib/generated/app-version.ts', `export const APP_VERSION = '${nextVersion}';\n`);

console.log(`Version bumped to ${nextVersion}`);
