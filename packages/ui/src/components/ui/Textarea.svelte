<script lang="ts">
	import { cn } from '@vet/ui/utils.js';

	let {
		value = $bindable(''),
		id,
		placeholder = '',
		ariaLabel,
		maxLength,
		readonly = false,
		oninput,
		class: className = ''
	}: {
		value?: string;
		id?: string;
		placeholder?: string;
		ariaLabel?: string;
		maxLength?: number;
		readonly?: boolean;
		oninput?: (value: string) => void;
		class?: string;
	} = $props();
</script>

<textarea
	{id}
	{placeholder}
	aria-label={ariaLabel}
	maxlength={maxLength}
	{readonly}
	bind:value
	oninput={() => oninput?.(value)}
	class={cn(
		'min-h-40 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30',
		className
	)}
></textarea>