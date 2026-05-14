<script lang="ts">
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import type { DashboardBucket, DashboardNamedBucket, DashboardVaccineStatusKey } from '$lib/domain/dashboard/analytics.js';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	const dashboard = $derived(clinic.dashboard);

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function maxBucketCount(buckets: DashboardBucket[]): number {
		return buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
	}

	function bucketWidth(count: number, max: number): number {
		return max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
	}

	function topBuckets<T extends DashboardBucket>(buckets: T[], limit = 10): T[] {
		return buckets.slice(0, limit);
	}

	function petCountLabelKey(key: string): TranslationKey {
		return `analysis.petCount.${key}` as TranslationKey;
	}

	function vaccineStatusLabel(key: DashboardVaccineStatusKey): string {
		if (key === 'untracked') return t('analysis.vaccineStatus.untracked');
		return t(`vaccine.status.${key}` as TranslationKey);
	}

	function renderBucketLabel(bucket: DashboardNamedBucket): string {
		return bucket.label?.trim() || t('common.notInformed');
	}
</script>

{#if dashboard}
<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
		<UserPlus class="size-4" />
		{t('analysis.owners.title')}
	</div>
	<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.owners.description')}</p>

	<div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
		<div class="rounded-md border border-border bg-background p-4">
			<div class="flex items-center gap-2">
				<MapPin class="size-4 text-muted-foreground" />
				<h3 class="text-sm font-semibold">{t('analysis.owner.location')}</h3>
			</div>
			<div class="mt-3 grid gap-3 lg:grid-cols-2">
				{#each topBuckets(dashboard.analytics.owners.byLocation, 12) as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{renderBucketLabel(bucket)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.owners.byLocation))}%`}></span></span></div>
				{:else}
					<p class="text-sm text-muted-foreground">{t('analysis.empty')}</p>
				{/each}
			</div>
		</div>
		<div class="rounded-md border border-border bg-background p-4">
			<p class="text-sm font-semibold">{t('analysis.owner.averagePets')}</p>
			<p class="mt-3 text-3xl font-semibold">{metricFormatter(dashboard.analytics.owners.averagePetsPerOwner)}</p>
			<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('analysis.owner.averagePetsDescription')}</p>
		</div>
	</div>

	<div class="mt-4 grid gap-4 lg:grid-cols-2">
		<div class="rounded-md border border-border bg-background p-4">
			<h3 class="text-sm font-semibold">{t('analysis.owner.petCount')}</h3>
			<div class="mt-3 space-y-3">
				{#each dashboard.analytics.owners.byPetCount as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{t(petCountLabelKey(bucket.key))}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.owners.byPetCount))}%`}></span></span></div>
				{/each}
			</div>
		</div>
		<div class="rounded-md border border-border bg-background p-4">
			<h3 class="text-sm font-semibold">{t('analysis.owner.vaccineStatus')}</h3>
			<div class="mt-3 space-y-3">
				{#each dashboard.analytics.owners.byPetVaccineStatus as bucket}
					<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{vaccineStatusLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(dashboard.analytics.owners.byPetVaccineStatus))}%`}></span></span></div>
				{/each}
			</div>
		</div>
	</div>
</section>
{/if}
