<script lang="ts">
	import { onMount } from 'svelte';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import type { TrashItem, TrashKind } from '$lib/persistence/repositories/trash.repository.js';
	import { deleteFromTrash, loadTrash, purgeTrash, restoreFromTrash } from '$lib/services/trash.service.js';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Undo2 from '@lucide/svelte/icons/undo-2';

	let items = $state<TrashItem[]>([]);
	let loading = $state(true);
	let actionPending = $state(false);
	let activeKind = $state<TrashKind>('owner');
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);

	const groups: { kind: TrashKind; titleKey: TranslationKey }[] = [
		{ kind: 'owner', titleKey: 'trash.owners' },
		{ kind: 'pet', titleKey: 'trash.pets' },
		{ kind: 'vaccination', titleKey: 'trash.vaccinations' },
		{ kind: 'antiparasiticTreatment', titleKey: 'trash.antiparasiticTreatments' },
		{ kind: 'protocol', titleKey: 'trash.protocols' },
		{ kind: 'record', titleKey: 'trash.records' }
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
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			loading = false;
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
			statusKey = 'status.deletedForever';
			await load();
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			actionPending = false;
		}
	}

	async function purgeExpired() {
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
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={loading || actionPending} onclick={() => void purgeExpired()}>
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
								<p class="truncate text-sm font-medium">{item.title}</p>
								<p class="truncate text-xs text-muted-foreground">{item.subtitle || t('common.notInformed')}</p>
								<p class="mt-1 text-xs text-muted-foreground">{t('trash.deletedAt')}: {item.deletedAt ?? t('common.notInformed')} · {t('trash.purgeAfter')}: {item.purgeAfter ?? t('common.notInformed')}</p>
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
	{/if}
</section>
