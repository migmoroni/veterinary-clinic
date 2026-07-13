<script lang="ts">
	import FormularyDetailPage from '$lib/components/catalog/FormularyDetailPage.svelte';
	import ManufacturerFormularyDetail from '$lib/components/catalog/ManufacturerFormularyDetail.svelte';
	import { loadCatalogManufacturer } from '$lib/services/catalog.service.js';
</script>

<FormularyDetailPage
	fallbackTitleKey="catalog.manufacturers"
	notFoundKey="catalog.manufacturerNotFound"
	load={(id) => loadCatalogManufacturer(id, true, true)}
>
	{#snippet children(item)}
		<ManufacturerFormularyDetail {item} />
	{/snippet}
</FormularyDetailPage>
