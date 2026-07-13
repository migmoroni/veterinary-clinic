<script lang="ts">
	import ConditionFormularyDetail from '$lib/components/catalog/ConditionFormularyDetail.svelte';
	import FormularyDetailPage from '$lib/components/catalog/FormularyDetailPage.svelte';
	import { loadCatalogCondition } from '$lib/services/catalog.service.js';
</script>

<FormularyDetailPage
	fallbackTitleKey="catalog.conditions"
	notFoundKey="catalog.conditionNotFound"
	load={(id) => loadCatalogCondition(id, true, true)}
>
	{#snippet children(item)}
		<ConditionFormularyDetail {item} />
	{/snippet}
</FormularyDetailPage>
