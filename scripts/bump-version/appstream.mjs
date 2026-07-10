import { replaceOrFail } from './io.mjs';

export function updateAppStreamRelease(contents, release) {
	if (contents.includes(`<release version="${release.version}"`)) return ensureFinalNewline(contents);

	const releaseEntry = [
		`    <release version="${escapeXml(release.version)}" date="${escapeXml(release.date)}">`,
		'      <description>',
		...release.changes.map((change) => `        <p>${escapeXml(change)}</p>`),
		'      </description>',
		'    </release>',
		''
	].join('\n');

	if (contents.includes('<releases>')) {
		return ensureFinalNewline(
			replaceOrFail(
				contents,
				/(\s*<releases>\n)/,
				`$1${releaseEntry}`,
				'src-tauri/metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml'
			)
		);
	}

	const releasesBlock = ['  <releases>', releaseEntry, '  </releases>', ''].join('\n');
	return ensureFinalNewline(
		replaceOrFail(
			contents,
			/(\s*<content_rating\b)/,
			`\n${releasesBlock}$1`,
			'src-tauri/metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml'
		)
	);
}

function escapeXml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function ensureFinalNewline(contents) {
	return `${contents.trimEnd()}\n`;
}