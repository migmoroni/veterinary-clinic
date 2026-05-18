<script lang="ts">
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import type { DashboardBucket, DashboardVaccineStatusKey } from '$lib/domain/dashboard/analytics.js';
	import { getPetBreedOption, getPetSpeciesOption, isPetBreed, isPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import PawPrint from '@lucide/svelte/icons/paw-print';

	const dashboard = $derived(clinic.dashboard);

	function maxBucketCount(buckets: DashboardBucket[]): number {
		return buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
	}

	function bucketWidth(count: number, max: number): number {
		return max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
	}

	function topBuckets<T extends DashboardBucket>(buckets: T[], limit = 10): T[] {
		return buckets.slice(0, limit);
	}

	function speciesLabel(key: string): string {
		const option = isPetSpecies(key) ? getPetSpeciesOption(key) : null;
		return option ? t(option.labelKey) : t('common.notInformed');
	}

	function breedLabel(key: string): string {
		if (key === 'unknown') return t('common.notInformed');
		const option = isPetBreed(key) ? getPetBreedOption(key) : null;
		return option ? t(option.labelKey) : key;
	}

	function sexLabel(key: string): string {
		if (key === 'M') return t('pet.sexMale');
		if (key === 'F') return t('pet.sexFemale');
		return t('pet.sexUnknown');
	}

	function ageLabelKey(key: string): TranslationKey {
		return `analysis.age.${key}` as TranslationKey;
	}

	function vaccineStatusLabel(key: DashboardVaccineStatusKey): string {
		if (key === 'untracked') return t('analysis.vaccineStatus.untracked');
		return t(`vaccine.status.${key}` as TranslationKey);
	}
</script>

{#if dashboard}
<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
		<PawPrint class="size-4" />
		{t('analysis.pets.title')}
	</div>
	<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.pets.description')}</p>

	<div class="mt-5 grid gap-4 lg:grid-cols-2">
		<div class="rounded-md border border-border bg-background p-4">
			<h3 class="text-sm font-semibold">{t('analysis.pet.species')}</h3>
			<div class="mt-3 space-y-3">
				{#each dashboard.analytics.pets.bySpecies as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{speciesLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.pets.bySpecies))}%`}></span></span></div>
				{/each}
			</div>
		</div>

		<div class="rounded-md border border-border bg-background p-4">
			<h3 class="text-sm font-semibold">{t('analysis.pet.sex')}</h3>
			<div class="mt-3 space-y-3">
				{#each dashboard.analytics.pets.bySex as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{sexLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.pets.bySex))}%`}></span></span></div>
				{/each}
			</div>
		</div>

		<div class="rounded-md border border-border bg-background p-4">
			<h3 class="text-sm font-semibold">{t('analysis.pet.age')}</h3>
			<div class="mt-3 space-y-3">
				{#each dashboard.analytics.pets.byAge as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{t(ageLabelKey(bucket.key))}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.pets.byAge))}%`}></span></span></div>
				{/each}
			</div>
		</div>

		<div class="rounded-md border border-border bg-background p-4">
			<h3 class="text-sm font-semibold">{t('analysis.pet.vaccineStatus')}</h3>
			<div class="mt-3 space-y-3">
				{#each dashboard.analytics.pets.byVaccineStatus as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{vaccineStatusLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.pets.byVaccineStatus))}%`}></span></span></div>
				{/each}
			</div>
		</div>
	</div>

	<div class="mt-4 rounded-md border border-border bg-background p-4">
		<h3 class="text-sm font-semibold">{t('analysis.pet.breed')}</h3>
		<div class="mt-3 grid gap-3 lg:grid-cols-2">
			{#each topBuckets(dashboard.analytics.pets.byBreed) as bucket}
				<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{breedLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.pets.byBreed))}%`}></span></span></div>
			{:else}
				<p class="text-sm text-muted-foreground">{t('analysis.empty')}</p>
			{/each}
		</div>
	</div>
</section>
{/if}
