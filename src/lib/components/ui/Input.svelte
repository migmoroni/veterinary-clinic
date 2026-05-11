<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		value = $bindable(''),
		id,
		type = 'text',
		placeholder = '',
		ariaLabel,
		class: className = '',
		oninput
	}: {
		value?: string;
		id?: string;
		type?: string;
		placeholder?: string;
		ariaLabel?: string;
		class?: string;
		oninput?: (event: Event) => void;
	} = $props();
</script>

<input
	{id}
	{type}
	{placeholder}
	aria-label={ariaLabel}
	bind:value
	class={cn(
		'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30',
		className
	)}
	{oninput}
/>