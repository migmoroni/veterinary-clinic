<script lang="ts">
	import TreatmentAnalyticsPage from '@vet/modules/medical_records/components/treatment/TreatmentAnalyticsPage.svelte';

	const { basePath = '/vaccines' } = $props<{ basePath?: string }>();
</script>

<TreatmentAnalyticsPage kind="vaccine" {basePath} />
