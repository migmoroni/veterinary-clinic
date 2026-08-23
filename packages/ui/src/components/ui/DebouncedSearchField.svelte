<script lang="ts">
	import { onDestroy } from 'svelte';
	import CharacterLimitHint from '@vet/ui/components/forms/CharacterLimitHint.svelte';
	import { createDebouncedSearchController } from '@vet/types/domain/search/search-controller.js';
	import Search from '@lucide/svelte/icons/search';
	import { cn } from '@vet/ui/utils.js';

	let {
		value = $bindable(''),
		draftValue = $bindable(value),
		id,
		label,
		placeholder = '',
		ariaLabel,
		maxLength,
		minLength = 0,
		debounceMs = 250,
		disabled = false,
		showCharacterLimit = false,
		class: className = '',
		inputClass = '',
		onsearch,
		onclear
	}: {
		value?: string;
		draftValue?: string;
		id?: string;
		label?: string;
		placeholder?: string;
		ariaLabel?: string;
		maxLength?: number;
		minLength?: number;
		debounceMs?: number;
		disabled?: boolean;
		showCharacterLimit?: boolean;
		class?: string;
		inputClass?: string;
		onsearch?: (value: string) => void;
		onclear?: (value: string) => void;
	} = $props();

	let lastCommittedValue = $state(value);

	function commitSearch(nextValue: string) {
		lastCommittedValue = nextValue;
		value = nextValue;
		onsearch?.(nextValue);
	}

	function commitClear(nextValue: string) {
		lastCommittedValue = nextValue;
		value = nextValue;
		onclear?.(nextValue);
	}

	const searchController = createDebouncedSearchController({
		debounceMs: () => debounceMs,
		minLength: () => minLength,
		onclear: commitClear,
		onsearch: commitSearch
	});

	function handleInput(event: Event) {
		draftValue = (event.currentTarget as HTMLInputElement).value;
		searchController.schedule(draftValue);
	}

	$effect(() => {
		if (value === lastCommittedValue) return;
		lastCommittedValue = value;
		draftValue = value;
		searchController.cancel();
	});

	onDestroy(searchController.cancel);
</script>

<label class={cn('flex min-w-0 flex-col gap-1 text-sm font-medium', className)}>
	{#if label || (showCharacterLimit && maxLength)}
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			{#if label}<span>{label}</span>{/if}
			{#if showCharacterLimit && maxLength}<CharacterLimitHint value={draftValue} max={maxLength} />{/if}
		</span>
	{/if}
	<span class="relative">
		<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
		<input
			{id}
			{placeholder}
			aria-label={ariaLabel}
			maxlength={maxLength}
			{disabled}
			class={cn(
				'h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50',
				inputClass
			)}
			value={draftValue}
			oninput={handleInput}
		/>
	</span>
</label>
