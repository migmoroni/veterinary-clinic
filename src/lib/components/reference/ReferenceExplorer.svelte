<script lang="ts">
	import ReferenceCardGrid, { type ReferenceGridCard } from '$lib/components/reference/ReferenceCardGrid.svelte';
	import ReferenceFilterBar, { type ReferenceFilterBarSelect } from '$lib/components/reference/ReferenceFilterBar.svelte';
	import Info from '@lucide/svelte/icons/info';
	import type { Component, Snippet } from 'svelte';

	let {
		searchTerm = $bindable(''),
		searchLabel,
		searchPlaceholder,
		filters = [],
		cards,
		selectedId = null,
		emptyLabel,
		openLabel,
		listTitle,
		listIcon = Info,
		count = cards.length,
		loading = false,
		skeletonCount = 10,
		onselect,
		sidebar,
		beforeSearch
	}: {
		searchTerm: string;
		searchLabel: string;
		searchPlaceholder: string;
		filters?: ReferenceFilterBarSelect[];
		cards: ReferenceGridCard[];
		selectedId?: string | null;
		emptyLabel: string;
		openLabel: string;
		listTitle: string;
		listIcon?: Component;
		count?: number;
		loading?: boolean;
		skeletonCount?: number;
		onselect: (id: string) => void;
		sidebar?: Snippet;
		beforeSearch?: Snippet;
	} = $props();

	const ListIcon = $derived(listIcon);
</script>

<div class="sticky top-0 z-40">
	<ReferenceFilterBar bind:searchTerm {searchLabel} {searchPlaceholder} {filters} {beforeSearch} />
</div>

<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
	<div class="min-w-0 space-y-4">
		<section class="rounded-md border border-border bg-card p-3 shadow-sm sm:p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0">
					<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<ListIcon class="size-4" />
						{listTitle}
					</div>
				</div>
				<span class="inline-flex h-8 shrink-0 items-center rounded-md bg-muted px-3 text-sm font-medium tabular-nums text-muted-foreground">{count}</span>
			</div>

			<div class="mt-3">
				{#if loading}
					<div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
						{#each Array.from({ length: skeletonCount }) as _}
							<div class="h-48 animate-pulse rounded-md bg-muted"></div>
						{/each}
					</div>
				{:else}
					<ReferenceCardGrid {cards} {selectedId} {emptyLabel} {openLabel} {onselect} />
				{/if}
			</div>
		</section>
	</div>

	{#if sidebar}
		<aside class="min-w-0 xl:sticky xl:top-28 xl:self-start">
			{@render sidebar()}
		</aside>
	{/if}
</div>
