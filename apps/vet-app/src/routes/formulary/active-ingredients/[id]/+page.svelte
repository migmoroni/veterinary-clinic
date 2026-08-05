<script lang="ts">
	import ActiveIngredientFormularyDetail from '@vet/modules/knowledge/components/catalog/ActiveIngredientFormularyDetail.svelte';
	import FormularyDetailPage from '@vet/modules/knowledge/components/catalog/FormularyDetailPage.svelte';
	import { loadCatalogActiveIngredient } from '@vet/modules/knowledge/services/catalog.service.js';
</script>

<FormularyDetailPage
	fallbackTitleKey="catalog.activeIngredients"
	notFoundKey="catalog.activeIngredientNotFound"
	load={(id) => loadCatalogActiveIngredient(id, true, true)}
>
	{#snippet children(item)}
		<ActiveIngredientFormularyDetail {item} />
	{/snippet}
</FormularyDetailPage>
