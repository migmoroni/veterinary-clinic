<script lang="ts">
	import OwnerContactEditorList from '$lib/components/owner/OwnerContactEditorList.svelte';
	import type { OwnerContactInput } from '$lib/domain/owner/owner.js';

	let { contacts = $bindable<OwnerContactInput[]>([]), country = 'BRA' }: { contacts?: OwnerContactInput[]; country?: string | null } = $props();
</script>

<div class="sm:col-span-5 pt-2">
	<OwnerContactEditorList bind:contacts country={country} titleKey="owner.contacts" />
</div>
