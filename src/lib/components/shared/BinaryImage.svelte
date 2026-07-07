<!--
@component
Displays image bytes through a short-lived object URL and revokes that URL when
the bytes change or the component is destroyed. Renders a neutral placeholder
when no valid byte array is available.
-->
<script lang="ts">
	import { bytesToArrayBuffer } from '$lib/domain/shared/binary.js';
	import ImageIcon from '@lucide/svelte/icons/image';
	import type { Component } from 'svelte';

	let {
		imageBytes,
		alt = '',
		className = 'size-16',
		imageClass = 'h-full w-full object-cover',
		iconClass = 'size-5 text-muted-foreground',
		fallbackIcon = ImageIcon
	}: {
		imageBytes: Uint8Array | null | undefined;
		alt?: string;
		className?: string;
		imageClass?: string;
		iconClass?: string;
		fallbackIcon?: Component;
	} = $props();

	let imageUrl = $state<string | null>(null);
	const FallbackIcon = $derived(fallbackIcon);

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
		<FallbackIcon class={iconClass} aria-hidden="true" />
	{/if}
</span>
