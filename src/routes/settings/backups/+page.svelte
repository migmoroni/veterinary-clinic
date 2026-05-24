<script lang="ts">
	import { onMount } from 'svelte';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import type { BackupHistoryItem, BackupKind } from '$lib/persistence/repositories/backup.repository.js';
	import { exportDatabase, getBackupHistory } from '$lib/services/backup.service.js';
	import DatabaseBackup from '@lucide/svelte/icons/database-backup';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';

	let history = $state<BackupHistoryItem[]>([]);
	let busy = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let lastPath = $state('');
	let error = $state<string | null>(null);

	function kindLabel(kind: BackupKind): string {
		return t(`backup.kind.${kind}` as TranslationKey);
	}

	async function load() {
		try {
			history = await getBackupHistory();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	async function createBackup() {
		busy = true;
		error = null;
		statusKey = null;

		try {
			const path = await exportDatabase('manual_backup', t('dialog.exportTitle'));
			if (!path) {
				statusKey = 'status.operationCanceled';
				return;
			}
			lastPath = path;
			statusKey = 'status.backupCreated';
			await load();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('backup.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
			<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('backup.title')}</h2>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('backup.description')}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent" onclick={() => void load()}>
				<RotateCw class="size-4" />
				{t('actions.refresh')}
			</button>
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={busy} onclick={() => void createBackup()}>
				<DatabaseBackup class="size-4" />
				{t('actions.createBackup')}
			</button>
		</div>
	</header>

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)} {lastPath}</p>
	{/if}

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('backup.history')}</h3>
		<div class="mt-4 grid gap-2">
			{#each history as item}
				<div class="rounded-md border border-border bg-background p-3">
					<p class="text-sm font-medium">{kindLabel(item.kind)}</p>
					<p class="mt-1 break-all text-xs text-muted-foreground">{t('common.path')}: {item.path}</p>
					<p class="mt-1 text-xs text-muted-foreground">{t('common.date')}: {item.createdAt}</p>
				</div>
			{:else}
				<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('backup.emptyHistory')}</p>
			{/each}
		</div>
	</section>
</section>