<script lang="ts">
	import BinaryImage from '@vet/ui/components/shared/BinaryImage.svelte';
	import type { TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
	import Pill from '@lucide/svelte/icons/pill';
	import Syringe from '@lucide/svelte/icons/syringe';

	let {
		kind,
		imageBytes = null,
		alt = '',
		className = 'size-16',
		imageClass = 'h-full w-full object-cover',
		iconClass = 'size-5 text-muted-foreground'
	}: {
		kind: TreatmentKind;
		imageBytes?: Uint8Array | null;
		alt?: string;
		className?: string;
		imageClass?: string;
		iconClass?: string;
	} = $props();

	const FallbackIcon = $derived(kind === 'vaccine' ? Syringe : Pill);
</script>

<BinaryImage {imageBytes} {alt} {className} {imageClass} {iconClass} fallbackIcon={FallbackIcon} />
