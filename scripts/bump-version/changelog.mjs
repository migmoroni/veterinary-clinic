function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function updateChangelog(contents, release) {
	const versionHeading = new RegExp(`^## ${escapeRegExp(release.version)}(?:\\s|$)`, 'm');
	if (versionHeading.test(contents)) return ensureFinalNewline(contents);

	const entry = [
		`## ${release.version} - ${release.date}`,
		'',
		'### Changed',
		'',
		...release.changes.map((change) => `- ${change}`),
		'',
		''
	].join('\n');

	const firstVersionHeading = contents.match(/^## /m);
	if (!firstVersionHeading?.index) return ensureFinalNewline(`${contents.trimEnd()}\n\n${entry}`);

	return ensureFinalNewline(`${contents.slice(0, firstVersionHeading.index)}${entry}${contents.slice(firstVersionHeading.index)}`);
}

function ensureFinalNewline(contents) {
	return `${contents.trimEnd()}\n`;
}