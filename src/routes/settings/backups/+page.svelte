<script lang="ts">
	import { onMount } from 'svelte';
	import { open } from '@tauri-apps/plugin-dialog';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { openInFileManager } from '$lib/native/file-manager.js';
	import type { BackupHistoryItem, BackupKind } from '$lib/persistence/repositories/backup.repository.js';
	import { getBackupHistory } from '$lib/services/backup.service.js';
	import { exportDatabase } from '$lib/services/database-export.service.js';
	import { getBackupReplicationStatus, setBackupTargetPath, type BackupReplicationStatus } from '$lib/services/replication-backup.service.js';
	import DatabaseBackup from '@lucide/svelte/icons/database-backup';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';

	let history = $state<BackupHistoryItem[]>([]);
	let replicationStatus = $state<BackupReplicationStatus | null>(null);
	let busy = $state(false);
	let savingTarget = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let lastPath = $state('');
	let error = $state<string | null>(null);

	function kindLabel(kind: BackupKind): string {
		return t(`backup.kind.${kind}` as TranslationKey);
	}

	async function load() {
		try {
			const [loadedHistory, loadedReplicationStatus] = await Promise.all([getBackupHistory(), getBackupReplicationStatus()]);
			history = loadedHistory;
			replicationStatus = loadedReplicationStatus;
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

	async function openBackupPath(path: string) {
		if (!path) return;

		try {
			error = null;
			await openInFileManager(path);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	async function defineBackupTargetPath() {
		savingTarget = true;
		error = null;
		statusKey = null;

		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: t('backup.replicationTargetDialogTitle')
			});
			const path = Array.isArray(selected) ? selected[0] : selected;
			if (typeof path !== 'string' || !path) return;
			replicationStatus = await setBackupTargetPath(path);
			statusKey = 'backup.replicationTargetSaved';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			savingTarget = false;
		}
	}

	async function disableBackupTargetPath() {
		savingTarget = true;
		error = null;
		statusKey = null;

		try {
			replicationStatus = await setBackupTargetPath('');
			statusKey = 'backup.replicationTargetDisabled';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			savingTarget = false;
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
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('backup.title')}</h2>
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
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">
			{t(statusKey)}
			{#if lastPath}
				<button
					type="button"
					class="ml-1 inline break-all rounded-sm border-0 bg-transparent p-0 text-left align-baseline font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${t('actions.openInFileManager')} ${lastPath}`}
					title={t('actions.openInFileManager')}
					onclick={() => void openBackupPath(lastPath)}
				>
					{lastPath}
				</button>
			{/if}
		</p>
	{/if}

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h3 class="text-base font-semibold">{t('backup.replicationTitle')}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{t('backup.replicationDescription')}</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={savingTarget || busy} onclick={() => void defineBackupTargetPath()}>
					<FolderOpen class="size-4" />
					{t('backup.chooseReplicationTarget')}
				</button>
				<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={savingTarget || busy || !replicationStatus?.enabled} onclick={() => void disableBackupTargetPath()}>
					{t('backup.disableReplicationTarget')}
				</button>
			</div>
		</div>

		<div class="mt-4 grid gap-3 md:grid-cols-3">
			<div class="rounded-md border border-border bg-background p-3">
				<p class="text-xs font-semibold uppercase text-muted-foreground">{t('backup.replicationStatus')}</p>
				<p class="mt-1 text-sm font-medium">
					{#if replicationStatus?.enabled}
						{replicationStatus.destinationAvailable ? t('backup.replicationStatusActive') : t('backup.replicationStatusFallback')}
					{:else}
						{t('backup.replicationStatusDisabled')}
					{/if}
				</p>
			</div>
			<div class="rounded-md border border-border bg-background p-3">
				<p class="text-xs font-semibold uppercase text-muted-foreground">{t('backup.replicationPending')}</p>
				<p class="mt-1 text-sm font-medium">{replicationStatus?.pendingTotal ?? 0}</p>
				<p class="mt-1 text-xs text-muted-foreground">C1 {replicationStatus?.pendingC1 ?? 0} · C2 {replicationStatus?.pendingC2 ?? 0} · C3 {replicationStatus?.pendingC3 ?? 0}</p>
			</div>
			<div class="rounded-md border border-border bg-background p-3">
				<p class="text-xs font-semibold uppercase text-muted-foreground">{t('backup.replicationEffectivePath')}</p>
				{#if replicationStatus?.effectivePath}
					<button type="button" class="mt-1 break-all text-left text-sm font-medium text-primary underline underline-offset-4" onclick={() => void openBackupPath(replicationStatus?.effectivePath ?? '')}>
						{replicationStatus.effectivePath}
					</button>
				{:else}
					<p class="mt-1 text-sm text-muted-foreground">{t('backup.notConfigured')}</p>
				{/if}
			</div>
		</div>

		{#if replicationStatus?.lastError}
			<p class="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{replicationStatus.lastError}</p>
		{/if}

	</section>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('backup.history')}</h3>
		<div class="mt-4 grid gap-2">
			{#each history as item}
				<div class="rounded-md border border-border bg-background p-3">
					<p class="text-sm font-medium">{kindLabel(item.kind)}</p>
					<p class="mt-1 break-all text-xs text-muted-foreground">
						{t('common.path')}:
						<button
							type="button"
							class="ml-1 inline break-all rounded-sm border-0 bg-transparent p-0 text-left align-baseline font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							aria-label={`${t('actions.openInFileManager')} ${item.path}`}
							title={t('actions.openInFileManager')}
							onclick={() => void openBackupPath(item.path)}
						>
							{item.path}
						</button>
					</p>
					<p class="mt-1 text-xs text-muted-foreground">{t('common.date')}: {item.createdAt}</p>
				</div>
			{:else}
				<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('backup.emptyHistory')}</p>
			{/each}
		</div>
	</section>
</section>
