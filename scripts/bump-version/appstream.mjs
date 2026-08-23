import { replaceOrFail } from './io.mjs';

const APPSTREAM_METAINFO = 'apps/vet-app/src-tauri/metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml';

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
				APPSTREAM_METAINFO
			)
		);
	}

	const releasesBlock = ['  <releases>', releaseEntry, '  </releases>', ''].join('\n');
	return ensureFinalNewline(
		replaceOrFail(
			contents,
			/(\s*<content_rating\b)/,
			`\n${releasesBlock}$1`,
			APPSTREAM_METAINFO
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
