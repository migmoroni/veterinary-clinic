<script lang="ts">
	import ReferenceCardGrid, { type ReferenceGridCard } from './ReferenceCardGrid.svelte';
	import ReferenceFilterBar, { type ReferenceFilterBarSelect } from './ReferenceFilterBar.svelte';
	import type { Snippet } from 'svelte';

	let {
		searchTerm = $bindable(''),
		searchPlaceholder,
		filters = [],
		cards,
		selectedId = null,
		emptyLabel,
		openLabel,
		loading = false,
		skeletonCount = 10,
		onselect,
		ondismiss,
		sidebar,
		beforeSearch,
		title
	}: {
		searchTerm: string;
		searchPlaceholder: string;
		filters?: ReferenceFilterBarSelect[];
		cards: ReferenceGridCard[];
		selectedId?: string | null;
		emptyLabel: string;
		openLabel: string;
		loading?: boolean;
		skeletonCount?: number;
		onselect: (id: string) => void;
		ondismiss?: () => void;
		sidebar?: Snippet;
		beforeSearch?: Snippet;
		title?: string;
	} = $props();
</script>

<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] items-start">
	<div class="min-w-0 space-y-4">
		{#if title}
			<header class="pb-1">
				<h2 class="text-2xl font-semibold tracking-normal text-foreground">{title}</h2>
			</header>
		{/if}

		<div class="sticky top-0 z-40 bg-background pt-4 pb-2">
			<div class="rounded-lg border border-border/60 bg-card px-4 shadow-sm">
				<ReferenceFilterBar bind:searchTerm {searchPlaceholder} {filters} {beforeSearch} />
			</div>
		</div>

		<div class="mt-4">
			{#if loading}
				<div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{#each Array.from({ length: skeletonCount }) as _}
						<div class="h-48 animate-pulse rounded-lg bg-muted/60"></div>
					{/each}
				</div>
			{:else}
				<ReferenceCardGrid {cards} {selectedId} {emptyLabel} {openLabel} {onselect} />
			{/if}
		</div>
	</div>

	{#if sidebar}
		<aside class="min-w-0 xl:sticky xl:top-0 xl:pt-4 xl:self-start">
			{@render sidebar()}
		</aside>
	{/if}
</div>
