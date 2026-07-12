<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { TranslationKey } from '$lib/i18n/index.js';

	export interface CatalogEntityDetailField {
		label: string;
		value: string;
	}

	export interface CatalogEntityDetailSection<TSectionId extends string = string> {
		id: TSectionId;
		labelKey: TranslationKey;
		icon: Component;
	}
</script>

<script lang="ts">
	import BinaryImage from '$lib/components/shared/BinaryImage.svelte';
	import { t } from '$lib/i18n/index.js';
	import ImageIcon from '@lucide/svelte/icons/image';

	let {
		title,
		subtitle = null,
		imageBytes = null,
		imageAlt = '',
		fallbackIcon = ImageIcon,
		fields = [],
		sections,
		sectionTexts
	}: {
		title: string;
		subtitle?: string | null;
		imageBytes?: Uint8Array | null;
		imageAlt?: string;
		fallbackIcon?: Component;
		fields?: CatalogEntityDetailField[];
		sections: CatalogEntityDetailSection[];
		sectionTexts: Record<string, string | undefined>;
	} = $props();

	let activeSectionId = $state('');

	const activeSection = $derived(sections.find((section) => section.id === activeSectionId) ?? sections[0]);
	const activeSectionText = $derived(sectionText(activeSection?.id ?? ''));

	function sectionText(sectionId: string): string {
		return sectionTexts[sectionId]?.trim() ?? '';
	}

	function hasSectionText(sectionId: string): boolean {
		return sectionText(sectionId).length > 0;
	}

	function availableSectionIds(): string[] {
		return sections.filter((section) => hasSectionText(section.id)).map((section) => section.id);
	}

	function sectionParagraphs(text: string): string[] {
		return text
			.split(/\n+/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean);
	}

	$effect(() => {
		const available = availableSectionIds();
		if (available.length > 0 && !available.includes(activeSectionId)) activeSectionId = available[0];
		if (available.length === 0 && sections[0] && activeSectionId !== sections[0].id) activeSectionId = sections[0].id;
	});
</script>

<section class="grid gap-5 rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
	<aside class="min-w-0 space-y-4">
		<BinaryImage imageBytes={imageBytes} alt={imageAlt} className="aspect-16/10 w-full bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" {fallbackIcon} />

		<nav class="overflow-hidden rounded-md border border-border bg-background" aria-label={t('catalog.sectionsLabel')}>
			{#each sections as section}
				{@const hasText = hasSectionText(section.id)}
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
			<h3 class="wrap-break-word text-2xl font-semibold">{title}</h3>
			{#if subtitle}
				<p class="mt-2 text-sm uppercase tracking-normal text-muted-foreground">{subtitle}</p>
			{/if}

			{#if fields.length > 0}
				<div class="mt-4 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
					{#each fields as field}
						<p>{field.label}: <span class="text-foreground">{field.value}</span></p>
					{/each}
				</div>
			{/if}
		</header>

		<section class="pt-5">
			<h4 class="text-xl font-semibold">{activeSection ? t(activeSection.labelKey) : title}</h4>
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
