<script lang="ts">
	import { tick } from 'svelte';
	import Select from '@vet/ui/components/ui/Select.svelte';
	import PetAvatar from '@vet/modules/registry/components/pet/PetAvatar.svelte';
	import { dashboardAgeBandSortValue, dashboardAgeBandYear } from '@vet/types/domain/dashboard/age-bands.js';
	import { dashboardPetAnalysisKinds, dashboardTreatmentStatusWeight, type DashboardBucket, type DashboardBucketSortField, type DashboardPetAnalysisKind, type DashboardPetStudyItem, type DashboardSortDirection, type DashboardVaccineStatusKey } from '@vet/types/domain/dashboard/analytics.js';
	import { getPetBreedOption, getPetSpeciesOption, isPetBreed, isPetSpecies } from '@vet/types/domain/pet/taxonomy.js';
	import { loadPetAvatarsByPetIds } from '@vet/modules/registry/services/avatar.service.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import List from '@lucide/svelte/icons/list';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Syringe from '@lucide/svelte/icons/syringe';

	type PetSortOrder = 'name' | 'age' | 'vaccineStatus' | 'owner';

	const dashboard = $derived(clinic.dashboard);
	const allPets = $derived(dashboard?.analytics.study.pets ?? []);
	const analysisKinds = dashboardPetAnalysisKinds;

	let activeAnalysis = $state<DashboardPetAnalysisKind>('vaccineStatus');
	let selectedBucketKey = $state('');
	let bucketSortField = $state<DashboardBucketSortField>('count');
	let bucketSortDirection = $state<DashboardSortDirection>('asc');
	let sortOrder = $state<PetSortOrder>('name');
	let visiblePets = $state<DashboardPetStudyItem[]>([]);
	let listLoading = $state(false);
	let avatarBytesByPetId = $state(new Map<string, Uint8Array | null>());
	let renderRequestId = 0;

	const activeBuckets = $derived(sortBuckets(bucketsForAnalysis(activeAnalysis), activeAnalysis, bucketSortField, bucketSortDirection));
	const selectedBucket = $derived(activeBuckets.find((bucket) => bucket.key === selectedBucketKey) ?? null);
	const listedPets = $derived(sortPets(filterPetsByBucket(allPets, activeAnalysis, selectedBucketKey), sortOrder));
	const selectedPercent = $derived(allPets.length > 0 ? Math.round((listedPets.length / allPets.length) * 1000) / 10 : 0);

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function percentFormatter(value: number): string {
		return `${metricFormatter(value)}%`;
	}

	function analysisLabelKey(kind: DashboardPetAnalysisKind): TranslationKey {
		if (kind === 'species') return 'analysis.pet.species';
		if (kind === 'breed') return 'analysis.pet.breed';
		if (kind === 'sex') return 'analysis.pet.sex';
		if (kind === 'age') return 'analysis.pet.age';
		return 'analysis.pet.vaccineStatus';
	}

	function analysisLabel(kind: DashboardPetAnalysisKind): string {
		return t(analysisLabelKey(kind));
	}

	function bucketsForAnalysis(kind: DashboardPetAnalysisKind): DashboardBucket[] {
		if (!dashboard) return [];
		if (kind === 'species') return dashboard.analytics.pets.bySpecies;
		if (kind === 'breed') return dashboard.analytics.pets.byBreed;
		if (kind === 'sex') return dashboard.analytics.pets.bySex;
		if (kind === 'age') return dashboard.analytics.pets.byAge;
		return dashboard.analytics.pets.byVaccineStatus;
	}

	function bucketTotal(kind: DashboardPetAnalysisKind): number {
		return bucketsForAnalysis(kind).reduce((total, bucket) => total + bucket.count, 0);
	}

	function bucketPercent(bucket: DashboardBucket, buckets = activeBuckets): number {
		const total = buckets.reduce((sum, item) => sum + item.count, 0);
		if (total <= 0 || bucket.count <= 0) return 0;
		return Math.round((bucket.count / total) * 1000) / 10;
	}

	function bucketWidth(bucket: DashboardBucket, buckets = activeBuckets): number {
		const max = buckets.reduce((currentMax, item) => Math.max(currentMax, item.count), 0);
		return max > 0 ? Math.max(4, Math.round((bucket.count / max) * 100)) : 0;
	}

	function topBucket(kind: DashboardPetAnalysisKind): DashboardBucket | null {
		return bucketsForAnalysis(kind)[0] ?? null;
	}

	function topBucketText(kind: DashboardPetAnalysisKind): string {
		const bucket = topBucket(kind);
		if (!bucket) return t('analysis.empty');
		return `${bucketLabel(kind, bucket.key)} - ${metricFormatter(bucket.count)}`;
	}

	function speciesLabel(key: string): string {
		if (key === 'unknown') return t('common.notInformed');
		const option = isPetSpecies(key) ? getPetSpeciesOption(key) : null;
		return option ? t(option.labelKey) : key;
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

	function ageBandLabel(key: string): string {
		if (key === 'months0To3') return `0-3 ${t('pet.ageMonthPlural')}`;
		if (key === 'months3To6') return `3-6 ${t('pet.ageMonthPlural')}`;
		if (key === 'months6To12') return `6-12 ${t('pet.ageMonthPlural')}`;
		if (key === 'unknown') return t('analysis.age.unknown');

		const year = dashboardAgeBandYear(key);
		if (year !== null) return `${metricFormatter(year)} ${t(year === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural')}`;

		return t('common.notInformed');
	}

	function vaccineStatusLabel(key: DashboardVaccineStatusKey): string {
		if (key === 'untracked') return t('analysis.vaccineStatus.untracked');
		return t(`treatment.status.${key}` as TranslationKey);
	}

	function bucketLabel(kind: DashboardPetAnalysisKind, key: string): string {
		if (kind === 'species') return speciesLabel(key);
		if (kind === 'breed') return breedLabel(key);
		if (kind === 'sex') return sexLabel(key);
		if (kind === 'age') return ageBandLabel(key);
		return vaccineStatusLabel(key as DashboardVaccineStatusKey);
	}

	function bucketSortDimensionLabel(kind: DashboardPetAnalysisKind): string {
		if (kind === 'species') return t('analysis.study.species');
		if (kind === 'breed') return t('analysis.study.breed');
		if (kind === 'sex') return t('analysis.study.sex');
		if (kind === 'age') return t('analysis.study.age');
		return t('analysis.study.vaccineStatus');
	}

	function bucketSortOptions(): { value: DashboardBucketSortField; label: string }[] {
		return [
			{ value: 'analysis', label: bucketSortDimensionLabel(activeAnalysis) },
			{ value: 'count', label: t('analysis.sortBy.count') }
		];
	}

	function bucketUnknownCompare(first: DashboardBucket, second: DashboardBucket): number {
		if (first.key === 'unknown' && second.key !== 'unknown') return 1;
		if (first.key !== 'unknown' && second.key === 'unknown') return -1;
		return 0;
	}

	function bucketAnalysisBaseCompare(kind: DashboardPetAnalysisKind, first: DashboardBucket, second: DashboardBucket): number {
		if (kind === 'age') return dashboardAgeBandSortValue(first.key) - dashboardAgeBandSortValue(second.key);
		if (kind === 'vaccineStatus') return dashboardTreatmentStatusWeight[first.key as DashboardVaccineStatusKey] - dashboardTreatmentStatusWeight[second.key as DashboardVaccineStatusKey];
		return bucketLabel(kind, first.key).localeCompare(bucketLabel(kind, second.key), i18n.locale);
	}

	function bucketAnalysisCompare(kind: DashboardPetAnalysisKind, first: DashboardBucket, second: DashboardBucket, direction: DashboardSortDirection): number {
		const unknownCompare = bucketUnknownCompare(first, second);
		if (unknownCompare !== 0) return unknownCompare;

		const analysisCompare = bucketAnalysisBaseCompare(kind, first, second);
		return direction === 'asc' ? analysisCompare : -analysisCompare;
	}

	function sortBuckets(buckets: DashboardBucket[], kind: DashboardPetAnalysisKind, field: DashboardBucketSortField, direction: DashboardSortDirection): DashboardBucket[] {
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

	function selectAnalysis(kind: DashboardPetAnalysisKind): void {
		activeAnalysis = kind;
		selectedBucketKey = '';
	}

	function clearSelectedBucket(): void {
		selectedBucketKey = '';
	}

	function petMatchesBucket(pet: DashboardPetStudyItem, kind: DashboardPetAnalysisKind, key: string): boolean {
		if (!key) return true;
		if (kind === 'species') return pet.species === key;
		if (kind === 'breed') return pet.breed === key;
		if (kind === 'sex') return pet.sex === key;
		if (kind === 'age') return pet.age === key;
		return pet.vaccineStatus === key;
	}

	function filterPetsByBucket(pets: DashboardPetStudyItem[], kind: DashboardPetAnalysisKind, key: string): DashboardPetStudyItem[] {
		return pets.filter((pet) => petMatchesBucket(pet, kind, key));
	}

	function sortPets(pets: DashboardPetStudyItem[], order: PetSortOrder): DashboardPetStudyItem[] {
		return [...pets].sort((first, second) => {
			if (order === 'age') {
				const ageCompare = dashboardAgeBandSortValue(first.age) - dashboardAgeBandSortValue(second.age);
				if (ageCompare !== 0) return ageCompare;
			}

			if (order === 'vaccineStatus') {
				const statusCompare = dashboardTreatmentStatusWeight[second.vaccineStatus] - dashboardTreatmentStatusWeight[first.vaccineStatus];
				if (statusCompare !== 0) return statusCompare;
			}

			if (order === 'owner') {
				const ownerCompare = ownerText(first).localeCompare(ownerText(second));
				if (ownerCompare !== 0) return ownerCompare;
			}

			return first.name.localeCompare(second.name);
		});
	}

	function selectedBucketLabel(): string {
		if (!selectedBucketKey) return t('analysis.study.all');
		return selectedBucket ? bucketLabel(activeAnalysis, selectedBucket.key) : t('common.notInformed');
	}

	function ownerText(pet: DashboardPetStudyItem): string {
		return pet.owners.map((owner) => owner.name).join(' - ') || t('owner.unassigned');
	}

	function cityText(pet: DashboardPetStudyItem): string {
		return pet.ownerCityLabels.join(' - ') || t('common.notInformed');
	}

	function vaccineText(pet: DashboardPetStudyItem): string {
		return pet.vaccineNames.join(' - ') || t('analysis.vaccineStatus.untracked');
	}

	function petProfileHref(pet: DashboardPetStudyItem): string {
		return `/pets/${pet.id}`;
	}

	function petAvatarBytes(pet: DashboardPetStudyItem): Uint8Array | null {
		return avatarBytesByPetId.get(pet.id) ?? pet.avatarBytes;
	}

	async function waitForNextPaint(): Promise<void> {
		await tick();
		if (typeof requestAnimationFrame === 'undefined') return;
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}

	async function renderPetsInChunks(source: DashboardPetStudyItem[]): Promise<void> {
		const requestId = ++renderRequestId;
		visiblePets = [];
		listLoading = source.length > 0;
		await waitForNextPaint();

		const chunkSize = 80;
		for (let index = 0; index < source.length; index += chunkSize) {
			if (requestId !== renderRequestId) return;
			visiblePets = source.slice(0, Math.min(source.length, index + chunkSize));
			await waitForNextPaint();
		}

		if (requestId === renderRequestId) listLoading = false;
	}

	async function loadVisiblePetAvatars(pets: DashboardPetStudyItem[]): Promise<void> {
		const missingIds = [...new Set(pets.map((pet) => pet.id))].filter((id) => !avatarBytesByPetId.has(id));
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
		void renderPetsInChunks(listedPets);
	});

	$effect(() => {
		void loadVisiblePetAvatars(visiblePets);
	});

	$effect(() => {
		if (selectedBucketKey && !activeBuckets.some((bucket) => bucket.key === selectedBucketKey)) selectedBucketKey = '';
	});
</script>

{#if dashboard}
	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
			<PawPrint class="size-4" />
			{t('analysis.pets.title')}
		</div>

		<div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5" role="tablist" aria-label={t('analysis.pets.title')}>
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
								{#if kind === 'vaccineStatus'}<Syringe class="size-4 shrink-0" />{:else}<ChartColumn class="size-4 shrink-0" />{/if}
								<span class="truncate">{analysisLabel(kind)}</span>
							</span>
							<span class="mt-2 block min-h-10 text-xs leading-5 text-muted-foreground">{topBucketText(kind)}</span>
						</span>
						<span class="shrink-0 text-right">
							<span class="block text-2xl font-semibold text-foreground">{metricFormatter(bucketTotal(kind))}</span>
							<span class="mt-1 block text-xs text-muted-foreground">{top ? percentFormatter(bucketPercent(top, bucketsForAnalysis(kind))) : '0%'}</span>
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
						<label class="text-sm font-medium" for="pet-bucket-sort-field">{t('analysis.sortBy')}</label>
						<Select id="pet-bucket-sort-field" class="mt-1 h-9 w-full" value={bucketSortField} options={bucketSortOptions()} onchange={(value) => (bucketSortField = value as DashboardBucketSortField)} />
					</div>
					<div>
						<label class="text-sm font-medium" for="pet-bucket-sort-direction">{t('analysis.sortDirection')}</label>
						<Select
							id="pet-bucket-sort-direction"
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
						<span class="shrink-0 font-semibold tabular-nums">{metricFormatter(allPets.length)}</span>
					</button>

					{#each activeBuckets as bucket}
						<button
							class="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent {selectedBucketKey === bucket.key ? 'border-primary bg-primary/10 ring-2 ring-ring/20' : 'border-border bg-background'}"
							type="button"
							onclick={() => (selectedBucketKey = bucket.key)}
						>
							<span class="flex items-center justify-between gap-3">
								<span class="truncate font-medium" title={bucketLabel(activeAnalysis, bucket.key)}>{bucketLabel(activeAnalysis, bucket.key)}</span>
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
					<div class="flex min-w-0 flex-wrap items-center gap-2">
						<h3 class="flex items-center gap-2 text-sm font-semibold"><List class="size-4" />{t('analysis.study.relatedPets')}</h3>
						<span class="inline-flex max-w-full items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
							<span class="truncate">{analysisLabel(activeAnalysis)}</span>
						</span>
					</div>
					<div class="flex flex-col gap-2 sm:items-end">
						<label class="text-sm font-medium" for="pet-analysis-order">{t('treatment.analytics.order')}</label>
						<div class="flex items-center gap-2">
							<Select
								id="pet-analysis-order"
								class="h-9 w-44"
								value={sortOrder}
								options={[
									{ value: 'name', label: t('pet.name') },
									{ value: 'age', label: t('pet.ageLabel') },
									{ value: 'vaccineStatus', label: t('analysis.pet.vaccineStatus') },
									{ value: 'owner', label: t('owner.name') }
								]}
								onchange={(value) => (sortOrder = value as PetSortOrder)}
							/>
							<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(listedPets.length)}</span>
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

				{#if listLoading && visiblePets.length === 0}
					<div class="mt-4 space-y-3">
						{#each [0, 1, 2, 3, 4] as placeholderIndex (placeholderIndex)}
							<div class="h-24 animate-pulse rounded-md bg-muted"></div>
						{/each}
					</div>
				{:else if listedPets.length === 0}
					<p class="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('analysis.study.emptyPets')}</p>
				{:else}
					<div class="mt-4 divide-y divide-border rounded-md border border-border">
						{#each visiblePets as pet (pet.id)}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
								<div class="flex min-w-0 items-start gap-3">
									<PetAvatar avatarBytes={petAvatarBytes(pet)} petName={pet.name} className="size-11" iconClass="size-5 text-primary" />
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{pet.name}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{speciesLabel(pet.species)} - {breedLabel(pet.breed)} - {sexLabel(pet.sex)} - {ageBandLabel(pet.age)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{ownerText(pet)} - {cityText(pet)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{vaccineStatusLabel(pet.vaccineStatus)} - {vaccineText(pet)}</p>
									</div>
								</div>
								<a href={petProfileHref(pet)} class="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent sm:w-auto">
									{t('actions.openPet')}
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
