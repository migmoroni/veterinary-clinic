<script lang="ts">
	import TreatmentAnalyticsPage from '$lib/components/treatment/TreatmentAnalyticsPage.svelte';

	const { basePath = '/antiparasitics' } = $props<{ basePath?: string }>();
</script>

<TreatmentAnalyticsPage kind="antiparasitic" {basePath} />
