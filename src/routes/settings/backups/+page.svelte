<script lang="ts">
	import { onMount } from 'svelte';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { openInFileManager } from '$lib/native/file-manager.js';
	import type { BackupHistoryItem, BackupKind } from '$lib/persistence/repositories/backup.repository.js';
	import Select from '$lib/components/ui/Select.svelte';
	import { BACKUP_POLICY_INTERVAL_MINUTES, DEFAULT_BACKUP_POLICY_INTERVAL_MINUTES, getBackupHistory, loadBackupPolicyIntervalMinutes, saveBackupPolicyIntervalMinutes } from '$lib/services/backup.service.js';
	import { exportDatabase } from '$lib/services/database-export.service.js';
	import DatabaseBackup from '@lucide/svelte/icons/database-backup';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';

	let history = $state<BackupHistoryItem[]>([]);
	let busy = $state(false);
	let savingPolicy = $state(false);
	let policyIntervalMinutes = $state<number>(DEFAULT_BACKUP_POLICY_INTERVAL_MINUTES);
	let statusKey = $state<TranslationKey | null>(null);
	let lastPath = $state('');
	let error = $state<string | null>(null);

	let policyOptions = $derived(
		BACKUP_POLICY_INTERVAL_MINUTES.map((minutes) => ({
			value: minutes,
			label: policyIntervalLabel(minutes)
		}))
	);

	function kindLabel(kind: BackupKind): string {
		return t(`backup.kind.${kind}` as TranslationKey);
	}

	function policyIntervalLabel(minutes: number): string {
		if (minutes <= 24 * 60) {
			const hours = minutes / 60;
			const unitKey = hours === 1 ? 'backup.policyHour' : 'backup.policyHours';
			return `${t('backup.policyEvery')} ${hours} ${t(unitKey)}`;
		}

		const days = minutes / (24 * 60);
		const unitKey = days === 1 ? 'backup.policyDay' : 'backup.policyDays';
		return `${t('backup.policyEvery')} ${days} ${t(unitKey)}`;
	}

	async function load() {
		try {
			const [loadedHistory, loadedPolicyIntervalMinutes] = await Promise.all([getBackupHistory(), loadBackupPolicyIntervalMinutes()]);
			history = loadedHistory;
			policyIntervalMinutes = loadedPolicyIntervalMinutes;
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	async function changeBackupPolicy(intervalMinutes: number) {
		savingPolicy = true;
		error = null;
		statusKey = null;
		lastPath = '';
		policyIntervalMinutes = intervalMinutes;

		try {
			policyIntervalMinutes = await saveBackupPolicyIntervalMinutes(intervalMinutes);
			statusKey = 'status.preferencesSaved';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			savingPolicy = false;
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
		<h3 class="text-base font-semibold">{t('backup.policyTitle')}</h3>
		<div class="mt-4 flex max-w-sm flex-col gap-2 text-sm font-medium">
			<p>{t('backup.policySelectLabel')}</p>
			<Select id="backup-policy-interval" bind:value={policyIntervalMinutes} options={policyOptions} disabled={savingPolicy || busy} ariaLabel={t('backup.policySelectLabel')} onchange={(value) => void changeBackupPolicy(value)} />
		</div>
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
