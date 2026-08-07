<script lang="ts">
	import Select from '@vet/ui/components/ui/Select.svelte';
	import {
		type ClinicAnalyticsAntiparasiticStatusKey,
		type AnalyticsNamedBucket,
		type ClinicAnalyticsOwnerStudyItem,
		type ClinicAnalyticsPetStudyItem,
		type ClinicAnalyticsStudyTarget,
		type ClinicAnalyticsVaccineStatusKey
	} from '@vet/types/clinic-analytics.js';
	import { clinicAnalyticsAgeBandYear } from '@vet/types/clinic-analytics.js';
	import {
		buildClinicAnalyticsStudyViewModel,
		defaultClinicAnalyticsPrimaryDimension,
		defaultClinicAnalyticsSecondaryDimension,
		type ClinicAnalyticsStudyBucket,
		type ClinicAnalyticsStudyBucketSelection,
		type ClinicAnalyticsStudyDimension,
		type ClinicAnalyticsStudyFilterFactor,
		type ClinicAnalyticsStudyFilters,
		type ClinicAnalyticsStudyTreatmentSummary
	} from '@vet/app-services/analytics';
	import { formatDateForDisplay } from '@vet/types/domain/shared/date-input.js';
	import { getPetBreedOption, getPetSpeciesOption, isPetBreed, isPetSpecies } from '@vet/types/domain/pet/taxonomy.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Pill from '@lucide/svelte/icons/pill';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Syringe from '@lucide/svelte/icons/syringe';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import List from '@lucide/svelte/icons/list';
	import X from '@lucide/svelte/icons/x';

	type StudyTarget = ClinicAnalyticsStudyTarget;
	type StudyVaccineSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>;
	type StudyAntiparasiticSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>;
	type StudyDimension = ClinicAnalyticsStudyDimension;
	type StudyVisualizationMode = 'bars' | 'table';
	type StudyPanel = 'chart' | 'list';
	type StudyCrossBucket = ClinicAnalyticsStudyBucket;
	type StudyCrossSelection = ClinicAnalyticsStudyBucketSelection;
	type StudyDimensionOption = { dimension: StudyDimension; labelKey: TranslationKey };
	type StudyFactor = { label: string; value: string; count: number };

	const studyTargetOptions = [
		{ target: 'vaccines', labelKey: 'analysis.study.axis.vaccines', descriptionKey: 'analysis.study.axis.vaccinesDescription', icon: Syringe },
		{ target: 'antiparasitics', labelKey: 'analysis.view.antiparasitics', descriptionKey: 'analysis.study.axis.antiparasiticsDescription', icon: Pill },
		{ target: 'pets', labelKey: 'analysis.study.axis.pets', descriptionKey: 'analysis.study.axis.petsDescription', icon: PawPrint },
		{ target: 'owners', labelKey: 'analysis.study.axis.owners', descriptionKey: 'analysis.study.axis.ownersDescription', icon: UserPlus }
	] as const;
	const studyDimensionLabelOptions = [
		{ dimension: 'vaccineStatus', labelKey: 'analysis.study.dimension.vaccineStatus' },
		{ dimension: 'vaccine', labelKey: 'analysis.study.dimension.vaccine' },
		{ dimension: 'antiparasitic', labelKey: 'antiparasiticTreatment.name' },
		{ dimension: 'antiparasiticStatus', labelKey: 'treatment.analytics.filterMode.status' },
		{ dimension: 'petAntiparasiticStatus', labelKey: 'analysis.study.dimension.petAntiparasiticStatus' },
		{ dimension: 'petSpecies', labelKey: 'analysis.study.dimension.petSpecies' },
		{ dimension: 'petBreed', labelKey: 'analysis.study.dimension.petBreed' },
		{ dimension: 'petAge', labelKey: 'analysis.study.dimension.petAge' },
		{ dimension: 'petVaccineStatus', labelKey: 'analysis.study.dimension.petVaccineStatus' },
		{ dimension: 'petSex', labelKey: 'analysis.study.dimension.petSex' },
		{ dimension: 'ownerCity', labelKey: 'analysis.study.dimension.ownerCity' },
		{ dimension: 'ownerLocation', labelKey: 'analysis.study.dimension.ownerCity' },
		{ dimension: 'ownerPetCount', labelKey: 'analysis.study.dimension.ownerPetCount' },
		{ dimension: 'ownerPetVaccineStatus', labelKey: 'analysis.study.dimension.ownerPetVaccineStatus' },
		{ dimension: 'ownerPetAntiparasiticStatus', labelKey: 'analysis.study.dimension.ownerPetAntiparasiticStatus' },
		{ dimension: 'ownerPetSpecies', labelKey: 'analysis.study.dimension.ownerPetSpecies' }
	] as const satisfies readonly StudyDimensionOption[];

	let studyTarget = $state<StudyTarget>('pets');
	let studyPrimaryDimension = $state<StudyDimension>('petBreed');
	let studySecondaryDimension = $state<StudyDimension>('petVaccineStatus');
	let studyVisualizationMode = $state<StudyVisualizationMode>('bars');
	let studyPanel = $state<StudyPanel>('chart');
	let studySpecies = $state('');
	let studyBreed = $state('');
	let studySex = $state('');
	let studyAge = $state('');
	let studyVaccineStatus = $state('');
	let studyVaccineNormalizedName = $state('');
	let studyAntiparasiticStatus = $state('');
	let studyAntiparasiticNormalizedName = $state('');
	let studyCity = $state('');
	let studyOwnerPetCount = $state('');
	let selectedStudyBucket = $state<StudyCrossSelection | null>(null);

	const allStudyPets = $derived(clinic.dashboard?.analytics.study.pets ?? []);
	const allStudyOwners = $derived(clinic.dashboard?.analytics.study.owners ?? []);
	const studyFilters = $derived({
		species: studySpecies,
		breed: studyBreed,
		sex: studySex,
		age: studyAge,
		vaccineStatus: studyVaccineStatus,
		vaccineNormalizedName: studyVaccineNormalizedName,
		antiparasiticStatus: studyAntiparasiticStatus,
		antiparasiticNormalizedName: studyAntiparasiticNormalizedName,
		city: studyCity,
		ownerPetCount: studyOwnerPetCount
	} satisfies ClinicAnalyticsStudyFilters);
	const studyAnalyticsView = $derived(
		buildClinicAnalyticsStudyViewModel({
			target: studyTarget,
			pets: allStudyPets,
			owners: allStudyOwners,
			primaryDimension: studyPrimaryDimension,
			secondaryDimension: studySecondaryDimension,
			selectedBucket: selectedStudyBucket,
			filters: studyFilters,
			bucketLimit: 16,
			listLimit: 40
		})
	);
	const limitedStudyBuckets = $derived(studyAnalyticsView.limitedBuckets);
	const selectedStudyFactors = $derived(studyAnalyticsView.activeFactors.map((factor) => renderStudyFactor(factor)));
	const listedStudyVaccines = $derived(studyAnalyticsView.listedVaccines);
	const listedStudyAntiparasitics = $derived(studyAnalyticsView.listedAntiparasitics);
	const listedStudyOwners = $derived(studyAnalyticsView.listedOwners);
	const listedStudyPets = $derived(studyAnalyticsView.listedPets);
	const limitedListedStudyVaccines = $derived(studyAnalyticsView.limitedListedVaccines);
	const limitedListedStudyAntiparasitics = $derived(studyAnalyticsView.limitedListedAntiparasitics);
	const limitedListedStudyOwners = $derived(studyAnalyticsView.limitedListedOwners);
	const limitedListedStudyPets = $derived(studyAnalyticsView.limitedListedPets);
	const studyDimensionSelectOptions = $derived(studyAnalyticsView.availableDimensions.map((dimension) => ({ value: dimension, label: studyDimensionLabel(dimension) })));
	const studySpeciesSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.species.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(speciesLabel(bucket.key), bucket.count) }))]);
	const studyBreedSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.breeds.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(breedLabel(bucket.key), bucket.count) }))]);
	const studySexSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.sexes.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(sexLabel(bucket.key), bucket.count) }))]);
	const studyAgeSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.ages.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(ageBandLabel(bucket.key), bucket.count) }))]);
	const studyVaccineSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.vaccines.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(renderBucketLabel(bucket), bucket.count) }))]);
	const studyAntiparasiticSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.antiparasitics.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(renderBucketLabel(bucket), bucket.count) }))]);
	const studyVaccineStatusSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.vaccineStatuses.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))]);
	const studyAntiparasiticStatusSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.antiparasiticStatuses.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(antiparasiticStatusLabel(bucket.key), bucket.count) }))]);
	const studyCitySelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.cities.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(renderBucketLabel(bucket), bucket.count) }))]);
	const studyOwnerPetCountSelectOptions = $derived([{ value: '', label: studyAllOptionLabel() }, ...studyAnalyticsView.filterOptions.ownerPetCounts.map((bucket) => ({ value: bucket.key, label: studyOptionLabel(t(petCountLabelKey(bucket.key)), bucket.count) }))]);

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function studyOptionLabel(label: string, count: number): string {
		return `${label} (${metricFormatter(count)})`;
	}

	function studyAllOptionLabel(): string {
		return t('analysis.study.all');
	}

	function selectStudyTarget(target: StudyTarget): void {
		studyTarget = target;
		studyPrimaryDimension = defaultClinicAnalyticsPrimaryDimension(target);
		studySecondaryDimension = defaultClinicAnalyticsSecondaryDimension(target);
		selectedStudyBucket = null;
	}

	function studyTargetLabel(): string {
		return t(studyTargetOptions.find((option) => option.target === studyTarget)?.labelKey ?? 'analysis.study.axis.pets');
	}

	function studyTargetDescription(): string {
		return t(studyTargetOptions.find((option) => option.target === studyTarget)?.descriptionKey ?? 'analysis.study.axis.petsDescription');
	}

	function studyDimensionLabel(dimension: StudyDimension): string {
		const option = studyDimensionLabelOptions.find((item) => item.dimension === dimension);
		return t(option?.labelKey ?? 'common.notInformed');
	}

	function clearStudyFilters(): void {
		studySpecies = '';
		studyBreed = '';
		studySex = '';
		studyAge = '';
		studyVaccineStatus = '';
		studyVaccineNormalizedName = '';
		studyAntiparasiticStatus = '';
		studyAntiparasiticNormalizedName = '';
		studyCity = '';
		studyOwnerPetCount = '';
	}

	function renderStudyFactor(factor: { factor: ClinicAnalyticsStudyFilterFactor; valueKey: string; count: number }): StudyFactor {
		if (factor.factor === 'vaccine') return { label: t('analysis.study.vaccine'), value: selectedNamedBucketLabel(studyAnalyticsView.filterOptions.vaccines, factor.valueKey), count: factor.count };
		if (factor.factor === 'vaccineStatus') return { label: t('analysis.study.vaccineStatus'), value: vaccineStatusLabel(factor.valueKey as ClinicAnalyticsVaccineStatusKey), count: factor.count };
		if (factor.factor === 'antiparasitic') return { label: t('antiparasiticTreatment.name'), value: selectedNamedBucketLabel(studyAnalyticsView.filterOptions.antiparasitics, factor.valueKey), count: factor.count };
		if (factor.factor === 'antiparasiticStatus') return { label: t('treatment.analytics.filterMode.status'), value: antiparasiticStatusLabel(factor.valueKey as ClinicAnalyticsAntiparasiticStatusKey), count: factor.count };
		if (factor.factor === 'species') return { label: t('analysis.study.species'), value: speciesLabel(factor.valueKey), count: factor.count };
		if (factor.factor === 'breed') return { label: t('analysis.study.breed'), value: breedLabel(factor.valueKey), count: factor.count };
		if (factor.factor === 'sex') return { label: t('analysis.study.sex'), value: sexLabel(factor.valueKey), count: factor.count };
		if (factor.factor === 'age') return { label: t('analysis.study.age'), value: ageBandLabel(factor.valueKey), count: factor.count };
		if (factor.factor === 'city') return { label: t('analysis.study.city'), value: selectedNamedBucketLabel(studyAnalyticsView.filterOptions.cities, factor.valueKey), count: factor.count };
		return { label: t('analysis.study.ownerPetCount'), value: t(petCountLabelKey(factor.valueKey)), count: factor.count };
	}

	function selectedNamedBucketLabel(buckets: AnalyticsNamedBucket[], key: string): string {
		const bucket = buckets.find((item) => item.key === key);
		return bucket ? renderBucketLabel(bucket) : t('common.notInformed');
	}

	function studyBucketPrimaryLabel(bucket: StudyCrossBucket): string {
		return studyDimensionKeyLabel(studyAnalyticsView.primaryDimension, bucket.primaryKey);
	}

	function studyBucketSecondaryLabel(bucket: StudyCrossBucket): string {
		return studyDimensionKeyLabel(studyAnalyticsView.secondaryDimension, bucket.secondaryKey);
	}

	function studyDimensionKeyLabel(dimension: StudyDimension, key: string): string {
		if (dimension === 'vaccine') return treatmentBucketLabel(clinic.dashboard?.analytics.study.vaccines ?? [], key, 'analysis.vaccineStatus.untracked');
		if (dimension === 'vaccineStatus' || dimension === 'petVaccineStatus' || dimension === 'ownerPetVaccineStatus') return vaccineStatusLabel(key as ClinicAnalyticsVaccineStatusKey);
		if (dimension === 'antiparasitic') return treatmentBucketLabel(clinic.dashboard?.analytics.study.antiparasitics ?? [], key, 'analysis.antiparasiticStatus.untracked');
		if (dimension === 'antiparasiticStatus' || dimension === 'petAntiparasiticStatus' || dimension === 'ownerPetAntiparasiticStatus') return antiparasiticStatusLabel(key as ClinicAnalyticsAntiparasiticStatusKey);
		if (dimension === 'petSpecies' || dimension === 'ownerPetSpecies') return speciesLabel(key);
		if (dimension === 'petBreed') return breedLabel(key);
		if (dimension === 'petSex') return sexLabel(key);
		if (dimension === 'petAge') return ageBandLabel(key);
		if (dimension === 'ownerCity') return cityKeyLabel(key);
		if (dimension === 'ownerPetCount') return key === 'unknown' ? t('common.notInformed') : t(petCountLabelKey(key));
		return key || t('common.notInformed');
	}

	function treatmentBucketLabel(buckets: AnalyticsNamedBucket[], key: string, untrackedLabelKey: TranslationKey): string {
		if (key === 'untracked') return t(untrackedLabelKey);
		const bucket = buckets.find((item) => item.key === key);
		return bucket ? renderBucketLabel(bucket) : key || t('common.notInformed');
	}

	function cityKeyLabel(key: string): string {
		if (key === 'unknown') return t('common.notInformed');
		const bucket = clinic.dashboard?.analytics.study.ownerCities.find((item) => item.key === key);
		return bucket ? renderBucketLabel(bucket) : key || t('common.notInformed');
	}

	function selectStudyBucket(bucket: StudyCrossBucket): void {
		selectedStudyBucket = { ...bucket, primaryDimension: studyPrimaryDimension, secondaryDimension: studySecondaryDimension };
		studyPanel = 'list';
	}

	function clearSelectedStudyBucket(): void {
		selectedStudyBucket = null;
	}

	function selectedStudyBucketLabel(): string {
		const bucket = studyAnalyticsView.selectedBucket;
		return bucket ? `${studyDimensionKeyLabel(bucket.primaryDimension, bucket.primaryKey)} - ${studyDimensionKeyLabel(bucket.secondaryDimension, bucket.secondaryKey)}` : '';
	}

	function studyVisualizationTitle(): string {
		return `${studyDimensionLabel(studyAnalyticsView.primaryDimension)} ${t('common.and')} ${studyDimensionLabel(studyAnalyticsView.secondaryDimension)}`;
	}

	function bucketWidth(count: number, max: number): number {
		return max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
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

		const year = clinicAnalyticsAgeBandYear(key);
		if (year !== null) return `${metricFormatter(year)} ${t(year === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural')}`;

		return t('common.notInformed');
	}

	function petCountLabelKey(key: string): TranslationKey {
		return `analysis.petCount.${key}` as TranslationKey;
	}

	function vaccineStatusLabel(key: ClinicAnalyticsVaccineStatusKey): string {
		if (key === 'untracked') return t('analysis.vaccineStatus.untracked');
		return t(`treatment.status.${key}` as TranslationKey);
	}

	function antiparasiticStatusLabel(key: ClinicAnalyticsAntiparasiticStatusKey): string {
		if (key === 'untracked') return t('analysis.antiparasiticStatus.untracked');
		return t(`treatment.status.${key}` as TranslationKey);
	}

	function vaccineDoseLabel(vaccine: StudyVaccineSummary): string {
		return vaccine.dose;
	}

	function antiparasiticDoseLabel(antiparasitic: StudyAntiparasiticSummary): string {
		return antiparasitic.dose;
	}

	function renderBucketLabel(bucket: AnalyticsNamedBucket): string {
		return bucket.label?.trim() || t('common.notInformed');
	}

	function studyOwnerText(pet: ClinicAnalyticsPetStudyItem): string {
		return pet.owners.map((owner) => owner.name).join(' - ') || t('owner.unassigned');
	}

	function studyPetCityText(pet: ClinicAnalyticsPetStudyItem): string {
		return pet.ownerCityLabels.join(' - ') || t('common.notInformed');
	}

	function studyPetVaccineText(pet: ClinicAnalyticsPetStudyItem): string {
		return pet.vaccineNames.join(' - ') || t('analysis.vaccineStatus.untracked');
	}

	function studyPetAntiparasiticText(pet: ClinicAnalyticsPetStudyItem): string {
		return pet.antiparasiticNames.join(' - ') || t('analysis.antiparasiticStatus.untracked');
	}

	function studyPetProfileHref(pet: ClinicAnalyticsPetStudyItem): string {
		return `/pets/${pet.id}`;
	}

	function ownerProfileHref(owner: ClinicAnalyticsOwnerStudyItem): string {
		return `/owners/${owner.id}`;
	}

	function studyOwnerPetNamesText(owner: ClinicAnalyticsOwnerStudyItem): string {
		return owner.petNames.slice(0, 4).join(' - ') || t('common.notInformed');
	}

	$effect(() => {
		if (studyPrimaryDimension !== studyAnalyticsView.primaryDimension) studyPrimaryDimension = studyAnalyticsView.primaryDimension;
		if (studySecondaryDimension !== studyAnalyticsView.secondaryDimension) studySecondaryDimension = studyAnalyticsView.secondaryDimension;
		if (studyBreed && !studyBreedSelectOptions.some((option) => option.value === studyBreed)) studyBreed = '';
		if (studyOwnerPetCount && !studyOwnerPetCountSelectOptions.some((option) => option.value === studyOwnerPetCount)) studyOwnerPetCount = '';
		if (studyVaccineStatus && !studyVaccineStatusSelectOptions.some((option) => option.value === studyVaccineStatus)) studyVaccineStatus = '';
		if (studyAntiparasiticStatus && !studyAntiparasiticStatusSelectOptions.some((option) => option.value === studyAntiparasiticStatus)) studyAntiparasiticStatus = '';
	});

	$effect(() => {
		if (!selectedStudyBucket) return;
		if (!studyAnalyticsView.selectedBucket) selectedStudyBucket = null;
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
		<ChartColumn class="size-4" />
		{t('analysis.general.title')}
	</div>
	<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.general.description')}</p>

	<div class="mt-5 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
		<aside class="rounded-md border border-border bg-background p-4">
			<div class="space-y-5">
				<section>
					<div class="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
						<ChartColumn class="size-4" />
						<span>{t('analysis.study.axis')}</span>
					</div>
					<p class="mt-1 text-xs leading-5 text-muted-foreground">{t('analysis.study.axisSidebarDescription')}</p>
					<div class="mt-3 grid gap-2" role="tablist" aria-label={t('analysis.study.axis')}>
						{#each studyTargetOptions as option}
							<button class="flex h-11 items-center gap-3 rounded-md border px-3 text-left transition-colors hover:bg-accent {studyTarget === option.target ? 'border-primary bg-primary/10 ring-2 ring-ring/20' : 'border-border bg-background'}" type="button" role="tab" aria-selected={studyTarget === option.target} title={t(option.descriptionKey)} onclick={() => selectStudyTarget(option.target)}>
								<option.icon class="size-4 shrink-0" />
								<span class="min-w-0">
									<span class="block truncate text-sm font-semibold">{t(option.labelKey)}</span>
								</span>
							</button>
						{/each}
					</div>
				</section>

				<section class="border-t border-border pt-5">
					<div class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
							<SlidersHorizontal class="size-4" />
							<span>{t('analysis.study.yAxis')}</span>
						</div>
						<button class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" type="button" disabled={studyAnalyticsView.activeFactors.length === 0} onclick={clearStudyFilters} aria-label={t('analysis.study.clear')}>
							<X class="size-4" />
						</button>
					</div>

					<div class="mt-5 space-y-5">
						<div class="space-y-3">
							<p class="text-sm font-semibold">{t('analysis.study.vaccineCriteria')}</p>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-vaccine">{t('analysis.study.vaccine')}</label>
								<Select id="study-vaccine" bind:value={studyVaccineNormalizedName} options={studyVaccineSelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-vaccine-status">{t('analysis.study.vaccineStatus')}</label>
								<Select id="study-vaccine-status" bind:value={studyVaccineStatus} options={studyVaccineStatusSelectOptions} />
							</div>
						</div>

						<div class="space-y-3 border-t border-border pt-5">
							<p class="text-sm font-semibold">{t('analysis.view.antiparasitics')}</p>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-antiparasitic">{t('antiparasiticTreatment.name')}</label>
								<Select id="study-antiparasitic" bind:value={studyAntiparasiticNormalizedName} options={studyAntiparasiticSelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-antiparasitic-status">{t('treatment.analytics.filterMode.status')}</label>
								<Select id="study-antiparasitic-status" bind:value={studyAntiparasiticStatus} options={studyAntiparasiticStatusSelectOptions} />
							</div>
						</div>

						<div class="space-y-3 border-t border-border pt-5">
							<p class="text-sm font-semibold">{t('analysis.study.petCriteria')}</p>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-species">{t('analysis.study.species')}</label>
								<Select id="study-species" bind:value={studySpecies} options={studySpeciesSelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-breed">{t('analysis.study.breed')}</label>
								<Select id="study-breed" bind:value={studyBreed} options={studyBreedSelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-sex">{t('analysis.study.sex')}</label>
								<Select id="study-sex" bind:value={studySex} options={studySexSelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-age">{t('analysis.study.age')}</label>
								<Select id="study-age" bind:value={studyAge} options={studyAgeSelectOptions} />
							</div>
						</div>

						<div class="space-y-3 border-t border-border pt-5">
							<p class="text-sm font-semibold">{t('analysis.study.ownerCriteria')}</p>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-city">{t('analysis.study.city')}</label>
								<Select id="study-city" bind:value={studyCity} options={studyCitySelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-owner-pet-count">{t('analysis.study.ownerPetCount')}</label>
								<Select id="study-owner-pet-count" bind:value={studyOwnerPetCount} options={studyOwnerPetCountSelectOptions} />
							</div>
						</div>
					</div>
				</section>
			</div>
		</aside>

		<div class="min-w-0 space-y-4">
			<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('analysis.study.visualization')}>
				<button class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {studyPanel === 'chart' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={studyPanel === 'chart'} onclick={() => (studyPanel = 'chart')}>
					<ChartColumn class="size-4" />
					<span class="truncate">{t('analysis.study.tabChart')}</span>
				</button>
				<button class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {studyPanel === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={studyPanel === 'list'} onclick={() => (studyPanel = 'list')}>
					<List class="size-4" />
					<span class="truncate">{t('analysis.study.tabList')}</span>
				</button>
			</div>

			{#if studyPanel === 'chart'}
				<section class="rounded-md border border-border bg-background p-4" role="tabpanel">
					<div>
						<div class="min-w-0 max-w-3xl">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="text-sm font-semibold">{t('analysis.study.visualization')}</h3>
								<span class="inline-flex max-w-full items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
									<span class="truncate">{t('analysis.study.currentFocus')}: {studyTargetLabel()}</span>
								</span>
							</div>
							<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.study.visualizationDescription')}</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">{studyTargetDescription()}</p>
						</div>

						<div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto]">
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-primary-dimension">{t('analysis.study.visualizeByPrimary')}</label>
								<Select id="study-primary-dimension" bind:value={studyPrimaryDimension} options={studyDimensionSelectOptions} />
							</div>
							<div class="space-y-1">
								<label class="text-sm font-medium" for="study-secondary-dimension">{t('analysis.study.visualizeBySecondary')}</label>
								<Select id="study-secondary-dimension" bind:value={studySecondaryDimension} options={studyDimensionSelectOptions} />
							</div>
							<div class="space-y-1 sm:col-span-2 xl:col-span-1">
								<span class="text-sm font-medium">{t('analysis.study.visualFormat')}</span>
								<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('analysis.study.visualFormat')}>
									<button class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium {studyVisualizationMode === 'bars' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={studyVisualizationMode === 'bars'} onclick={() => (studyVisualizationMode = 'bars')}>{t('analysis.study.visualFormat.bars')}</button>
									<button class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium {studyVisualizationMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={studyVisualizationMode === 'table'} onclick={() => (studyVisualizationMode = 'table')}>{t('analysis.study.visualFormat.table')}</button>
								</div>
							</div>
						</div>
					</div>

					<div class="mt-4 rounded-md border border-border bg-muted/40 p-3">
						{#if selectedStudyFactors.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each selectedStudyFactors as factor}
									<span class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
										<span class="truncate text-muted-foreground">{factor.label}: {factor.value}</span>
										<span class="shrink-0 font-semibold tabular-nums">{metricFormatter(factor.count)}</span>
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-sm leading-6 text-muted-foreground">{t('analysis.study.noSelectedFactors')}</p>
						{/if}
					</div>

					<div class="mt-4">
						<div class="flex items-center justify-between gap-3 border-b border-border pb-2">
							<h4 class="truncate text-sm font-semibold">{studyVisualizationTitle()}</h4>
							<span class="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{metricFormatter(studyAnalyticsView.bucketTotal)}</span>
						</div>

						{#if studyVisualizationMode === 'bars'}
							<div class="divide-y divide-border/70">
								{#each limitedStudyBuckets as bucket}
									<div class="grid grid-cols-[minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1.6fr)_5rem_4.5rem_3.5rem] items-center gap-3 py-2 text-sm">
										<span class="truncate text-muted-foreground" title={studyBucketPrimaryLabel(bucket)}>{studyBucketPrimaryLabel(bucket)}</span>
										<span class="truncate text-muted-foreground" title={studyBucketSecondaryLabel(bucket)}>{studyBucketSecondaryLabel(bucket)}</span>
										<span class="h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, studyAnalyticsView.bucketMaxCount)}%`}></span></span>
										<span class="text-right font-medium tabular-nums">{metricFormatter(bucket.count)}</span>
										<span class="text-right text-xs font-medium tabular-nums text-muted-foreground">{metricFormatter(bucket.percent)}%</span>
										<button class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-accent" type="button" onclick={() => selectStudyBucket(bucket)}>{t('actions.view')}</button>
									</div>
								{:else}
									<p class="py-4 text-sm text-muted-foreground">{t('analysis.empty')}</p>
								{/each}
							</div>
						{:else}
							<div class="mt-3 overflow-hidden rounded-md border border-border">
								<table class="w-full table-fixed border-collapse text-sm">
									<thead class="bg-muted text-left text-xs font-medium text-muted-foreground">
										<tr>
											<th class="px-3 py-2 font-medium">{studyDimensionLabel(studyPrimaryDimension)}</th>
											<th class="px-3 py-2 font-medium">{studyDimensionLabel(studySecondaryDimension)}</th>
											<th class="w-28 px-3 py-2 text-right font-medium">{t('analysis.study.column.value')}</th>
											<th class="w-28 px-3 py-2 text-right font-medium">{t('analysis.study.column.percent')}</th>
											<th class="w-16 px-3 py-2 text-right font-medium"><span class="sr-only">{t('actions.view')}</span></th>
										</tr>
									</thead>
									<tbody class="divide-y divide-border">
										{#each limitedStudyBuckets as bucket}
											<tr>
												<td class="truncate px-3 py-2 text-muted-foreground" title={studyBucketPrimaryLabel(bucket)}>{studyBucketPrimaryLabel(bucket)}</td>
												<td class="truncate px-3 py-2 text-muted-foreground" title={studyBucketSecondaryLabel(bucket)}>{studyBucketSecondaryLabel(bucket)}</td>
												<td class="px-3 py-2 text-right font-medium tabular-nums">{metricFormatter(bucket.count)}</td>
												<td class="px-3 py-2 text-right font-medium tabular-nums text-muted-foreground">{metricFormatter(bucket.percent)}%</td>
												<td class="px-3 py-2 text-right"><button class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-accent" type="button" onclick={() => selectStudyBucket(bucket)}>{t('actions.view')}</button></td>
											</tr>
										{:else}
											<tr><td class="px-3 py-4 text-muted-foreground" colspan="5">{t('analysis.empty')}</td></tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				</section>
			{:else}
				<section class="rounded-md border border-border bg-background p-4" role="tabpanel">
					<div class="flex items-start justify-between gap-3">
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="text-sm font-semibold">{studyTarget === 'vaccines' ? t('analysis.study.relatedVaccines') : studyTarget === 'antiparasitics' ? t('analysis.study.relatedAntiparasitics') : studyTarget === 'owners' ? t('analysis.study.relatedOwners') : t('analysis.study.relatedPets')}</h3>
								<span class="inline-flex max-w-full items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
									<span class="truncate">{t('analysis.study.currentFocus')}: {studyTargetLabel()}</span>
								</span>
							</div>
							<p class="mt-1 text-sm text-muted-foreground">{studyTarget === 'vaccines' ? t('analysis.study.relatedVaccinesDescription') : studyTarget === 'antiparasitics' ? t('analysis.study.relatedAntiparasiticsDescription') : studyTarget === 'owners' ? t('analysis.study.relatedOwnersListDescription') : t('analysis.study.relatedPetsDescription')}</p>
						</div>
						<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTarget === 'vaccines' ? listedStudyVaccines.length : studyTarget === 'antiparasitics' ? listedStudyAntiparasitics.length : studyTarget === 'owners' ? listedStudyOwners.length : listedStudyPets.length)}</span>
					</div>
					{#if studyAnalyticsView.selectedBucket}
						<div class="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
							<span class="min-w-0 truncate text-muted-foreground">{t('analysis.study.chartCut')}: {selectedStudyBucketLabel()}</span>
							<button class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-accent" type="button" onclick={clearSelectedStudyBucket}>{t('analysis.study.clearChartCut')}</button>
						</div>
					{/if}
					<div class="mt-4 divide-y divide-border rounded-md border border-border">
						{#if studyTarget === 'vaccines'}
							{#each limitedListedStudyVaccines as vaccine}
								<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{vaccine.name} · {vaccineDoseLabel(vaccine)} - {vaccineStatusLabel(vaccine.status)}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{vaccine.pet.name} - {speciesLabel(vaccine.pet.species)} - {breedLabel(vaccine.pet.breed)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(vaccine.pet)} - {studyPetCityText(vaccine.pet)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{t('treatment.appliedAt')}: {formatDateForDisplay(vaccine.appliedAt)} - {t('treatment.analytics.dueAt')}: {formatDateForDisplay(vaccine.dueAt)}</p>
									</div>
									<a href={studyPetProfileHref(vaccine.pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
								</article>
							{:else}
								<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyVaccines')}</p>
							{/each}
						{:else if studyTarget === 'antiparasitics'}
							{#each limitedListedStudyAntiparasitics as antiparasitic}
								<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{antiparasitic.name} · {antiparasiticDoseLabel(antiparasitic)} - {antiparasiticStatusLabel(antiparasitic.status)}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{antiparasitic.pet.name} - {speciesLabel(antiparasitic.pet.species)} - {breedLabel(antiparasitic.pet.breed)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(antiparasitic.pet)} - {studyPetCityText(antiparasitic.pet)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{t('treatment.appliedAt')}: {formatDateForDisplay(antiparasitic.appliedAt)} - {t('treatment.analytics.dueAt')}: {formatDateForDisplay(antiparasitic.dueAt)}</p>
									</div>
									<a href={studyPetProfileHref(antiparasitic.pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
								</article>
							{:else}
								<p class="p-4 text-center text-sm text-muted-foreground">{t('treatment.analytics.emptyStatus')}</p>
							{/each}
						{:else if studyTarget === 'owners'}
							{#each limitedListedStudyOwners as owner}
								<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{owner.name}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{owner.cityLabel ?? t('common.notInformed')}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{metricFormatter(owner.petCount)} {t('analysis.study.ownerPets')}: {studyOwnerPetNamesText(owner)}</p>
									</div>
									<a href={ownerProfileHref(owner)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openOwner')}</a>
								</article>
							{:else}
								<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyOwners')}</p>
							{/each}
						{:else}
							{#each limitedListedStudyPets as pet}
								<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{pet.name}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{speciesLabel(pet.species)} - {breedLabel(pet.breed)} - {sexLabel(pet.sex)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(pet)} - {studyPetCityText(pet)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{vaccineStatusLabel(pet.vaccineStatus)} - {studyPetVaccineText(pet)}</p>
										<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{antiparasiticStatusLabel(pet.antiparasiticStatus)} - {studyPetAntiparasiticText(pet)}</p>
									</div>
									<a href={studyPetProfileHref(pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
								</article>
							{:else}
								<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyPets')}</p>
							{/each}
						{/if}
					</div>
				</section>
			{/if}
		</div>
	</div>
</section>
