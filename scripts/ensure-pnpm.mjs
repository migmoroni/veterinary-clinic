const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.startsWith('pnpm/')) {
	console.error('This workspace must be installed with pnpm 11.22.0.');
	process.exit(1);
}
