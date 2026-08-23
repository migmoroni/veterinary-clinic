const userAgent = process.env.npm_config_user_agent ?? '';
const minimumVersion = [11, 22, 0];
const versionMatch = /^pnpm\/(\d+)\.(\d+)\.(\d+)([^\s]*)/.exec(userAgent);
const currentVersion = versionMatch?.slice(1, 4).map(Number);

if (!currentVersion || compareVersions(currentVersion, minimumVersion) < 0) {
	console.error('This workspace requires pnpm 11.22.0 or newer.');
	process.exit(1);
}

function compareVersions(left, right) {
	for (let index = 0; index < right.length; index += 1) {
		if (left[index] !== right[index]) return left[index] - right[index];
	}

	return 0;
}
