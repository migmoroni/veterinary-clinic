import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { isBumpLevel } from './semver.mjs';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const USAGE = [
	'Usage:',
	'  pnpm version:bump -- <major|minor|patch> "Release note"',
	'  pnpm version:bump -- <major|minor|patch> --change "First note" --change "Second note"',
	'',
	'Examples:',
	'  pnpm version:bump -- patch "Fix Linux package metadata"',
	'  pnpm version:bump -- minor --change "Add vaccine protocols" --change "Improve backups"'
].join('\n');

export function usage() {
	return USAGE;
}

export function parseArgs(argv) {
	const [level, ...tokens] = argv;
	if (!isBumpLevel(level)) throw new Error(USAGE);

	const changes = [];
	let date;
	const positional = [];

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];

		if (token === '--change' || token === '-c' || token === '--message' || token === '-m') {
			const value = tokens[index + 1];
			if (!value) throw new Error(`Missing value for ${token}\n\n${USAGE}`);
			changes.push(value);
			index += 1;
			continue;
		}

		if (token === '--date') {
			const value = tokens[index + 1];
			if (!value) throw new Error(`Missing value for ${token}\n\n${USAGE}`);
			if (!DATE_PATTERN.test(value)) throw new Error(`Invalid date: ${value}. Expected YYYY-MM-DD.\n\n${USAGE}`);
			date = value;
			index += 1;
			continue;
		}

		if (token.startsWith('-')) throw new Error(`Unknown option: ${token}\n\n${USAGE}`);
		positional.push(token);
	}

	if (positional.length > 0) changes.push(positional.join(' '));

	return { level, changes, date };
}

export async function collectChanges(initialChanges) {
	const changes = normalizeChanges(initialChanges);
	if (changes.length > 0) return changes;

	if (!input.isTTY) throw new Error(`Missing release note.\n\n${USAGE}`);

	const reader = createInterface({ input, output });
	try {
		const answer = await reader.question('Release note: ');
		const promptedChanges = normalizeChanges([answer]);
		if (promptedChanges.length === 0) throw new Error(`Missing release note.\n\n${USAGE}`);
		return promptedChanges;
	} finally {
		reader.close();
	}
}

function normalizeChanges(changes) {
	return changes.flatMap((change) => change.split(/\r?\n/)).map((change) => change.trim()).filter(Boolean);
}
