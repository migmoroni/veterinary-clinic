<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import MedicationFormularyDetail from '$lib/components/medication/MedicationFormularyDetail.svelte';
	import type { TreatmentCatalogItem, TreatmentKind } from '$lib/domain/treatment/treatment.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadTreatmentCatalogItems } from '$lib/services/treatment.service.js';

	let item = $state<TreatmentCatalogItem | null>(null);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);

	function parseKind(value: string | undefined): TreatmentKind | null {
		if (value === 'vaccine' || value === 'antiparasitic') return value;
		return null;
	}

	async function loadItem() {
		loading = true;
		errorKey = null;
		item = null;

		const kind = parseKind(page.params.kind);
		const id = Number(page.params.id);

		if (!kind || !Number.isInteger(id) || id <= 0) {
			errorKey = 'formulary.detailNotFound';
			loading = false;
			return;
		}

		try {
			const items = await loadTreatmentCatalogItems(kind, true);
			item = items.find((candidate) => candidate.id === id) ?? null;
			if (!item) errorKey = 'formulary.detailNotFound';
		} catch {
			errorKey = 'formulary.loadFailed';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadItem();
	});
</script>

<svelte:head>
	<title>{item?.name ?? t('formulary.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		<p class="text-sm font-medium text-muted-foreground">{t('formulary.kicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{item?.name ?? t('formulary.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('formulary.description')}</p>
	</header>

	{#if loading}
		<div class="h-96 animate-pulse rounded-md bg-muted"></div>
	{:else if errorKey}
		<p class="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t(errorKey)}</p>
	{:else if item}
		<MedicationFormularyDetail {item} />
	{/if}
</section>
