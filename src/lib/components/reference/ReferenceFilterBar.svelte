<script lang="ts" module>
	import type { SelectOption } from '$lib/components/ui/Select.svelte';

	export interface ReferenceFilterBarSelect {
		id: string;
		label: string;
		value: string;
		options: SelectOption<string>[];
		onchange: (value: string) => void;
	}
</script>

<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import Search from '@lucide/svelte/icons/search';

	let {
		searchTerm = $bindable(''),
		searchLabel,
		searchPlaceholder,
		filters = []
	}: {
		searchTerm: string;
		searchLabel: string;
		searchPlaceholder: string;
		filters?: ReferenceFilterBarSelect[];
	} = $props();
</script>

<section class="grid gap-3 rounded-md border border-border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[minmax(14rem,1.2fr)_repeat(var(--reference-filter-count),minmax(10rem,0.8fr))]" style={`--reference-filter-count: ${filters.length};`}>
	<label class="space-y-1">
		<span class="text-sm font-medium">{searchLabel}</span>
		<span class="relative block">
			<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<input class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" bind:value={searchTerm} placeholder={searchPlaceholder} />
		</span>
	</label>

	{#each filters as filter (filter.id)}
		<div class="space-y-1">
			<label class="text-sm font-medium" for={filter.id}>{filter.label}</label>
			<Select id={filter.id} value={filter.value} options={filter.options} onchange={filter.onchange} />
		</div>
	{/each}
</section>
