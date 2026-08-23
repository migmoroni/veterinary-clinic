<script lang="ts">
	import { FormularyDetailPage } from '@vet/modules/knowledge';
	import { ProductFormularyDetail } from '@vet/modules/knowledge/products';
	import { loadCatalogProduct } from '@vet/modules/knowledge';
</script>

<FormularyDetailPage
	fallbackTitleKey="formulary.title"
	notFoundKey="formulary.detailNotFound"
	load={(id) => loadCatalogProduct(id, true, true)}
	kickerKey="formulary.kicker"
	descriptionKey="formulary.description"
>
	{#snippet children(item)}
		<ProductFormularyDetail {item} />
	{/snippet}
</FormularyDetailPage>
