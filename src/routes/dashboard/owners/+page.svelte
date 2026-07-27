<script lang="ts">
	import { tick } from 'svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import { dashboardAgeBandSortValue, dashboardAgeBandYear } from '$lib/domain/dashboard/age-bands.js';
	import {
		dashboardOwnerAnalysisKinds,
		dashboardPetCountBandWeight,
		dashboardTreatmentStatusWeight,
		type DashboardBucket,
		type DashboardBucketSortField,
		type DashboardOwnerAnalysisKind,
		type DashboardOwnerStudyItem,
		type DashboardOwnerStudyPet,
		type DashboardPetCountBandKey,
		type DashboardSortDirection,
		type DashboardSpeciesKey,
		type DashboardVaccineStatusKey
	} from '$lib/domain/dashboard/analytics.js';
	import { getPetSpeciesOption, isPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { loadPetAvatarsByPetIds } from '$lib/services/avatar.service.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import List from '@lucide/svelte/icons/list';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Syringe from '@lucide/svelte/icons/syringe';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	type OwnerSortOrder = 'name' | 'location' | 'petCount' | 'vaccineStatus';
	type OwnerBucket = DashboardBucket & { label?: string | null };

	const dashboard = $derived(clinic.dashboard);
	const allOwners = $derived(dashboard?.analytics.study.owners ?? []);
	const analysisKinds = dashboardOwnerAnalysisKinds;

	let activeAnalysis = $state<DashboardOwnerAnalysisKind>('petVaccineStatus');
	let selectedBucketKey = $state('');
	let bucketSortField = $state<DashboardBucketSortField>('count');
	let bucketSortDirection = $state<DashboardSortDirection>('asc');
	let sortOrder = $state<OwnerSortOrder>('name');
	let visibleOwners = $state<DashboardOwnerStudyItem[]>([]);
	let listLoading = $state(false);
	let avatarBytesByPetId = $state(new Map<string, Uint8Array | null>());
	let renderRequestId = 0;

	const activeBuckets = $derived(sortBuckets(bucketsForAnalysis(activeAnalysis), activeAnalysis, bucketSortField, bucketSortDirection));
	const selectedBucket = $derived(activeBuckets.find((bucket) => bucket.key === selectedBucketKey) ?? null);
	const listedOwners = $derived(sortOwners(filterOwnersByBucket(allOwners, activeAnalysis, selectedBucketKey), sortOrder));
	const selectedPercent = $derived(allOwners.length > 0 ? Math.round((listedOwners.length / allOwners.length) * 1000) / 10 : 0);

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function percentFormatter(value: number): string {
		return `${metricFormatter(value)}%`;
	}

	function analysisLabelKey(kind: DashboardOwnerAnalysisKind): TranslationKey {
		if (kind === 'location') return 'analysis.owner.location';
		if (kind === 'petCount') return 'analysis.owner.petCount';
		if (kind === 'petSpecies') return 'analysis.owner.petSpecies';
		if (kind === 'petAge') return 'analysis.owner.petAge';
		return 'analysis.owner.vaccineStatus';
	}

	function analysisLabel(kind: DashboardOwnerAnalysisKind): string {
		return t(analysisLabelKey(kind));
	}

	function incrementBucket(buckets: Map<string, OwnerBucket>, key: string, label: string | null = null): void {
		const bucket = buckets.get(key) ?? { key, label, count: 0 };
		bucket.count += 1;
		if (label) bucket.label = label;
		buckets.set(key, bucket);
	}

	function ensureBucket(buckets: Map<string, OwnerBucket>, key: string, label: string | null = null): void {
		if (!buckets.has(key)) buckets.set(key, { key, label, count: 0 });
	}

	function toBuckets(buckets: Map<string, OwnerBucket>): OwnerBucket[] {
		return [...buckets.values()].sort((first, second) => second.count - first.count || bucketLabelText(first).localeCompare(bucketLabelText(second), i18n.locale));
	}

	function addUnique(values: string[], value: string): void {
		if (!values.includes(value)) values.push(value);
	}

	function ownerPetCountBand(value: number): DashboardPetCountBandKey {
		if (value <= 0) return 'none';
		if (value === 1) return 'one';
		if (value === 2) return 'two';
		return 'threePlus';
	}

	function ownerVaccineStatus(owner: DashboardOwnerStudyItem): DashboardVaccineStatusKey {
		let status: DashboardVaccineStatusKey = 'untracked';
		for (const pet of owner.pets) if (dashboardTreatmentStatusWeight[pet.vaccineStatus] > dashboardTreatmentStatusWeight[status]) status = pet.vaccineStatus;
		return status;
	}

	function ownerPetSpeciesKeys(owner: DashboardOwnerStudyItem): DashboardSpeciesKey[] {
		const keys: string[] = [];
		for (const pet of owner.pets) addUnique(keys, pet.species);
		return (keys.length > 0 ? keys : ['unknown']) as DashboardSpeciesKey[];
	}

	function ownerPetAgeKeys(owner: DashboardOwnerStudyItem): string[] {
		const keys: string[] = [];
		for (const pet of owner.pets) addUnique(keys, pet.age);
		return keys.length > 0 ? keys : ['unknown'];
	}

	function locationBuckets(): OwnerBucket[] {
		return (dashboard?.analytics.owners.byLocation ?? []).map((bucket) => ({ key: bucket.key, label: bucket.label, count: bucket.count }));
	}

	function petCountBuckets(): OwnerBucket[] {
		return (dashboard?.analytics.owners.byPetCount ?? []).map((bucket) => ({ key: bucket.key, count: bucket.count }));
	}

	function petVaccineStatusBuckets(): OwnerBucket[] {
		return (dashboard?.analytics.owners.byPetVaccineStatus ?? []).map((bucket) => ({ key: bucket.key, count: bucket.count }));
	}

	function petSpeciesBuckets(): OwnerBucket[] {
		const buckets = new Map<string, OwnerBucket>();
		for (const owner of allOwners) for (const key of ownerPetSpeciesKeys(owner)) incrementBucket(buckets, key);
		return toBuckets(buckets);
	}

	function petAgeBuckets(): OwnerBucket[] {
		const buckets = new Map<string, OwnerBucket>();
		for (const owner of allOwners) for (const key of ownerPetAgeKeys(owner)) incrementBucket(buckets, key);
		for (const bucket of dashboard?.analytics.pets.byAge ?? []) if (bucket.key !== 'unknown') ensureBucket(buckets, bucket.key);
		return toBuckets(buckets);
	}

	function bucketsForAnalysis(kind: DashboardOwnerAnalysisKind): OwnerBucket[] {
		if (!dashboard) return [];
		if (kind === 'location') return locationBuckets();
		if (kind === 'petCount') return petCountBuckets();
		if (kind === 'petSpecies') return petSpeciesBuckets();
		if (kind === 'petAge') return petAgeBuckets();
		return petVaccineStatusBuckets();
	}

	function bucketTotal(): number {
		return allOwners.length;
	}

	function bucketPercent(bucket: OwnerBucket): number {
		const total = bucketTotal();
		if (total <= 0 || bucket.count <= 0) return 0;
		return Math.round((bucket.count / total) * 1000) / 10;
	}

	function bucketWidth(bucket: OwnerBucket, buckets = activeBuckets): number {
		const max = buckets.reduce((currentMax, item) => Math.max(currentMax, item.count), 0);
		return max > 0 ? Math.max(4, Math.round((bucket.count / max) * 100)) : 0;
	}

	function topBucket(kind: DashboardOwnerAnalysisKind): OwnerBucket | null {
		return bucketsForAnalysis(kind)[0] ?? null;
	}

	function topBucketText(kind: DashboardOwnerAnalysisKind): string {
		const bucket = topBucket(kind);
		if (!bucket) return t('analysis.empty');
		return `${bucketLabel(kind, bucket)} - ${metricFormatter(bucket.count)}`;
	}

	function speciesLabel(key: string): string {
		if (key === 'unknown') return t('common.notInformed');
		const option = isPetSpecies(key) ? getPetSpeciesOption(key) : null;
		return option ? t(option.labelKey) : key;
	}

	function ageBandLabel(key: string): string {
		if (key === 'months0To3') return `0-3 ${t('pet.ageMonthPlural')}`;
		if (key === 'months3To6') return `3-6 ${t('pet.ageMonthPlural')}`;
		if (key === 'months6To12') return `6-12 ${t('pet.ageMonthPlural')}`;
		if (key === 'unknown') return t('analysis.age.unknown');

		const year = dashboardAgeBandYear(key);
		if (year !== null) return `${metricFormatter(year)} ${t(year === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural')}`;

		return t('common.notInformed');
	}

	function petCountLabel(key: string): string {
		return t(`analysis.petCount.${key}` as TranslationKey);
	}

	function vaccineStatusLabel(key: DashboardVaccineStatusKey): string {
		if (key === 'untracked') return t('analysis.vaccineStatus.untracked');
		return t(`treatment.status.${key}` as TranslationKey);
	}

	function bucketLabelText(bucket: OwnerBucket): string {
		return bucket.label?.trim() || bucket.key;
	}

	function bucketLabel(kind: DashboardOwnerAnalysisKind, bucket: OwnerBucket): string {
		if (kind === 'location') return bucket.label?.trim() || t('common.notInformed');
		if (kind === 'petCount') return petCountLabel(bucket.key);
		if (kind === 'petSpecies') return speciesLabel(bucket.key);
		if (kind === 'petAge') return ageBandLabel(bucket.key);
		return vaccineStatusLabel(bucket.key as DashboardVaccineStatusKey);
	}

	function bucketSortDimensionLabel(kind: DashboardOwnerAnalysisKind): string {
		if (kind === 'location') return t('analysis.study.city');
		if (kind === 'petCount') return t('analysis.study.ownerPetCount');
		if (kind === 'petSpecies') return t('analysis.study.species');
		if (kind === 'petAge') return t('analysis.study.age');
		return t('analysis.study.vaccineStatus');
	}

	function bucketSortOptions(): { value: DashboardBucketSortField; label: string }[] {
		return [
			{ value: 'analysis', label: bucketSortDimensionLabel(activeAnalysis) },
			{ value: 'count', label: t('analysis.sortBy.count') }
		];
	}

	function bucketUnknownCompare(first: OwnerBucket, second: OwnerBucket): number {
		if (first.key === 'unknown' && second.key !== 'unknown') return 1;
		if (first.key !== 'unknown' && second.key === 'unknown') return -1;
		return 0;
	}

	function bucketAnalysisBaseCompare(kind: DashboardOwnerAnalysisKind, first: OwnerBucket, second: OwnerBucket): number {
		if (kind === 'petCount') return dashboardPetCountBandWeight[first.key as DashboardPetCountBandKey] - dashboardPetCountBandWeight[second.key as DashboardPetCountBandKey];
		if (kind === 'petAge') return dashboardAgeBandSortValue(first.key) - dashboardAgeBandSortValue(second.key);
		if (kind === 'petVaccineStatus') return dashboardTreatmentStatusWeight[first.key as DashboardVaccineStatusKey] - dashboardTreatmentStatusWeight[second.key as DashboardVaccineStatusKey];
		return bucketLabel(kind, first).localeCompare(bucketLabel(kind, second), i18n.locale);
	}

	function bucketAnalysisCompare(kind: DashboardOwnerAnalysisKind, first: OwnerBucket, second: OwnerBucket, direction: DashboardSortDirection): number {
		const unknownCompare = bucketUnknownCompare(first, second);
		if (unknownCompare !== 0) return unknownCompare;

		const analysisCompare = bucketAnalysisBaseCompare(kind, first, second);
		return direction === 'asc' ? analysisCompare : -analysisCompare;
	}

	function sortBuckets(buckets: OwnerBucket[], kind: DashboardOwnerAnalysisKind, field: DashboardBucketSortField, direction: DashboardSortDirection): OwnerBucket[] {
		return [...buckets].sort((first, second) => {
			if (field === 'count') {
				const countCompare = first.count - second.count;
				const orderedCountCompare = direction === 'asc' ? countCompare : -countCompare;
				if (orderedCountCompare !== 0) return orderedCountCompare;
				return bucketAnalysisCompare(kind, first, second, 'asc');
			}

			return bucketAnalysisCompare(kind, first, second, direction);
		});
	}

	function selectAnalysis(kind: DashboardOwnerAnalysisKind): void {
		activeAnalysis = kind;
		selectedBucketKey = '';
	}

	function clearSelectedBucket(): void {
		selectedBucketKey = '';
	}

	function ownerMatchesBucket(owner: DashboardOwnerStudyItem, kind: DashboardOwnerAnalysisKind, key: string): boolean {
		if (!key) return true;
		if (kind === 'location') return owner.locationKey === key;
		if (kind === 'petCount') return ownerPetCountBand(owner.petCount) === key;
		if (kind === 'petSpecies') return ownerPetSpeciesKeys(owner).includes(key as DashboardSpeciesKey);
		if (kind === 'petAge') return ownerPetAgeKeys(owner).includes(key);
		return ownerVaccineStatus(owner) === key;
	}

	function filterOwnersByBucket(owners: DashboardOwnerStudyItem[], kind: DashboardOwnerAnalysisKind, key: string): DashboardOwnerStudyItem[] {
		return owners.filter((owner) => ownerMatchesBucket(owner, kind, key));
	}

	function sortOwners(owners: DashboardOwnerStudyItem[], order: OwnerSortOrder): DashboardOwnerStudyItem[] {
		return [...owners].sort((first, second) => {
			if (order === 'location') {
				const locationCompare = ownerLocationText(first).localeCompare(ownerLocationText(second), i18n.locale);
				if (locationCompare !== 0) return locationCompare;
			}

			if (order === 'petCount') {
				const petCountCompare = second.petCount - first.petCount;
				if (petCountCompare !== 0) return petCountCompare;
			}

			if (order === 'vaccineStatus') {
				const statusCompare = dashboardTreatmentStatusWeight[ownerVaccineStatus(second)] - dashboardTreatmentStatusWeight[ownerVaccineStatus(first)];
				if (statusCompare !== 0) return statusCompare;
			}

			return first.name.localeCompare(second.name, i18n.locale);
		});
	}

	function selectedBucketLabel(): string {
		if (!selectedBucketKey) return t('analysis.study.all');
		return selectedBucket ? bucketLabel(activeAnalysis, selectedBucket) : t('common.notInformed');
	}

	function ownerLocationText(owner: DashboardOwnerStudyItem): string {
		return owner.locationLabel ?? owner.cityLabel ?? t('common.notInformed');
	}

	function ownerPetNamesText(owner: DashboardOwnerStudyItem): string {
		return summaryText(owner.petNames);
	}

	function summaryText(values: string[], limit = 4): string {
		const unique = [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
		if (unique.length === 0) return t('common.notInformed');

		const shown = unique.slice(0, limit).join(' - ');
		if (unique.length <= limit) return shown;
		return `${shown} +${metricFormatter(unique.length - limit)}`;
	}

	function ownerPetSpeciesText(owner: DashboardOwnerStudyItem): string {
		return summaryText(ownerPetSpeciesKeys(owner).map(speciesLabel), 3);
	}

	function ownerPetAgeText(owner: DashboardOwnerStudyItem): string {
		return summaryText(ownerPetAgeKeys(owner).map(ageBandLabel), 3);
	}

	function ownerPetVaccinesText(owner: DashboardOwnerStudyItem): string {
		return summaryText(owner.pets.flatMap((pet) => pet.vaccineNames), 3);
	}

	function ownerProfileHref(owner: DashboardOwnerStudyItem): string {
		return `/owners/${owner.id}`;
	}

	function visibleOwnerPets(owner: DashboardOwnerStudyItem): DashboardOwnerStudyPet[] {
		return owner.pets.slice(0, 3);
	}

	function petAvatarBytes(pet: DashboardOwnerStudyPet): Uint8Array | null {
		return avatarBytesByPetId.get(pet.id) ?? pet.avatarBytes;
	}

	async function waitForNextPaint(): Promise<void> {
		await tick();
		if (typeof requestAnimationFrame === 'undefined') return;
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}

	async function renderOwnersInChunks(source: DashboardOwnerStudyItem[]): Promise<void> {
		const requestId = ++renderRequestId;
		visibleOwners = [];
		listLoading = source.length > 0;
		await waitForNextPaint();

		const chunkSize = 80;
		for (let index = 0; index < source.length; index += chunkSize) {
			if (requestId !== renderRequestId) return;
			visibleOwners = source.slice(0, Math.min(source.length, index + chunkSize));
			await waitForNextPaint();
		}

		if (requestId === renderRequestId) listLoading = false;
	}

	async function loadVisibleOwnerPetAvatars(owners: DashboardOwnerStudyItem[]): Promise<void> {
		const petIds = owners.flatMap((owner) => visibleOwnerPets(owner).map((pet) => pet.id));
		const missingIds = [...new Set(petIds)].filter((id) => !avatarBytesByPetId.has(id));
		if (missingIds.length === 0) return;

		try {
			const loadedAvatars = await loadPetAvatarsByPetIds(missingIds);
			const nextAvatars = new Map(avatarBytesByPetId);
			for (const id of missingIds) nextAvatars.set(id, loadedAvatars.get(id) ?? null);
			avatarBytesByPetId = nextAvatars;
		} catch (error) {
			console.error(error);
		}
	}

	$effect(() => {
		void renderOwnersInChunks(listedOwners);
	});

	$effect(() => {
		void loadVisibleOwnerPetAvatars(visibleOwners);
	});

	$effect(() => {
		if (selectedBucketKey && !activeBuckets.some((bucket) => bucket.key === selectedBucketKey)) selectedBucketKey = '';
	});
</script>

{#if dashboard}
	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
			<UserPlus class="size-4" />
			{t('analysis.owners.title')}
		</div>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.owners.description')}</p>

		<div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5" role="tablist" aria-label={t('analysis.owners.title')}>
			{#each analysisKinds as kind}
				{@const top = topBucket(kind)}
				<button
					class="flex min-h-36 flex-col rounded-md border bg-background p-3 text-left transition-colors hover:bg-accent {activeAnalysis === kind ? 'border-primary ring-2 ring-ring/30' : 'border-border'}"
					type="button"
					role="tab"
					aria-selected={activeAnalysis === kind}
					onclick={() => selectAnalysis(kind)}
				>
					<span class="flex items-start justify-between gap-3">
						<span class="min-w-0">
							<span class="flex items-center gap-2 text-sm font-semibold">
								{#if kind === 'location'}<MapPin class="size-4 shrink-0" />{:else if kind === 'petVaccineStatus'}<Syringe class="size-4 shrink-0" />{:else}<ChartColumn class="size-4 shrink-0" />{/if}
								<span class="truncate">{analysisLabel(kind)}</span>
							</span>
							<span class="mt-2 block min-h-10 text-xs leading-5 text-muted-foreground">{topBucketText(kind)}</span>
						</span>
						<span class="shrink-0 text-right">
							<span class="block text-2xl font-semibold text-foreground">{metricFormatter(bucketTotal())}</span>
							<span class="mt-1 block text-xs text-muted-foreground">{top ? percentFormatter(bucketPercent(top)) : '0%'}</span>
						</span>
					</span>
					<span class="mt-auto block h-2 rounded-full bg-muted">
						<span class="block h-2 rounded-full bg-primary" style={`width: ${top ? bucketWidth(top, bucketsForAnalysis(kind)) : 0}%`}></span>
					</span>
				</button>
			{/each}
		</div>

		<div class="mt-5 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
			<aside class="rounded-md border border-border bg-background p-4 xl:sticky xl:top-5 xl:self-start">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<ChartColumn class="size-4" />
					<span>{analysisLabel(activeAnalysis)}</span>
				</div>

				<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
					<div>
						<label class="text-sm font-medium" for="owner-bucket-sort-field">{t('analysis.sortBy')}</label>
						<Select id="owner-bucket-sort-field" class="mt-1 h-9 w-full" value={bucketSortField} options={bucketSortOptions()} onchange={(value) => (bucketSortField = value as DashboardBucketSortField)} />
					</div>
					<div>
						<label class="text-sm font-medium" for="owner-bucket-sort-direction">{t('analysis.sortDirection')}</label>
						<Select
							id="owner-bucket-sort-direction"
							class="mt-1 h-9 w-full"
							value={bucketSortDirection}
							options={[
								{ value: 'asc', label: t('analysis.sortDirection.asc') },
								{ value: 'desc', label: t('analysis.sortDirection.desc') }
							]}
							onchange={(value) => (bucketSortDirection = value as DashboardSortDirection)}
						/>
					</div>
				</div>

				<div class="mt-4 max-h-128 space-y-2 overflow-auto rounded-md border border-border p-2">
					<button
						class="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent {!selectedBucketKey ? 'border-primary bg-primary/10 ring-2 ring-ring/20' : 'border-border bg-background'}"
						type="button"
						onclick={clearSelectedBucket}
					>
						<span class="truncate font-medium">{t('analysis.study.all')}</span>
						<span class="shrink-0 font-semibold tabular-nums">{metricFormatter(allOwners.length)}</span>
					</button>

					{#each activeBuckets as bucket}
						<button
							class="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent {selectedBucketKey === bucket.key ? 'border-primary bg-primary/10 ring-2 ring-ring/20' : 'border-border bg-background'}"
							type="button"
							onclick={() => (selectedBucketKey = bucket.key)}
						>
							<span class="flex items-center justify-between gap-3">
								<span class="truncate font-medium" title={bucketLabel(activeAnalysis, bucket)}>{bucketLabel(activeAnalysis, bucket)}</span>
								<span class="shrink-0 font-semibold tabular-nums">{metricFormatter(bucket.count)}</span>
							</span>
							<span class="mt-2 block h-2 rounded-full bg-muted">
								<span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket)}%`}></span>
							</span>
							<span class="mt-1 block text-right text-xs text-muted-foreground">{percentFormatter(bucketPercent(bucket))}</span>
						</button>
					{:else}
						<p class="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">{t('analysis.empty')}</p>
					{/each}
				</div>
			</aside>

			<section class="min-w-0 rounded-md border border-border bg-background p-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="flex items-center gap-2 text-sm font-semibold"><List class="size-4" />{t('analysis.study.relatedOwners')}</h3>
							<span class="inline-flex max-w-full items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
								<span class="truncate">{t('analysis.study.currentFocus')}: {analysisLabel(activeAnalysis)}</span>
							</span>
						</div>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.study.relatedOwnersListDescription')}</p>
					</div>
					<div class="flex flex-col gap-2 sm:items-end">
						<label class="text-sm font-medium" for="owner-analysis-order">{t('treatment.analytics.order')}</label>
						<div class="flex items-center gap-2">
							<Select
								id="owner-analysis-order"
								class="h-9 w-44"
								value={sortOrder}
								options={[
									{ value: 'name', label: t('owner.name') },
									{ value: 'location', label: t('analysis.study.city') },
									{ value: 'petCount', label: t('analysis.study.ownerPetCount') },
									{ value: 'vaccineStatus', label: t('analysis.owner.vaccineStatus') }
								]}
								onchange={(value) => (sortOrder = value as OwnerSortOrder)}
							/>
							<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(listedOwners.length)}</span>
						</div>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
					<span class="min-w-0 truncate text-muted-foreground">{t('analysis.study.chartCut')}: {selectedBucketLabel()}</span>
					<span class="shrink-0 font-semibold tabular-nums">{percentFormatter(selectedPercent)}</span>
					{#if selectedBucketKey}
						<button class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-accent" type="button" onclick={clearSelectedBucket}>{t('analysis.study.clearChartCut')}</button>
					{/if}
				</div>

				{#if listLoading && visibleOwners.length === 0}
					<div class="mt-4 space-y-3">
						{#each [0, 1, 2, 3, 4] as placeholderIndex (placeholderIndex)}
							<div class="h-24 animate-pulse rounded-md bg-muted"></div>
						{/each}
					</div>
				{:else if listedOwners.length === 0}
					<p class="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('analysis.study.emptyOwners')}</p>
				{:else}
					<div class="mt-4 divide-y divide-border rounded-md border border-border">
						{#each visibleOwners as owner (owner.id)}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
								<div class="flex min-w-0 items-start gap-3">
									<div class="flex shrink-0 -space-x-2 pt-0.5">
										{#each visibleOwnerPets(owner) as pet (pet.id)}
											<PetAvatar avatarBytes={petAvatarBytes(pet)} petName={pet.name} className="size-9 border-2 border-background" iconClass="size-4 text-primary" />
										{/each}
										{#if owner.pets.length === 0}
											<span class="inline-flex size-9 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground"><UserPlus class="size-4" /></span>
										{:else if owner.pets.length > 3}
											<span class="inline-flex size-9 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-muted-foreground">+{metricFormatter(owner.pets.length - 3)}</span>
										{/if}
									</div>
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{owner.name}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{ownerLocationText(owner)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{metricFormatter(owner.petCount)} {t('analysis.study.ownerPets')}: {ownerPetNamesText(owner)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{vaccineStatusLabel(ownerVaccineStatus(owner))} - {ownerPetSpeciesText(owner)} - {ownerPetAgeText(owner)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{ownerPetVaccinesText(owner)}</p>
									</div>
								</div>
								<a href={ownerProfileHref(owner)} class="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent sm:w-auto">
									{t('actions.openOwner')}
								</a>
							</article>
						{/each}
						{#if listLoading}
							<p class="p-4 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
						{/if}
					</div>
				{/if}
			</section>
		</div>
	</section>
{/if}
