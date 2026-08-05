import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
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
