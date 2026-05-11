<script lang="ts">
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { exportDatabase, importDatabase } from '$lib/services/backup.service.js';
	import Archive from '@lucide/svelte/icons/archive';
	import Upload from '@lucide/svelte/icons/upload';

	let busy = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let lastPath = $state('');
	let error = $state<string | null>(null);

	async function exportCopy() {
		busy = true;
		error = null;
		statusKey = null;

		try {
			const path = await exportDatabase('export', t('dialog.exportTitle'));
			if (!path) {
				statusKey = 'status.operationCanceled';
				return;
			}
			lastPath = path;
			statusKey = 'status.exportCreated';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			busy = false;
		}
	}

	async function importCopy() {
		if (!window.confirm(t('data.importConfirm'))) return;
		busy = true;
		error = null;
		statusKey = null;

		try {
			const result = await importDatabase(t('dialog.importTitle'));
			if (!result) {
				statusKey = 'status.operationCanceled';
				return;
			}
			lastPath = result.safetyBackupName;
			statusKey = 'status.imported';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{t('data.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('data.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('data.description')}</p>
	</header>

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)} {lastPath}</p>
	{/if}

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Archive class="size-5" />
			</div>
			<h3 class="mt-4 text-base font-semibold">{t('actions.exportDatabase')}</h3>
			<button type="button" class="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={busy} onclick={() => void exportCopy()}>
				<Archive class="size-4" />
				{t('actions.exportDatabase')}
			</button>
		</section>

		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Upload class="size-5" />
			</div>
			<h3 class="mt-4 text-base font-semibold">{t('actions.importDatabase')}</h3>
			<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('data.importWarning')}</p>
			<button type="button" class="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={busy} onclick={() => void importCopy()}>
				<Upload class="size-4" />
				{t('actions.importDatabase')}
			</button>
		</section>
	</div>
</section>