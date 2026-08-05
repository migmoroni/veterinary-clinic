import { readJson, readText, replaceOrFail, updateJson, writeText } from './io.mjs';

export const APP_PACKAGE_JSON = 'apps/vet-app/package.json';
export const APPSTREAM_METAINFO = 'apps/vet-app/src-tauri/metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml';
export const CARGO_LOCK = 'Cargo.lock';
export const GENERATED_APP_VERSION = 'packages/core-local/src/generated/app-version.ts';
export const TAURI_CARGO_TOML = 'apps/vet-app/src-tauri/Cargo.toml';
export const TAURI_CONFIG = 'apps/vet-app/src-tauri/tauri.conf.json';

const PACKAGE_JSON_FILES = [
	'package.json',
	APP_PACKAGE_JSON,
	'packages/core-local/package.json',
	'packages/modules/package.json',
	'packages/types/package.json',
	'packages/ui/package.json'
];

const CARGO_TOML_FILES = [
	TAURI_CARGO_TOML,
	'packages/core-rust/Cargo.toml'
];

const CARGO_LOCK_PACKAGES = [
	'veterinary_clinic',
	'vet-core-rust'
];

export async function readCurrentVersion() {
	const packageJson = await readJson('package.json');
	if (typeof packageJson.version !== 'string') throw new Error('package.json version is missing');
	return packageJson.version;
}

export async function updateAppVersionFiles(nextVersion) {
	for (const filePath of PACKAGE_JSON_FILES) {
		await updateJson(filePath, (json) => {
			json.version = nextVersion;
			if (filePath === 'package.json') {
				json.scripts ??= {};
				json.scripts['version:bump'] = 'node scripts/bump-version/index.mjs';
			}
		});
	}

	await updateJson('package-lock.json', (json) => {
		json.version = nextVersion;
		json.packages ??= {};
		for (const filePath of PACKAGE_JSON_FILES) {
			const packageKey = filePath === 'package.json' ? '' : filePath.replace(/\/package\.json$/, '');
			json.packages[packageKey] ??= {};
			json.packages[packageKey].version = nextVersion;
		}
	});

	await updateJson(TAURI_CONFIG, (json) => {
		json.version = nextVersion;
	});

	for (const filePath of CARGO_TOML_FILES) {
		const cargoToml = await readText(filePath);
		await writeText(
			filePath,
			replaceOrFail(cargoToml, /(\[package\][\s\S]*?\nversion = ")[^"]+(")/, `$1${nextVersion}$2`, filePath)
		);
	}

	let cargoLock = await readText(CARGO_LOCK);
	for (const packageName of CARGO_LOCK_PACKAGES) {
		cargoLock = replaceOrFail(
			cargoLock,
			new RegExp(`(\\[\\[package\\]\\]\\nname = "${packageName}"\\nversion = ")[^"]+(")`),
			`$1${nextVersion}$2`,
			CARGO_LOCK
		);
	}
	await writeText(CARGO_LOCK, cargoLock);

	await writeText(GENERATED_APP_VERSION, `export const APP_VERSION = '${nextVersion}';\n`);
}
