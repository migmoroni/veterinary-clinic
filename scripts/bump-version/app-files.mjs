import { readJson, readText, replaceOrFail, updateJson, writeText } from './io.mjs';

export async function readCurrentVersion() {
	const packageJson = await readJson('package.json');
	if (typeof packageJson.version !== 'string') throw new Error('package.json version is missing');
	return packageJson.version;
}

export async function updateAppVersionFiles(nextVersion) {
	await updateJson('package.json', (json) => {
		json.version = nextVersion;
		json.scripts ??= {};
		json.scripts['version:bump'] = 'node scripts/bump-version/index.mjs';
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
	await writeText(
		'src-tauri/Cargo.toml',
		replaceOrFail(cargoToml, /(\[package\][\s\S]*?\nversion = ")[^"]+(")/, `$1${nextVersion}$2`, 'src-tauri/Cargo.toml')
	);

	const cargoLock = await readText('src-tauri/Cargo.lock');
	await writeText(
		'src-tauri/Cargo.lock',
		replaceOrFail(cargoLock, /(\[\[package\]\]\nname = "veterinary_clinic"\nversion = ")[^"]+(")/, `$1${nextVersion}$2`, 'src-tauri/Cargo.lock')
	);

	await writeText('src/lib/generated/app-version.ts', `export const APP_VERSION = '${nextVersion}';\n`);
}