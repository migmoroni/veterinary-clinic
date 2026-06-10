<!--
@component
Displays image bytes through a short-lived object URL and revokes that URL when
the bytes change or the component is destroyed. Renders a neutral placeholder
when no valid byte array is available.
-->
<script lang="ts">
	import { bytesToArrayBuffer } from '$lib/domain/shared/binary.js';
	import ImageIcon from '@lucide/svelte/icons/image';

	let {
		imageBytes,
		alt = '',
		className = 'size-16',
		imageClass = 'h-full w-full object-cover'
	}: {
		imageBytes: Uint8Array | null | undefined;
		alt?: string;
		className?: string;
		imageClass?: string;
	} = $props();

	let imageUrl = $state<string | null>(null);

	$effect(() => {
		if (!imageBytes || imageBytes.length === 0 || typeof URL === 'undefined' || typeof Blob === 'undefined') {
			imageUrl = null;
			return;
		}

		const nextUrl = URL.createObjectURL(new Blob([bytesToArrayBuffer(imageBytes)]));
		imageUrl = nextUrl;
		return () => URL.revokeObjectURL(nextUrl);
	});
</script>

<span class={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted ${className}`}>
	{#if imageUrl}
		<img src={imageUrl} {alt} class={imageClass} draggable="false" />
	{:else}
		<ImageIcon class="size-5 text-muted-foreground" aria-hidden="true" />
	{/if}
</span>
