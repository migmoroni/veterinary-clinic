<script lang="ts" module>
	export type SelectOption<T> = {
		value: T;
		label: string;
		level?: number;
	};
</script>

<script lang="ts" generics="T extends string | number | boolean | null | undefined">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	let {
		value = $bindable(),
		options,
		disabled = false,
		id = undefined,
		ariaLabel = undefined,
		class: className = '',
		trigger = undefined,
		onchange = undefined
	}: {
		value: T;
		options: SelectOption<T>[];
		disabled?: boolean;
		id?: string;
		ariaLabel?: string;
		class?: string;
		trigger?: Snippet<[{ selectedLabel: string; value: T; open: boolean }]>;
		onchange?: (value: T) => void;
	} = $props();

	let open = $state(false);
	let wrapperElement: HTMLDivElement | undefined = $state();

	function toggle(event?: Event) {
		if (event) {
			event.preventDefault();
		}
		if (disabled) return;
		open = !open;
	}

	function selectOption(event: Event, newValue: T) {
		event.preventDefault();
		event.stopPropagation();
		open = false;
		value = newValue;
		if (onchange) onchange(newValue);
	}

	function handleWindowClick(event: MouseEvent) {
		if (open && wrapperElement && !wrapperElement.contains(event.target as Node)) {
			open = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'Escape') {
			open = false;
			return;
		}
		
		if (event.key === 'Enter' || event.key === ' ') {
			if (!open) {
				event.preventDefault();
				open = true;
				return;
			}
		}
		
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) {
				open = true;
				return;
			}
			
			const currentIndex = options.findIndex((o) => o.value === value);
			let nextIndex = currentIndex;
			if (event.key === 'ArrowDown') {
				nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
			} else {
				nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
			}
			
			value = options[nextIndex].value;
			if (onchange) onchange(value);
		}
	}

	let selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');
</script>

<svelte:window onclick={handleWindowClick} />

<div class={cn("relative min-w-0 max-w-full", className)} bind:this={wrapperElement}>
	{#if typeof trigger !== 'undefined'}
		<div
			role="combobox"
			tabindex="0"
			aria-expanded={open}
			aria-controls="listbox-{id || 'select'}"
			aria-haspopup="listbox"
			aria-label={ariaLabel}
			aria-disabled={disabled}
			class={disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}
			onclick={toggle}
			onkeydown={handleKeyDown}
		>
			{@render trigger({ selectedLabel, value, open })}
		</div>
	{:else}
		<button
			{id}
			type="button"
			role="combobox"
			aria-expanded={open}
			aria-controls="listbox-{id || 'select'}"
			aria-haspopup="listbox"
			aria-label={ariaLabel}
			{disabled}
			class="flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 {!selectedLabel ? 'text-muted-foreground' : ''}"
			onclick={toggle}
			onkeydown={handleKeyDown}
		>
			<span class="truncate block min-w-0 text-left flex-1">{selectedLabel || '\u00A0'}</span>
			<ChevronDown class="size-4 shrink-0 opacity-50 ml-2" />
		</button>
	{/if}

	{#if open}
		<div
			id="listbox-{id || 'select'}"
			role="listbox"
			class="absolute z-50 mt-1 max-h-60 w-full min-w-32 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
		>
			{#each options as option (option.value)}
				<button
					type="button"
					role="option"
					aria-selected={value === option.value}
					class={cn(
						"relative flex w-full cursor-default items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
						value === option.value && "bg-accent/50"
					)}
					onclick={(e) => selectOption(e, option.value)}
				>
					<span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
						{#if value === option.value}
							<Check class="size-4" />
						{/if}
					</span>
					<span class="truncate" style:margin-left={`${option.level ?? 0}rem`}>{option.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
