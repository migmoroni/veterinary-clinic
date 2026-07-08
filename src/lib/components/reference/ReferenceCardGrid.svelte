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

	function useFallbackImage(event: Event, fallbackImagePath: string | null | undefined) {
		if (!fallbackImagePath) return;

		const image = event.currentTarget as HTMLImageElement | null;
		if (!image || image.dataset.fallbackApplied === 'true') return;

		image.dataset.fallbackApplied = 'true';
		image.src = fallbackImagePath;
	}
</script>

<div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
	{#each cards as card (card.id)}
		<button type="button" class="flex min-h-48 flex-col overflow-hidden rounded-md border text-left transition-colors hover:bg-accent {selectedId === card.id ? 'border-primary bg-primary/10 ring-2 ring-ring/25' : 'border-border bg-background'}" aria-label={`${openLabel}: ${card.title}`} onclick={() => onselect(card.id)}>
			{#if card.imageBytes !== undefined || card.fallbackIcon}
				<BinaryImage imageBytes={card.imageBytes ?? null} alt={card.imageAlt ?? ''} className="aspect-5/4 w-full rounded-none border-0 bg-muted" imageClass="h-full w-full object-contain p-3" iconClass="size-9 text-primary" fallbackIcon={card.fallbackIcon ?? ImageIcon} />
			{:else if card.imageUrl}
				<img class="aspect-5/4 w-full bg-muted object-cover" src={card.imageUrl} alt={card.imageAlt ?? ''} loading="lazy" onerror={(event) => useFallbackImage(event, card.fallbackImageUrl)} />
			{:else}
				<BinaryImage imageBytes={null} alt={card.imageAlt ?? ''} className="aspect-5/4 w-full rounded-none border-0 bg-muted" imageClass="h-full w-full object-contain p-3" iconClass="size-9 text-primary" fallbackIcon={ImageIcon} />
			{/if}

			<span class="flex min-h-24 flex-1 flex-col p-2.5">
				<span class="wrap-break-word text-sm font-semibold leading-5">{card.title}</span>
				{#if card.subtitle}
					<span class="mt-1 text-xs text-muted-foreground">{card.subtitle}</span>
				{/if}
				{#if card.detail}
					<span class="mt-1 truncate text-xs text-muted-foreground">{card.detail}</span>
				{/if}
				{#if card.meta}
					<span class="mt-auto pt-3 text-xs font-medium uppercase text-muted-foreground">{card.meta}</span>
				{/if}
			</span>
		</button>
	{:else}
		<p class="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground sm:col-span-3 lg:col-span-5">{emptyLabel}</p>
	{/each}
</div>
