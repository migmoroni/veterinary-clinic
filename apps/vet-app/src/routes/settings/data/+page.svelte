<script lang="ts">
	import { t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import { openInFileManager } from '@vet/core-local/native/file-manager.js';
	import { importDatabaseFromCsv } from '@vet/core-local/services/csv-import.service.js';
	import { exportDatabaseAsCsv } from '@vet/core-local/services/csv-export.service.js';
	import { exportDatabase } from '@vet/core-local/services/database-export.service.js';
	import { importDatabase, importDatabaseFromBackupFolder } from '@vet/core-local/services/database-import.service.js';
	import Archive from '@lucide/svelte/icons/archive';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Info from '@lucide/svelte/icons/info';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Table from '@lucide/svelte/icons/table';
	import Upload from '@lucide/svelte/icons/upload';

	type OperationMode = 'export_native' | 'export_csv' | 'import_native' | 'import_backup_folder' | 'import_csv';

	const operationLabelByMode = {
		export_native: 'actions.exportDatabase',
		export_csv: 'actions.exportCsv',
		import_native: 'actions.importDatabase',
		import_backup_folder: 'actions.importBackupFolder',
		import_csv: 'actions.importCsv'
	} satisfies Record<OperationMode, TranslationKey>;

	let busy = $state(false);
	let operationMode = $state<OperationMode | null>(null);
	let statusKey = $state<TranslationKey | null>(null);
	let lastPath = $state('');
	let error = $state<string | null>(null);

	function startOperation(mode: OperationMode) {
		busy = true;
		operationMode = mode;
		statusKey = null;
		lastPath = '';
		error = null;
	}

	function currentOperationLabel(): string {
		if (!operationMode) return t('common.loading');
		return t(operationLabelByMode[operationMode]);
	}

	async function exportCopy() {
		startOperation('export_native');

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
		startOperation('export_csv');

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
		startOperation('import_native');

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
		startOperation('import_backup_folder');

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
		startOperation('import_csv');

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
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('data.description')}</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2">
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Archive class="size-5" />
				</div>
				<div>
					<h3 class="text-base font-semibold">{t('actions.exportDatabase')}</h3>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('data.exportDatabaseDescription')}</p>
				</div>
			</div>

			<div class="mt-5 grid gap-2">
				<button
					type="button"
					class="flex min-h-14 w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
					disabled={busy}
					onclick={() => void exportCopy()}
				>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<Archive class="size-4" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-semibold">{t('actions.exportDatabase')}</span>
						<span class="block text-xs leading-5 text-muted-foreground">{t('dialog.exportTitle')}</span>
					</span>
				</button>

				<button
					type="button"
					class="flex min-h-14 w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
					disabled={busy}
					onclick={() => void exportCsv()}
				>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
						<Table class="size-4" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-semibold">{t('actions.exportCsv')}</span>
						<span class="block text-xs leading-5 text-muted-foreground">{t('data.exportCsvDescription')}</span>
					</span>
				</button>
			</div>
		</section>

		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Upload class="size-5" />
				</div>
				<div>
					<h3 class="text-base font-semibold">{t('actions.importDatabase')}</h3>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('data.importWarning')}</p>
				</div>
			</div>

			<div class="mt-5 grid gap-2">
				<button
					type="button"
					class="flex min-h-14 w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
					disabled={busy}
					onclick={() => void importCopy()}
				>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
						<Upload class="size-4" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-semibold">{t('actions.importDatabase')}</span>
						<span class="block text-xs leading-5 text-muted-foreground">{t('dialog.importTitle')}</span>
					</span>
				</button>

				<button
					type="button"
					class="flex min-h-14 w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
					disabled={busy}
					onclick={() => void importBackupFolder()}
				>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
						<FolderOpen class="size-4" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-semibold">{t('actions.importBackupFolder')}</span>
						<span class="block text-xs leading-5 text-muted-foreground">{t('dialog.importBackupFolderTitle')}</span>
					</span>
				</button>

				<button
					type="button"
					class="flex min-h-14 w-full items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
					disabled={busy}
					onclick={() => void importCsv()}
				>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
						<Table class="size-4" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-semibold">{t('actions.importCsv')}</span>
						<span class="block text-xs leading-5 text-muted-foreground">{t('dialog.importCsvTitle')}</span>
					</span>
				</button>
			</div>
		</section>
	</div>

	{#if operationMode || statusKey || error}
		<section
			class={error
				? 'rounded-md border border-destructive/30 bg-destructive/10 p-4 shadow-sm'
				: 'rounded-md border border-border bg-card p-4 shadow-sm'}
			aria-live="polite"
			aria-busy={busy}
		>
			<div class="flex items-start gap-3">
				{#if busy}
					<div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<LoaderCircle class="size-5 animate-spin" />
					</div>
					<div>
						<p class="text-sm font-semibold">{currentOperationLabel()}</p>
						<p class="mt-1 text-sm text-muted-foreground">{t('common.loading')}...</p>
					</div>
				{:else if error}
					<div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
						<CircleAlert class="size-5" />
					</div>
					<div>
						<p class="text-sm font-semibold">{currentOperationLabel()}</p>
						<p class="mt-1 wrap-break-word text-sm">{error}</p>
					</div>
				{:else if statusKey}
					<div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						{#if statusKey === 'status.operationCanceled'}
							<Info class="size-5" />
						{:else}
							<CircleCheck class="size-5" />
						{/if}
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold">{currentOperationLabel()}</p>
						<p class="mt-1 text-sm text-muted-foreground">
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
					</div>
				{/if}
			</div>
		</section>
	{/if}
</section>
