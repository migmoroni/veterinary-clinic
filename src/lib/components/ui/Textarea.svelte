<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		value = $bindable(''),
		placeholder = '',
		ariaLabel,
		readonly = false,
		class: className = ''
	}: {
		value?: string;
		placeholder?: string;
		ariaLabel?: string;
		readonly?: boolean;
		class?: string;
	} = $props();
</script>

<textarea
	{placeholder}
	aria-label={ariaLabel}
	{readonly}
	bind:value
	class={cn(
		'min-h-40 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30',
		className
	)}
></textarea>