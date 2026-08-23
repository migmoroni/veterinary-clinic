#!/usr/bin/env node
import { updateAppStreamRelease } from './appstream.mjs';
import { APPSTREAM_METAINFO, updateAppVersionFiles, readCurrentVersion } from './app-files.mjs';
import { updateChangelog } from './changelog.mjs';
import { collectChanges, parseArgs } from './cli.mjs';
import { formatLocalDate } from './date.mjs';
import { readText, writeText } from './io.mjs';
import { bumpVersion } from './semver.mjs';

try {
	const options = parseArgs(process.argv.slice(2));
	const changes = await collectChanges(options.changes);
	const currentVersion = await readCurrentVersion();
	const nextVersion = bumpVersion(currentVersion, options.level);
	const release = {
		version: nextVersion,
		date: options.date ?? formatLocalDate(),
		changes
	};

	await updateAppVersionFiles(nextVersion);

	const changelog = await readText('CHANGELOG.md');
	await writeText('CHANGELOG.md', updateChangelog(changelog, release));

	const appStreamMetainfo = await readText(APPSTREAM_METAINFO);
	await writeText(APPSTREAM_METAINFO, updateAppStreamRelease(appStreamMetainfo, release));

	console.log(`Version bumped from ${currentVersion} to ${nextVersion} (${options.level})`);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
