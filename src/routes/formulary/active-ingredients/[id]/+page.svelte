<script lang="ts">
	import ActiveIngredientFormularyDetail from '$lib/components/catalog/ActiveIngredientFormularyDetail.svelte';
	import FormularyDetailPage from '$lib/components/catalog/FormularyDetailPage.svelte';
	import { loadCatalogActiveIngredient } from '$lib/services/catalog.service.js';
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
