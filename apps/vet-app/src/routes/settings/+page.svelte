<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '@vet/core-local/i18n/index.js';
	import { loadAppVersion } from '@vet/core-local/services/app-version.service.js';

	let appVersion = $state('');

	onMount(() => {
		loadAppVersion()
			.then((version) => {
				appVersion = version;
			})
			.catch(() => {
				appVersion = '';
			});
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="space-y-1">
		<h1 class="text-lg font-semibold text-foreground">{t('settings.title')}</h1>
		<p class="max-w-2xl text-sm text-muted-foreground">{t('settings.description')}</p>
	</div>

	<div class="mt-5 grid gap-3 sm:grid-cols-2">
		<a class="rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-accent" href="/settings/backups">
			<span class="text-sm font-semibold text-foreground">{t('settings.backups.title')}</span>
			<span class="mt-1 block text-sm text-muted-foreground">{t('settings.backups.description')}</span>
		</a>
		<a class="rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-accent" href="/settings/data">
			<span class="text-sm font-semibold text-foreground">{t('settings.data.title')}</span>
			<span class="mt-1 block text-sm text-muted-foreground">{t('settings.data.description')}</span>
		</a>
	</div>

	<div class="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
		<span>{t('settings.about.version')}</span>
		<span class="ml-1 font-medium text-foreground">{appVersion ? `v${appVersion}` : t('common.loading')}</span>
	</div>
</section>
