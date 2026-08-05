<script lang="ts">
	import ConditionFormularyDetail from '@vet/modules/knowledge/components/catalog/ConditionFormularyDetail.svelte';
	import FormularyDetailPage from '@vet/modules/knowledge/components/catalog/FormularyDetailPage.svelte';
	import { loadCatalogCondition } from '@vet/modules/knowledge/services/catalog.service.js';
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
