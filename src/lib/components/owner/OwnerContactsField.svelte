<script lang="ts">
	import OwnerContactEditorList from '$lib/components/owner/OwnerContactEditorList.svelte';
	import type { OwnerContactInput } from '$lib/domain/owner/owner.js';

	let { contacts = $bindable<OwnerContactInput[]>([]), country = 'BRA' }: { contacts?: OwnerContactInput[]; country?: string | null } = $props();
</script>

<div class="min-w-0 max-w-full pt-2 sm:col-span-5">
	<OwnerContactEditorList bind:contacts country={country} titleKey="owner.contacts" />
</div>
