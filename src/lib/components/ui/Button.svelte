<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
	type Size = 'sm' | 'md' | 'lg';

	let {
		children,
		variant = 'primary',
		size = 'md',
		class: className = '',
		type = 'button',
		disabled = false,
		ariaLabel,
		onclick
	}: {
		children?: Snippet;
		variant?: Variant;
		size?: Size;
		class?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		ariaLabel?: string;
		onclick?: (event: MouseEvent) => void;
	} = $props();

	const variantClass = $derived(
		({
			primary: 'bg-primary text-primary-foreground hover:opacity-95',
			secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
			outline: 'border border-border bg-card text-foreground hover:bg-accent',
			ghost: 'text-foreground hover:bg-accent',
			destructive: 'bg-destructive text-white hover:opacity-95'
		} satisfies Record<Variant, string>)[variant]
	);

	const sizeClass = $derived(
		({
			sm: 'h-8 px-2.5 text-xs',
			md: 'h-10 px-4 text-sm',
			lg: 'h-11 px-5 text-sm'
		} satisfies Record<Size, string>)[size]
	);
</script>

<button
	{type}
	{disabled}
	aria-label={ariaLabel}
	class={cn(
		'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
		variantClass,
		sizeClass,
		className
	)}
	{onclick}
>
	{#if children}
		{@render children()}
	{/if}
</button>