<script lang="ts">
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { openInFileManager } from '$lib/native/file-manager.js';
	import { importDatabaseFromCsv } from '$lib/services/csv-import.service.js';
	import { exportDatabaseAsCsv } from '$lib/services/csv-export.service.js';
	import { exportDatabase } from '$lib/services/database-export.service.js';
	import { importDatabase, importDatabaseFromBackupFolder } from '$lib/services/database-import.service.js';
	import Archive from '@lucide/svelte/icons/archive';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Table from '@lucide/svelte/icons/table';
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

	async function exportCsv() {
		busy = true;
		error = null;
		statusKey = null;

		try {
			const path = await exportDatabaseAsCsv(t('dialog.exportCsvTitle'));
			if (!path) {
				statusKey = 'status.operationCanceled';
				return;
			}
			lastPath = path;
			statusKey = 'status.csvExportCreated';
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
			lastPath = result.safetyExportPath;
			statusKey = result.replicationTargetPath
				? result.safetyExportPath
					? 'data.importedAndBackupTargetSavedWithSafety'
					: 'data.importedAndBackupTargetSaved'
				: 'status.imported';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			busy = false;
		}
	}

	async function importBackupFolder() {
		if (!window.confirm(t('data.importConfirm'))) return;
		busy = true;
		error = null;
		statusKey = null;

		try {
			const result = await importDatabaseFromBackupFolder(t('dialog.importBackupFolderTitle'));
			if (!result) {
				statusKey = 'status.operationCanceled';
				return;
			}
			lastPath = result.safetyExportPath;
			statusKey = result.safetyExportPath
				? 'data.importedAndBackupTargetSavedWithSafety'
				: 'data.importedAndBackupTargetSaved';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			busy = false;
		}
	}

	async function importCsv() {
		if (!window.confirm(t('data.importCsvConfirm'))) return;
		busy = true;
		error = null;
		statusKey = null;

		try {
			const result = await importDatabaseFromCsv(t('dialog.importCsvTitle'));
			if (!result) {
				statusKey = 'status.operationCanceled';
				return;
			}
			lastPath = result.safetyExportPath;
			statusKey = result.replicationTargetPath
				? result.safetyExportPath
					? 'data.importedAndBackupTargetSavedWithSafety'
					: 'data.importedAndBackupTargetSaved'
				: 'status.imported';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			busy = false;
		}
	}

	async function openLastPath() {
		if (!lastPath) return;

		try {
			error = null;
			await openInFileManager(lastPath);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}
</script>

<svelte:head>
	<title>{t('data.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('data.title')}</h2>
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
					onclick={() => void openLastPath()}
				>
					{lastPath}
				</button>
			{/if}
		</p>
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
			<div class="mt-4 flex flex-wrap gap-2">
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={busy} onclick={() => void exportCopy()}>
					<Archive class="size-4" />
					{t('actions.exportDatabase')}
				</button>
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={busy} onclick={() => void exportCsv()}>
					<Table class="size-4" />
					{t('actions.exportCsv')}
				</button>
			</div>
		</section>

		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Upload class="size-5" />
			</div>
			<h3 class="mt-4 text-base font-semibold">{t('actions.importDatabase')}</h3>
			<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('data.importWarning')}</p>
			<div class="mt-4 flex flex-wrap gap-2">
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={busy} onclick={() => void importCopy()}>
					<Upload class="size-4" />
					{t('actions.importDatabase')}
				</button>
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={busy} onclick={() => void importBackupFolder()}>
					<FolderOpen class="size-4" />
					{t('actions.importBackupFolder')}
				</button>
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={busy} onclick={() => void importCsv()}>
					<Table class="size-4" />
					{t('actions.importCsv')}
				</button>
			</div>
		</section>
	</div>
</section>
