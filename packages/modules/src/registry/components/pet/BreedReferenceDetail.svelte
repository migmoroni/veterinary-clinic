<script lang="ts">
	import BinaryImage from '@vet/ui/components/shared/BinaryImage.svelte';
	import {
		breedReferenceSectionIds,
		type BreedReferenceProfile,
		type BreedReferenceSectionId,
		type BreedSexRange,
		type BreedSizeCategory
	} from '@vet/types/domain/pet/breed-reference.js';
	import { i18n, t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import Activity from '@lucide/svelte/icons/activity';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Brain from '@lucide/svelte/icons/brain';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Ruler from '@lucide/svelte/icons/ruler';
	import Scale from '@lucide/svelte/icons/scale';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import type { Component } from 'svelte';

	interface BreedSectionConfig {
		id: BreedReferenceSectionId;
		labelKey: TranslationKey;
		icon: Component;
	}

	const sectionConfigs: BreedSectionConfig[] = [
		{ id: 'characteristics', labelKey: 'breedReference.section.characteristics', icon: Activity },
		{ id: 'morphology', labelKey: 'breedReference.section.morphology', icon: PawPrint },
		{ id: 'behavior', labelKey: 'breedReference.section.behavior', icon: Brain },
		{ id: 'diseases', labelKey: 'breedReference.section.diseases', icon: ShieldAlert },
		{ id: 'references', labelKey: 'breedReference.section.references', icon: BookOpenText }
	];

	let { profile }: { profile: BreedReferenceProfile } = $props();

	let activeSectionId = $state<BreedReferenceSectionId>('characteristics');

	const activeSectionConfig = $derived(sectionConfigs.find((section) => section.id === activeSectionId) ?? sectionConfigs[0]);
	const activeSectionText = $derived(sectionText(profile, activeSectionId));

	function breedName(source: BreedReferenceProfile): string {
		return t(source.labelKey);
	}

	function speciesLabel(source: BreedReferenceProfile): string {
		return source.species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
	}

	function sizeLabel(size: BreedSizeCategory): string {
		return t(`breedReference.size.${size}` as TranslationKey);
	}

	function originLabel(source: BreedReferenceProfile): string {
		if (source.origin.labelKey) return t(source.origin.labelKey);
		if (!source.origin.countryCode) return t('common.notInformed');
		return new Intl.DisplayNames([i18n.locale], { type: 'region' }).of(source.origin.countryCode) ?? source.origin.countryCode;
	}

	function numberLabel(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function rangeLabel(range: readonly [number, number], unitKey: TranslationKey): string {
		return `${numberLabel(range[0])}-${numberLabel(range[1])} ${t(unitKey)}`;
	}

	function sexRangeRows(range: BreedSexRange, unitKey: TranslationKey) {
		return [
			{ label: t('breedReference.male'), value: rangeLabel(range.male, unitKey) },
			{ label: t('breedReference.female'), value: rangeLabel(range.female, unitKey) }
		];
	}

	function sectionText(source: BreedReferenceProfile, sectionId: BreedReferenceSectionId): string {
		return source.extension.sections[sectionId]?.trim() ?? '';
	}

	function hasSectionText(source: BreedReferenceProfile, sectionId: BreedReferenceSectionId): boolean {
		return sectionText(source, sectionId).length > 0;
	}

	function availableSectionIds(source: BreedReferenceProfile): BreedReferenceSectionId[] {
		return breedReferenceSectionIds.filter((sectionId) => hasSectionText(source, sectionId));
	}

	function sectionParagraphs(text: string): string[] {
		return text
			.split(/\n+/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean);
	}

	$effect(() => {
		const available = availableSectionIds(profile);
		if (available.length > 0 && !available.includes(activeSectionId)) activeSectionId = available[0];
		if (available.length === 0) activeSectionId = 'characteristics';
	});
</script>

<section class="grid gap-5 rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
	<aside class="min-w-0 space-y-4">
		<BinaryImage imageBytes={profile.primaryImage?.imageBytes ?? null} alt={breedName(profile)} className="aspect-16/10 w-full bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-16 text-muted-foreground" fallbackIcon={PawPrint} />

		<nav class="overflow-hidden rounded-md border border-border bg-background" aria-label={t('breedReference.sectionsLabel')}>
			{#each sectionConfigs as section}
				{@const hasText = hasSectionText(profile, section.id)}
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
			<h3 class="wrap-break-word text-2xl font-semibold">{breedName(profile)}</h3>
			<p class="mt-2 text-sm uppercase tracking-normal text-muted-foreground">
				{speciesLabel(profile)}
				<span class="mx-2 text-border">|</span>{sizeLabel(profile.sizeCategory)}
			</p>

			<div class="mt-4 grid gap-2 text-sm sm:grid-cols-2">
				<div class="rounded-md border border-border bg-background p-2.5">
					<p class="text-xs font-medium uppercase text-muted-foreground">{t('breedReference.origin')}</p>
					<p class="mt-1 font-medium">{originLabel(profile)}</p>
				</div>
				<div class="rounded-md border border-border bg-background p-2.5">
					<p class="text-xs font-medium uppercase text-muted-foreground">{t('breedReference.size')}</p>
					<p class="mt-1 font-medium">{sizeLabel(profile.sizeCategory)}</p>
				</div>
				<div class="rounded-md border border-border bg-background p-2.5">
					<div class="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
						<Scale class="size-3.5" />
						{t('breedReference.averageWeight')}
					</div>
					<div class="mt-2 grid gap-1.5 text-xs">
						{#each sexRangeRows(profile.averageWeightKg, 'breedReference.unit.kg') as row}
							<div class="grid gap-0.5"><span class="text-muted-foreground">{row.label}</span><span class="font-medium tabular-nums">{row.value}</span></div>
						{/each}
					</div>
				</div>
				<div class="rounded-md border border-border bg-background p-2.5">
					<div class="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
						<Ruler class="size-3.5" />
						{t('breedReference.averageHeight')}
					</div>
					<div class="mt-2 grid gap-1.5 text-xs">
						{#each sexRangeRows(profile.averageHeightCm, 'breedReference.unit.cm') as row}
							<div class="grid gap-0.5"><span class="text-muted-foreground">{row.label}</span><span class="font-medium tabular-nums">{row.value}</span></div>
						{/each}
					</div>
				</div>
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
				<p class="mt-5 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t('breedReference.emptySection')}</p>
			{/if}
		</section>
	</article>
</section>
