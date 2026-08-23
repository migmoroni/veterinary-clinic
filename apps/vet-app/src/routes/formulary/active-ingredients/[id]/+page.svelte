<script lang="ts">
	import { ActiveIngredientFormularyDetail } from '@vet/modules/knowledge/active_ingredients';
	import { FormularyDetailPage } from '@vet/modules/knowledge';
	import { loadCatalogActiveIngredient } from '@vet/modules/knowledge';
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
