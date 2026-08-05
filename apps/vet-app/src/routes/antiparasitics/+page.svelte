<script lang="ts">
	import TreatmentAnalyticsPage from '@vet/modules/medical_records/components/treatment/TreatmentAnalyticsPage.svelte';

	const { basePath = '/antiparasitics' } = $props<{ basePath?: string }>();
</script>

<TreatmentAnalyticsPage kind="antiparasitic" {basePath} />
