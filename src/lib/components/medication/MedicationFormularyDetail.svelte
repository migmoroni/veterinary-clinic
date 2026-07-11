<script lang="ts">
	import ProductImage from '$lib/components/product/ProductImage.svelte';
	import { productTypeLabel } from '$lib/domain/product/type-labels.js';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { productLeafletSectionIds, type ProductCatalogOrigin, type ProductLeafletSectionId, type ProductSpecies } from '$lib/domain/product/catalog.js';
	import type { TreatmentCatalogItem } from '$lib/domain/treatment/treatment.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Package from '@lucide/svelte/icons/package';
	import Quote from '@lucide/svelte/icons/quote';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Video from '@lucide/svelte/icons/video';
	import type { Component } from 'svelte';

	interface LeafletSectionConfig {
		id: ProductLeafletSectionId;
		labelKey: TranslationKey;
		icon: Component;
	}

	const sectionConfigs: LeafletSectionConfig[] = [
		{ id: 'about', labelKey: 'formulary.section.about', icon: BookOpenText },
		{ id: 'presentations', labelKey: 'formulary.section.presentations', icon: Package },
		{ id: 'indications', labelKey: 'formulary.section.indications', icon: ClipboardList },
		{ id: 'administration', labelKey: 'formulary.section.administration', icon: Syringe },
		{ id: 'interactions', labelKey: 'formulary.section.interactions', icon: Share2 },
		{ id: 'pharmacology', labelKey: 'formulary.section.pharmacology', icon: FlaskConical },
		{ id: 'studies', labelKey: 'formulary.section.studies', icon: GraduationCap },
		{ id: 'videos', labelKey: 'formulary.section.videos', icon: Video },
		{ id: 'distributors', labelKey: 'formulary.section.distributors', icon: Building2 },
		{ id: 'references', labelKey: 'formulary.section.references', icon: Quote }
	];

	let { item }: { item: TreatmentCatalogItem } = $props();

	let activeSectionId = $state<ProductLeafletSectionId>('about');

	const localizedCountries = $derived(countryOptions(i18n.locale));
	const activeSectionConfig = $derived(sectionConfigs.find((section) => section.id === activeSectionId) ?? sectionConfigs[0]);
	const activeSectionText = $derived(sectionText(item, activeSectionId));

	function typeLabel(source: TreatmentCatalogItem): string {
		return productTypeLabel(source.type, t);
	}

	function speciesLabel(species: ProductSpecies): string {
		return species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
	}

	function speciesSummary(species: readonly ProductSpecies[]): string {
		return species.map(speciesLabel).join(', ');
	}

	function regionLabel(region: string): string {
		return localizedCountries.find((country) => country.value === region)?.label ?? region;
	}

	function regionSummary(regions: readonly string[]): string {
		if (regions.length === 0) return t('common.notInformed');
		return regions.map(regionLabel).join(', ');
	}

	function sectionText(source: TreatmentCatalogItem, sectionId: ProductLeafletSectionId): string {
		return source.extension.sections[sectionId]?.trim() ?? '';
	}

	function hasSectionText(source: TreatmentCatalogItem, sectionId: ProductLeafletSectionId): boolean {
		return sectionText(source, sectionId).length > 0;
	}

	function availableSectionIds(source: TreatmentCatalogItem): ProductLeafletSectionId[] {
		return productLeafletSectionIds.filter((sectionId) => hasSectionText(source, sectionId));
	}

	function sectionParagraphs(text: string): string[] {
		return text
			.split(/\n+/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean);
	}

	function originLabel(origin: ProductCatalogOrigin): string {
		return origin === 'system' ? t('formulary.origin.system') : t('formulary.origin.user');
	}

	$effect(() => {
		const available = availableSectionIds(item);
		if (available.length > 0 && !available.includes(activeSectionId)) activeSectionId = available[0];
		if (available.length === 0) activeSectionId = 'about';
	});
</script>

<section class="grid gap-5 rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
	<aside class="min-w-0 space-y-4">
		<ProductImage kind={item.kind} imageBytes={item.primaryImage?.imageBytes ?? null} alt={item.name} className="aspect-16/10 w-full bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" />

		<nav class="overflow-hidden rounded-md border border-border bg-background" aria-label={t('formulary.sectionsLabel')}>
			{#each sectionConfigs as section}
				{@const hasText = hasSectionText(item, section.id)}
				<button
					type="button"
					class="flex min-h-12 w-full items-center gap-3 border-b border-border px-3 text-left text-sm transition-colors last:border-b-0 {activeSectionId === section.id ? 'bg-primary/10 text-primary' : hasText ? 'hover:bg-accent' : 'text-muted-foreground/60'}"
					disabled={!hasText}
					aria-current={activeSectionId === section.id ? 'page' : undefined}
					onclick={() => (activeSectionId = section.id)}
				>
					<section.icon class="size-4 shrink-0" />
					<span class="wrap-break-word">{t(section.labelKey)}</span>
				</button>
			{/each}
		</nav>
	</aside>

	<article class="min-w-0">
		<header class="border-b border-border pb-4">
			<h3 class="wrap-break-word text-2xl font-semibold">{item.name}</h3>
			<p class="mt-2 text-sm uppercase tracking-normal text-muted-foreground">
				{t('formulary.byManufacturer')} <span class="font-medium text-primary">{item.manufacturer ?? t('common.notInformed')}</span>
				{#if item.extension.commercialLine}
					<span class="mx-2 text-border">|</span>{item.extension.commercialLine}
				{/if}
			</p>

			<div class="mt-4 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
				<p>{t('formulary.kind')}: <span class="text-foreground">{typeLabel(item)}</span></p>
				<p>{t('formulary.originFilter')}: <span class="text-foreground">{originLabel(item.origin)}</span></p>
				<p>{t('formulary.classification')}: <span class="text-foreground">{item.extension.classification ?? t('common.notInformed')}</span></p>
				<p>{t('medication.species')}: <span class="text-foreground">{speciesSummary(item.species)}</span></p>
				<p class="sm:col-span-2">{t('medication.regions')}: <span class="text-foreground">{regionSummary(item.regions)}</span></p>
			</div>
		</header>

		<section class="pt-5">
			<h4 class="text-xl font-semibold">{t(activeSectionConfig.labelKey)}</h4>
			{#if activeSectionText}
				<div class="mt-5 space-y-4 text-base leading-7 text-foreground/85">
					{#each sectionParagraphs(activeSectionText) as paragraph}
						<p class="whitespace-pre-line">{paragraph}</p>
					{/each}
				</div>
			{:else}
				<p class="mt-5 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t('formulary.emptySection')}</p>
			{/if}
		</section>
	</article>
</section>
