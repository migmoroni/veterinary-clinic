<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface ReferenceGridCard {
		id: string;
		title: string;
		subtitle?: string | null;
		detail?: string | null;
		meta?: string | null;
		imageUrl?: string | null;
		fallbackImageUrl?: string | null;
		imageBytes?: Uint8Array | null;
		imageAlt?: string;
		fallbackIcon?: Component;
	}
</script>

<script lang="ts">
	import BinaryImage from '$lib/components/shared/BinaryImage.svelte';
	import ImageIcon from '@lucide/svelte/icons/image';
	import { tick } from 'svelte';

	let {
		cards,
		selectedId = null,
		emptyLabel,
		openLabel,
		onselect
	}: {
		cards: ReferenceGridCard[];
		selectedId?: string | null;
		emptyLabel: string;
		openLabel: string;
		onselect: (id: string) => void;
	} = $props();

	let gridElement = $state<HTMLElement | null>(null);

	function useFallbackImage(event: Event, fallbackImagePath: string | null | undefined) {
		if (!fallbackImagePath) return;

		const image = event.currentTarget as HTMLImageElement | null;
		if (!image || image.dataset.fallbackApplied === 'true') return;

		image.dataset.fallbackApplied = 'true';
		image.src = fallbackImagePath;
	}

	function selectedCardElement(id: string): HTMLElement | null {
		return [...(gridElement?.querySelectorAll<HTMLElement>('[data-reference-card-id]') ?? [])].find((element) => element.dataset.referenceCardId === id) ?? null;
	}

	function isFullyVisible(element: HTMLElement): boolean {
		const rect = element.getBoundingClientRect();
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
		return rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth;
	}

	async function scrollSelectedCardIntoView(id: string | null | undefined): Promise<void> {
		if (!id) return;
		await tick();

		const element = selectedCardElement(id);
		if (!element || isFullyVisible(element)) return;
		element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
	}

	$effect(() => {
		cards.map((card) => card.id).join('\0');
		void scrollSelectedCardIntoView(selectedId);
	});
</script>

<div bind:this={gridElement} class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
	{#each cards as card (card.id)}
		<button type="button" data-reference-card-id={card.id} class="group flex min-h-48 flex-col overflow-hidden rounded-lg border text-left transition-all duration-200 hover:shadow-md {selectedId === card.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border/60 bg-card hover:border-border'}" aria-label={`${openLabel}: ${card.title}`} onclick={() => onselect(card.id)}>
			{#if card.imageBytes !== undefined || card.fallbackIcon}
				<BinaryImage imageBytes={card.imageBytes ?? null} alt={card.imageAlt ?? ''} className="aspect-5/4 w-full rounded-none border-0 bg-muted/40" imageClass="h-full w-full object-contain p-3" iconClass="size-9 text-primary/60" fallbackIcon={card.fallbackIcon ?? ImageIcon} />
			{:else if card.imageUrl}
				<img class="aspect-5/4 w-full bg-muted/40 object-cover" src={card.imageUrl} alt={card.imageAlt ?? ''} loading="lazy" onerror={(event) => useFallbackImage(event, card.fallbackImageUrl)} />
			{:else}
				<BinaryImage imageBytes={null} alt={card.imageAlt ?? ''} className="aspect-5/4 w-full rounded-none border-0 bg-muted/40" imageClass="h-full w-full object-contain p-3" iconClass="size-9 text-primary/60" fallbackIcon={ImageIcon} />
			{/if}

			<span class="flex min-h-20 flex-1 flex-col p-2.5">
				<span class="wrap-break-word text-sm font-semibold leading-5">{card.title}</span>
				{#if card.subtitle}
					<span class="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</span>
				{/if}
				{#if card.detail}
					<span class="mt-0.5 truncate text-xs text-muted-foreground">{card.detail}</span>
				{/if}
				{#if card.meta}
					<span class="mt-auto pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{card.meta}</span>
				{/if}
			</span>
		</button>
	{:else}
		<p class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground sm:col-span-3 lg:col-span-5">{emptyLabel}</p>
	{/each}
</div>
