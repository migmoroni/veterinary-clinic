const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const BUMP_LEVELS = new Set(['major', 'minor', 'patch']);

export function isBumpLevel(value) {
	return BUMP_LEVELS.has(value);
}

export function parseStableVersion(version) {
	const match = SEMVER_PATTERN.exec(version);
	if (!match) throw new Error(`Expected a stable semver version, received: ${version}`);

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3])
	};
}

export function bumpVersion(currentVersion, level) {
	if (!isBumpLevel(level)) throw new Error(`Invalid bump level: ${level}`);

	const version = parseStableVersion(currentVersion);
	if (level === 'major') return `${version.major + 1}.0.0`;
	if (level === 'minor') return `${version.major}.${version.minor + 1}.0`;
	return `${version.major}.${version.minor}.${version.patch + 1}`;
}