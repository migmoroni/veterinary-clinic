<script lang="ts">
	import { ConditionFormularyDetail } from '@vet/modules/knowledge/conditions';
	import { FormularyDetailPage } from '@vet/modules/knowledge';
	import { loadCatalogCondition } from '@vet/modules/knowledge';
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
