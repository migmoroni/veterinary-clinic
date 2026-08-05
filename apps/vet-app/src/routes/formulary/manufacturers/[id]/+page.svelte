<script lang="ts">
	import { FormularyDetailPage } from '@vet/modules/knowledge';
	import { ManufacturerFormularyDetail } from '@vet/modules/knowledge/manufacturers';
	import { loadCatalogManufacturer } from '@vet/modules/knowledge';
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
