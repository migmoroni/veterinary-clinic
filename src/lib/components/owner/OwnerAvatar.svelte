<script lang="ts">
	import { bytesToArrayBuffer } from '$lib/domain/shared/binary.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import UserRound from '@lucide/svelte/icons/user-round';

	let {
		avatarBytes = null,
		ownerName = '',
		avatarAltKey = 'owner.avatarAlt',
		avatarPlaceholderAltKey = 'owner.avatarPlaceholderAlt',
		className = 'size-10',
		imageClass = 'h-full w-full object-cover',
		iconClass = 'size-5 text-muted-foreground'
	}: {
		avatarBytes?: Uint8Array | null;
		ownerName?: string;
		avatarAltKey?: TranslationKey;
		avatarPlaceholderAltKey?: TranslationKey;
		className?: string;
		imageClass?: string;
		iconClass?: string;
	} = $props();

	let imageUrl = $state<string | null>(null);

	const trimmedOwnerName = $derived(ownerName.trim());
	const label = $derived(`${imageUrl ? t(avatarAltKey) : t(avatarPlaceholderAltKey)}${trimmedOwnerName ? `: ${trimmedOwnerName}` : ''}`);

	$effect(() => {
		if (!avatarBytes || avatarBytes.length === 0 || typeof URL === 'undefined' || typeof Blob === 'undefined') {
			imageUrl = null;
			return;
		}

		const nextImageUrl = URL.createObjectURL(new Blob([bytesToArrayBuffer(avatarBytes)], { type: 'image/png' }));
		imageUrl = nextImageUrl;

		return () => URL.revokeObjectURL(nextImageUrl);
	});
</script>

<span class={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted ${className}`} role="img" aria-label={label}>
	{#if imageUrl}
		<img src={imageUrl} alt="" class={imageClass} draggable="false" />
	{:else}
		<UserRound class={iconClass} aria-hidden="true" />
	{/if}
</span>
