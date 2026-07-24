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
	import DebouncedSearchField from '$lib/components/ui/DebouncedSearchField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { Snippet } from 'svelte';

	let {
		searchTerm = $bindable(''),
		searchPlaceholder,
		filters = [],
		beforeSearch
	}: {
		searchTerm: string;
		searchPlaceholder: string;
		filters?: ReferenceFilterBarSelect[];
		beforeSearch?: Snippet;
	} = $props();
</script>

<section class="flex flex-nowrap items-center gap-2 py-3">
	{#if beforeSearch}
		{@render beforeSearch()}
	{/if}

	<DebouncedSearchField class="w-full max-w-xs shrink" inputClass="h-9 rounded-lg shadow-none" bind:value={searchTerm} placeholder={searchPlaceholder} />

	{#each filters as filter (filter.id)}
		<Select id={filter.id} class="shrink min-w-0" value={filter.value} options={filter.options} onchange={filter.onchange} ariaLabel={filter.label}>
			{#snippet trigger({ selectedLabel, open })}
				<button type="button" class="inline-flex h-9 max-w-44 w-full shrink min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent {open ? 'border-primary ring-2 ring-ring/30' : ''}">
					<span class="truncate block min-w-0 text-left">{selectedLabel}</span>
					<ChevronDown class="size-3.5 shrink-0 opacity-50 transition-transform {open ? 'rotate-180' : ''}" />
				</button>
			{/snippet}
		</Select>
	{/each}
</section>
