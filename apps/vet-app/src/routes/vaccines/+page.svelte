<script lang="ts">
	import TreatmentAnalyticsPage from '$lib/components/treatment/TreatmentAnalyticsPage.svelte';

	const { basePath = '/vaccines' } = $props<{ basePath?: string }>();
</script>

<TreatmentAnalyticsPage kind="vaccine" {basePath} />
