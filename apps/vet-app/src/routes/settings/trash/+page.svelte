<script lang="ts">
	import { onMount } from 'svelte';
	import type { TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
	import { t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import type { DeletionAuditLog, TrashItem, TrashKind } from '@vet/core-local/repositories/trash.repository.js';
	import { deleteFromTrash, loadDeletionAuditLogs, loadTrash, purgeTrash, restoreFromTrash } from '@vet/core-local/services/trash.service.js';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';

	let items = $state<TrashItem[]>([]);
	let auditLogs = $state<DeletionAuditLog[]>([]);
	let loading = $state(true);
	let auditLoading = $state(false);
	let actionPending = $state(false);
	let activeKind = $state<TrashKind>('owner');
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);

	const groups: { kind: TrashKind; titleKey: TranslationKey }[] = [
		{ kind: 'owner', titleKey: 'trash.owners' },
		{ kind: 'pet', titleKey: 'trash.pets' },
		{ kind: 'treatment', titleKey: 'trash.treatments' },
		{ kind: 'protocol', titleKey: 'trash.protocols' },
		{ kind: 'record', titleKey: 'trash.records' },
		{ kind: 'media', titleKey: 'trash.media' }
	];
	const activeGroup = $derived(groups.find((group) => group.kind === activeKind) ?? groups[0]);
	const activeItems = $derived(groupItems(activeKind));
	let selectInitialTab = true;

	function groupItems(kind: TrashKind) {
		return items.filter((item) => item.kind === kind);
	}

	function itemCount(kind: TrashKind): number {
		return groupItems(kind).length;
	}

	function treatmentKindLabel(kind: TreatmentKind): TranslationKey {
		return kind === 'vaccine' ? 'vaccine.sectionTitle' : 'antiparasiticTreatment.sectionTitle';
	}

	function itemTitle(item: TrashItem): string {
		return item.kind === 'media' ? `${t('trash.mediaItem')} ${item.id.slice(0, 8)}` : item.title;
	}

	function selectTab(kind: TrashKind) {
		activeKind = kind;
	}

	async function load() {
		loading = true;
		error = null;

		try {
			items = await loadTrash();
			if (selectInitialTab) {
				activeKind = groups.find((group) => groupItems(group.kind).length > 0)?.kind ?? activeKind;
				selectInitialTab = false;
			}
			await loadAudit();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			loading = false;
		}
	}

	async function loadAudit() {
		auditLoading = true;
		try {
			auditLogs = await loadDeletionAuditLogs(25);
		} catch {
			auditLogs = [];
		} finally {
			auditLoading = false;
		}
	}

	async function restore(item: TrashItem) {
		if (actionPending) return;
		if (!window.confirm(t('trash.restoreConfirm'))) return;

		actionPending = true;
		error = null;
		try {
			await restoreFromTrash(item.kind, item.id);
			statusKey = 'status.restored';
			await load();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			actionPending = false;
		}
	}

	async function deleteForever(item: TrashItem) {
		if (actionPending) return;
		if (!window.confirm(t('trash.deleteConfirm'))) return;

		actionPending = true;
		error = null;
		try {
			await deleteFromTrash(item.kind, item.id);
			statusKey = 'status.removedForever';
			await load();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			actionPending = false;
		}
	}

	async function emptyTrash() {
		if (actionPending) return;
		if (!window.confirm(t('trash.purgeConfirm'))) return;

		actionPending = true;
		error = null;
		try {
			await purgeTrash();
			statusKey = 'status.purged';
			await load();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			actionPending = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('trash.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold sm:text-3xl">{t('trash.title')}</h2>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('trash.description')}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={loading || actionPending} onclick={() => void load()}>
				<RotateCw class="size-4" />
				{t('actions.refresh')}
			</button>
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={loading || actionPending} onclick={() => void emptyTrash()}>
				<Trash2 class="size-4" />
				{t('actions.purgeExpired')}
			</button>
		</div>
	</header>

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if loading}
		<div class="h-64 animate-pulse rounded-md bg-muted"></div>
	{:else}
		<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label={t('trash.title')}>
			{#each groups as group}
				{@const count = itemCount(group.kind)}
				<button class="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeKind === group.kind ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={activeKind === group.kind} onclick={() => selectTab(group.kind)}>
					<span class="truncate">{t(group.titleKey)}</span>
					<span class="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold {count > 0 ? (activeKind === group.kind ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary') : 'bg-background/70 text-muted-foreground'}">{count}</span>
				</button>
			{/each}
		</div>

		<div class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel" aria-label={t(activeGroup.titleKey)}>
			{#if activeItems.length === 0}
				<p class="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{items.length === 0 ? t('trash.empty') : t('trash.categoryEmpty')}</p>
			{:else}
				<div class="grid gap-2">
					{#each activeItems as item (item.kind + '-' + item.id)}
						<div class="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<div class="flex min-w-0 flex-wrap items-center gap-2">
									<p class="min-w-0 truncate text-sm font-medium">{itemTitle(item)}</p>
									{#if item.treatmentKind}
										<span class="inline-flex shrink-0 items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t(treatmentKindLabel(item.treatmentKind))}</span>
									{/if}
								</div>
								<p class="truncate text-xs text-muted-foreground">{item.subtitle || t('common.notInformed')}</p>
								<p class="mt-1 text-xs text-muted-foreground">{t('trash.removedAt')}: {item.removedAt ?? t('common.notInformed')}</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent disabled:opacity-50" disabled={actionPending} onclick={() => void restore(item)}>
									<Undo2 class="size-4" />
									{t('actions.restore')}
								</button>
								<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-card px-3 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={actionPending} onclick={() => void deleteForever(item)}>
									<Trash2 class="size-4" />
									{t('actions.deleteForever')}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h3 class="text-base font-semibold">{t('trash.auditTitle')}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{t('trash.auditDescription')}</p>
				</div>
				<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent disabled:opacity-50" disabled={auditLoading} onclick={() => void loadAudit()}>
					<RotateCw class="size-4" />
					{t('actions.refresh')}
				</button>
			</header>

			{#if auditLoading}
				<div class="mt-4 h-24 animate-pulse rounded-md bg-muted"></div>
			{:else if auditLogs.length === 0}
				<p class="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('trash.auditEmpty')}</p>
			{:else}
				<div class="mt-4 grid gap-2">
					{#each auditLogs as log (log.id)}
						<div class="rounded-md border border-border bg-background p-3 text-sm">
							<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<p class="truncate font-medium">{log.targetTable} · {log.targetId}</p>
									<p class="text-xs text-muted-foreground">{log.domain} · {log.createdAt}</p>
								</div>
								<p class="text-xs text-muted-foreground">{t('trash.auditActor')}: {log.deletedBy ?? t('common.notInformed')}</p>
							</div>
							{#if log.snapshotJson}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs font-medium text-muted-foreground">{t('common.details')}</summary>
									<pre class="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{log.snapshotJson}</pre>
								</details>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</section>
