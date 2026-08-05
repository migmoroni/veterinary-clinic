<script lang="ts" module>
	import type { Component } from 'svelte';

	export type SearchableSelectOption<T extends string | number> = {
		value: T;
		label: string;
		description?: string;
		searchText?: string;
		imageBytes?: Uint8Array | null;
		imageAlt?: string;
		fallbackIcon?: Component;
	};
</script>

<script lang="ts" generics="T extends string | number">
	import { onDestroy } from 'svelte';
	import BinaryImage from '@vet/ui/components/shared/BinaryImage.svelte';
	import { createCompactSearchMatcher, createDebouncedSearchController } from '@vet/types/domain/search/search-controller.js';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { cn } from '@vet/ui/utils.js';

	let {
		value = $bindable(),
		emptyValue,
		options,
		placeholder = '',
		emptyLabel = '',
		disabled = false,
		id = undefined,
		ariaLabel = undefined,
		class: className = '',
		showOptionMedia = false,
		onchange = undefined
	}: {
		value: T;
		emptyValue: T;
		options: SearchableSelectOption<T>[];
		placeholder?: string;
		emptyLabel?: string;
		disabled?: boolean;
		id?: string;
		ariaLabel?: string;
		class?: string;
		showOptionMedia?: boolean;
		onchange?: (value: T) => void;
	} = $props();

	let open = $state(false);
	let editing = $state(false);
	let query = $state('');
	let debouncedQuery = $state('');
	let wrapperElement: HTMLDivElement | undefined = $state();
	const searchController = createDebouncedSearchController({
		onsearch: (value) => (debouncedQuery = value)
	});

	const selectedOption = $derived(options.find((option) => option.value === value) ?? null);
	const selectedLabel = $derived(selectedOption?.label ?? '');
	const filteredOptions = $derived.by(() => {
		const search = createCompactSearchMatcher(debouncedQuery);
		return options.filter((option) => search.matches(`${option.label} ${option.description ?? ''} ${option.searchText ?? ''}`));
	});

	function setValue(nextValue: T) {
		value = nextValue;
		if (onchange) onchange(nextValue);
	}

	function syncQueryImmediately(nextQuery: string) {
		searchController.cancel();
		query = nextQuery;
		debouncedQuery = nextQuery;
	}

	function scheduleFilteredQuery(nextQuery: string) {
		query = nextQuery;
		searchController.schedule(nextQuery);
	}

	function openList() {
		if (disabled) return;
		open = true;
		editing = true;
	}

	function closeList() {
		open = false;
		editing = false;
		syncQueryImmediately(selectedLabel);
	}

	function handleInput(event: Event) {
		const nextQuery = (event.currentTarget as HTMLInputElement).value;
		scheduleFilteredQuery(nextQuery);
		open = true;
		editing = true;
		if (nextQuery !== selectedLabel) setValue(emptyValue);
	}

	function selectOption(event: Event, option: SearchableSelectOption<T>) {
		event.preventDefault();
		event.stopPropagation();
		syncQueryImmediately(option.label);
		open = false;
		editing = false;
		setValue(option.value);
	}

	function handleWindowClick(event: MouseEvent) {
		if (open && wrapperElement && !wrapperElement.contains(event.target as Node)) closeList();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			closeList();
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			open = true;
			return;
		}

		if (event.key === 'Enter' && open && filteredOptions[0]) {
			selectOption(event, filteredOptions[0]);
		}
	}

	$effect(() => {
		if (!editing) {
			query = selectedLabel;
			debouncedQuery = selectedLabel;
		}
	});

	onDestroy(searchController.cancel);
</script>

<svelte:window onclick={handleWindowClick} />

<div class={cn('relative min-w-0 max-w-full', className)} bind:this={wrapperElement}>
	<div class="relative">
		<input
			{id}
			role="combobox"
			aria-expanded={open}
			aria-controls="listbox-{id || 'searchable-select'}"
			aria-haspopup="listbox"
			aria-label={ariaLabel}
			{disabled}
			class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 pr-9 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
			value={query}
			{placeholder}
			onfocus={openList}
			oninput={handleInput}
			onkeydown={handleKeyDown}
		/>
		<ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
	</div>

	{#if open}
		<div id="listbox-{id || 'searchable-select'}" role="listbox" class="absolute z-50 mt-1 max-h-64 w-full min-w-48 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none scrollbar-gutter-stable">
			{#each filteredOptions as option (option.value)}
				<button type="button" role="option" aria-selected={value === option.value} class={cn('relative flex w-full min-w-0 cursor-default items-start gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground', value === option.value && 'bg-accent/50')} onclick={(event) => selectOption(event, option)}>
					{#if showOptionMedia}
						<BinaryImage imageBytes={option.imageBytes} alt={option.imageAlt ?? option.label} className="size-10 bg-background" imageClass="h-full w-full object-contain" iconClass="size-5 text-primary" fallbackIcon={option.fallbackIcon} />
					{:else}
						<span class="mt-0.5 flex size-4 shrink-0 items-center justify-center">
							{#if value === option.value}<Check class="size-4" />{/if}
						</span>
					{/if}
					<span class="min-w-0 flex-1">
						<span class="block truncate font-medium">{option.label}</span>
						{#if option.description}<span class="mt-0.5 block truncate text-xs text-muted-foreground">{option.description}</span>{/if}
					</span>
					{#if showOptionMedia}
						<span class="mt-2 flex size-4 shrink-0 items-center justify-center">
							{#if value === option.value}<Check class="size-4" />{/if}
						</span>
					{/if}
				</button>
			{:else}
				<p class="px-2 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
			{/each}
		</div>
	{/if}
</div>
