import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function readText(relativePath) {
	return readFile(resolve(ROOT, relativePath), 'utf8');
}

export async function writeText(relativePath, contents) {
	await writeFile(resolve(ROOT, relativePath), contents);
}

export async function readJson(relativePath) {
	return JSON.parse(await readText(relativePath));
}

export async function updateJson(relativePath, updater) {
	const json = await readJson(relativePath);
	updater(json);
	await writeText(relativePath, `${JSON.stringify(json, null, '\t')}\n`);
}

export function replaceOrFail(contents, pattern, replacement, fileName) {
	const updated = contents.replace(pattern, replacement);
	if (updated === contents) throw new Error(`Could not update ${fileName}`);
	return updated;
}