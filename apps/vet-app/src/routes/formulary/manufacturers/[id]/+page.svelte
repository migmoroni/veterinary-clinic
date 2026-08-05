<script lang="ts">
	import FormularyDetailPage from '@vet/modules/knowledge/components/catalog/FormularyDetailPage.svelte';
	import ManufacturerFormularyDetail from '@vet/modules/knowledge/components/catalog/ManufacturerFormularyDetail.svelte';
	import { loadCatalogManufacturer } from '@vet/modules/knowledge/services/catalog.service.js';
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
