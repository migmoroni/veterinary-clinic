<script lang="ts">
	import FormularyDetailPage from '$lib/components/catalog/FormularyDetailPage.svelte';
	import ProductFormularyDetail from '$lib/components/catalog/ProductFormularyDetail.svelte';
	import { loadCatalogProduct } from '$lib/services/catalog.service.js';
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
