import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: [workspaceRoot]
		},
		watch: {
			ignored: [
				'**/flatpak/.flatpak-builder/**',
				'**/flatpak/build-dir/**',
				'**/flatpak/repo/**',
				'**/flatpak/staging/**',
				'**/flatpak/*.flatpak'
			]
		}
	}
});
