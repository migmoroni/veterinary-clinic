<script lang="ts">
	import Select from '$lib/components/ui/Select.svelte';
	import {
		type DashboardBucket,
		type DashboardNamedBucket,
		type DashboardOwnerStudyItem,
		type DashboardOwnerStudyPet,
		type DashboardPetStudyItem,
		type DashboardPetStudyVaccine,
		type DashboardVaccineStatusKey
	} from '$lib/domain/dashboard/analytics.js';
	import { formatDateForDisplay } from '$lib/domain/shared/date-input.js';
	import { getPetBreedOption, getPetSpeciesOption, isPetBreed, isPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Syringe from '@lucide/svelte/icons/syringe';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import X from '@lucide/svelte/icons/x';

	type StudyTarget = 'vaccines' | 'pets' | 'owners';
	type StudyPetSnapshot = DashboardPetStudyItem | DashboardOwnerStudyPet;
	type StudyVaccineSummary = DashboardPetStudyVaccine & { id: string; pet: DashboardPetStudyItem };
	type StudyDimension = 'vaccinePreset' | 'vaccineStatus' | 'petSpecies' | 'petBreed' | 'petSex' | 'petAge' | 'petVaccineStatus' | 'ownerLocation' | 'ownerPetCount' | 'ownerPetVaccineStatus' | 'ownerPetSpecies';
	type StudyVisualizationMode = 'bars' | 'table';
	type StudyCrossBucket = { primaryLabel: string; secondaryLabel: string; count: number };
	type StudyDimensionOption = { dimension: StudyDimension; labelKey: TranslationKey };
	type StudyFactor = { label: string; value: string; count: number };
	type StudyFactorKind = 'vaccinePreset' | 'vaccineStatus' | 'species' | 'breed' | 'sex' | 'age' | 'city' | 'location';

	const studyTargetOptions = [
		{ target: 'vaccines', labelKey: 'analysis.study.axis.vaccines', descriptionKey: 'analysis.study.axis.vaccinesDescription', icon: Syringe },
		{ target: 'pets', labelKey: 'analysis.study.axis.pets', descriptionKey: 'analysis.study.axis.petsDescription', icon: PawPrint },
		{ target: 'owners', labelKey: 'analysis.study.axis.owners', descriptionKey: 'analysis.study.axis.ownersDescription', icon: UserPlus }
	] as const;

	const studyVaccineStatusWeight: Record<DashboardVaccineStatusKey, number> = {
		untracked: 0,
		current: 1,
		dueSoon: 2,
		dueVerySoon: 3,
		expired: 4,
		overdue: 5
	};

	let studyTarget = $state<StudyTarget>('pets');
	let studyPrimaryDimension = $state<StudyDimension>('petBreed');
	let studySecondaryDimension = $state<StudyDimension>('petVaccineStatus');
	let studyVisualizationMode = $state<StudyVisualizationMode>('bars');
	let studySpecies = $state('');
	let studyBreed = $state('');
	let studySex = $state('');
	let studyAge = $state('');
	let studyVaccineStatus = $state('');
	let studyVaccinePresetId = $state('');
	let studyCity = $state('');
	let studyLocation = $state('');

	const allStudyPets = $derived(clinic.dashboard?.analytics.study.pets ?? []);
	const allStudyOwners = $derived(clinic.dashboard?.analytics.study.owners ?? []);
	const allStudyVaccines = $derived(studyVaccineItems(allStudyPets));
	const filteredStudyPets = $derived(filterStudyPets(allStudyPets));
	const filteredStudyVaccineItems = $derived(filterStudyVaccineItems(allStudyVaccines));
	const filteredStudyOwners = $derived(filterStudyOwners(allStudyOwners));
	const studyTargetPets = $derived(resolveStudyTargetPets());
	const studyTargetOwners = $derived(resolveStudyTargetOwners());
	const studyTargetVaccines = $derived(resolveStudyTargetVaccines());
	const selectedStudyBuckets = $derived(buildStudyVisualizationBuckets());
	const selectedStudyFactors = $derived(studyFactorSummaries());

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function studyOptionLabel(label: string, count: number): string {
		return `${label} (${metricFormatter(count)})`;
	}

	function studyAllOptionLabel(): string {
		return t('analysis.study.all');
	}

	function studyVaccineItems(pets: DashboardPetStudyItem[]): StudyVaccineSummary[] {
		return pets.flatMap((pet) => pet.vaccines.map((vaccine) => ({ ...vaccine, id: `${pet.id}:${vaccine.presetId}`, pet })));
	}

	function selectStudyTarget(target: StudyTarget): void {
		studyTarget = target;
		studyPrimaryDimension = defaultStudyPrimaryDimension(target);
		studySecondaryDimension = defaultStudySecondaryDimension(target);
	}

	function defaultStudyPrimaryDimension(target: StudyTarget): StudyDimension {
		if (target === 'vaccines') return 'vaccineStatus';
		if (target === 'owners') return 'ownerLocation';
		return 'petBreed';
	}

	function defaultStudySecondaryDimension(target: StudyTarget): StudyDimension {
		if (target === 'vaccines') return 'petSpecies';
		if (target === 'owners') return 'ownerPetVaccineStatus';
		return 'petVaccineStatus';
	}

	function availableStudyDimensions(): StudyDimensionOption[] {
		if (studyTarget === 'vaccines') {
			return [
				{ dimension: 'vaccineStatus', labelKey: 'analysis.study.vaccinesByStatus' },
				{ dimension: 'vaccinePreset', labelKey: 'analysis.study.vaccinesByPreset' },
				{ dimension: 'petSpecies', labelKey: 'analysis.pet.species' },
				{ dimension: 'ownerLocation', labelKey: 'analysis.owner.location' }
			];
		}

		if (studyTarget === 'owners') {
			return [
				{ dimension: 'ownerLocation', labelKey: 'analysis.owner.location' },
				{ dimension: 'ownerPetCount', labelKey: 'analysis.owner.petCount' },
				{ dimension: 'ownerPetVaccineStatus', labelKey: 'analysis.owner.vaccineStatus' },
				{ dimension: 'ownerPetSpecies', labelKey: 'analysis.study.ownersByPetSpecies' }
			];
		}

		return [
			{ dimension: 'petBreed', labelKey: 'analysis.pet.breed' },
			{ dimension: 'petSpecies', labelKey: 'analysis.pet.species' },
			{ dimension: 'petVaccineStatus', labelKey: 'analysis.pet.vaccineStatus' },
			{ dimension: 'petSex', labelKey: 'analysis.pet.sex' },
			{ dimension: 'petAge', labelKey: 'analysis.pet.age' },
			{ dimension: 'ownerLocation', labelKey: 'analysis.owner.location' }
		];
	}

	function studyDimensionOptions() {
		return availableStudyDimensions().map((option) => ({ value: option.dimension, label: t(option.labelKey) }));
	}

	function studyDimensionLabel(dimension: StudyDimension): string {
		return t(availableStudyDimensions().find((option) => option.dimension === dimension)?.labelKey ?? 'common.notInformed');
	}

	function studySpeciesOptions() {
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets, (pet) => pet.species).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(speciesLabel(bucket.key), bucket.count) }))];
	}

	function studyBreedOptions() {
		const source = studySpecies ? allStudyPets.filter((pet) => pet.species === studySpecies) : allStudyPets;
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(source, (pet) => pet.breed).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(breedLabel(bucket.key), bucket.count) }))];
	}

	function studySexOptions() {
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets, (pet) => pet.sex).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(sexLabel(bucket.key), bucket.count) }))];
	}

	function studyAgeOptions() {
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets, (pet) => pet.age).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(t(ageLabelKey(bucket.key)), bucket.count) }))];
	}

	function studyVaccinePresetOptions() {
		return [
			{ value: '', label: studyAllOptionLabel() },
			...(clinic.dashboard?.analytics.study.vaccinePresets ?? []).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(renderBucketLabel(bucket), bucket.count) }))
		];
	}

	function studyVaccineStatusOptions() {
		if (studyVaccinePresetId) {
			const presetId = Number(studyVaccinePresetId);
			const buckets = new Map<DashboardVaccineStatusKey, number>();
			for (const vaccine of allStudyVaccines) {
				if (vaccine.presetId !== presetId) continue;
				buckets.set(vaccine.status, (buckets.get(vaccine.status) ?? 0) + 1);
			}
			return [{ value: '', label: studyAllOptionLabel() }, ...toDashboardBuckets(buckets).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))];
		}

		if (studyTarget === 'vaccines') {
			return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyVaccines, (vaccine) => vaccine.status).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))];
		}

		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets, (pet) => pet.vaccineStatus).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))];
	}

	function studyCityOptions() {
		return namedOwnerOptions(allStudyOwners, (owner) => owner.cityKey, (owner) => owner.cityLabel);
	}

	function studyLocationOptions() {
		const owners = studyCity ? allStudyOwners.filter((owner) => owner.cityKey === studyCity) : allStudyOwners;
		return namedOwnerOptions(owners, (owner) => owner.locationKey, (owner) => owner.locationLabel);
	}

	function namedOwnerOptions(owners: DashboardOwnerStudyItem[], getKey: (owner: DashboardOwnerStudyItem) => string, getLabel: (owner: DashboardOwnerStudyItem) => string | null) {
		const counts = new Map<string, number>();
		const labels = new Map<string, string>();
		for (const owner of owners) {
			const key = getKey(owner);
			counts.set(key, (counts.get(key) ?? 0) + 1);
			labels.set(key, getLabel(owner) ?? t('common.notInformed'));
		}

		const options = [...counts.entries()]
			.map(([key, count]) => ({ value: key, label: studyOptionLabel(labels.get(key) ?? t('common.notInformed'), count), count }))
			.sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
			.map(({ value, label }) => ({ value, label }));

		return [{ value: '', label: studyAllOptionLabel() }, ...options];
	}

	function studyPetMatchesVaccine(pet: StudyPetSnapshot): boolean {
		const presetId = Number(studyVaccinePresetId);
		if (presetId > 0 && studyVaccineStatus) return pet.vaccines.some((vaccine) => vaccine.presetId === presetId && vaccine.status === studyVaccineStatus);
		if (presetId > 0) return pet.vaccinePresetIds.includes(presetId);
		if (studyVaccineStatus) return pet.vaccineStatus === studyVaccineStatus;
		return true;
	}

	function studyPetMatchesDimensions(pet: StudyPetSnapshot): boolean {
		if (studySpecies && pet.species !== studySpecies) return false;
		if (studyBreed && pet.breed !== studyBreed) return false;
		if (studySex && pet.sex !== studySex) return false;
		if (studyAge && pet.age !== studyAge) return false;
		return true;
	}

	function ownerMatchesOwnerFilters(owner: DashboardOwnerStudyItem): boolean {
		if (studyCity && owner.cityKey !== studyCity) return false;
		if (studyLocation && owner.locationKey !== studyLocation) return false;
		return true;
	}

	function petMatchesOwnerFilters(pet: DashboardPetStudyItem): boolean {
		if (!studyCity && !studyLocation) return true;
		return pet.owners.some((owner) => {
			if (studyCity && owner.cityKey !== studyCity) return false;
			if (studyLocation && owner.locationKey !== studyLocation) return false;
			return true;
		});
	}

	function studyVaccineMatchesFilters(vaccine: StudyVaccineSummary): boolean {
		const presetId = Number(studyVaccinePresetId);
		if (presetId > 0 && vaccine.presetId !== presetId) return false;
		if (studyVaccineStatus && vaccine.status !== studyVaccineStatus) return false;
		return true;
	}

	function filterStudyPets(items: DashboardPetStudyItem[]): DashboardPetStudyItem[] {
		return items.filter((pet) => studyPetMatchesDimensions(pet) && studyPetMatchesVaccine(pet) && petMatchesOwnerFilters(pet));
	}

	function filterStudyVaccineItems(items: StudyVaccineSummary[]): StudyVaccineSummary[] {
		return items.filter((vaccine) => studyPetMatchesDimensions(vaccine.pet) && petMatchesOwnerFilters(vaccine.pet) && studyVaccineMatchesFilters(vaccine));
	}

	function filterStudyOwners(items: DashboardOwnerStudyItem[]): DashboardOwnerStudyItem[] {
		const hasPetOrVaccineFilters = !!(studySpecies || studyBreed || studySex || studyAge || studyVaccinePresetId || studyVaccineStatus);
		return items.filter((owner) => {
			if (!ownerMatchesOwnerFilters(owner)) return false;
			if (!hasPetOrVaccineFilters) return true;
			return owner.pets.some((pet) => studyPetMatchesDimensions(pet) && studyPetMatchesVaccine(pet));
		});
	}

	function toDashboardBuckets<Key extends string>(buckets: Map<Key, number>): DashboardBucket<Key>[] {
		return [...buckets.entries()]
			.map(([key, count]) => ({ key, count }))
			.sort((first, second) => second.count - first.count || first.key.localeCompare(second.key));
	}

	function studyBuckets<Item, Key extends string>(items: Item[], getKey: (item: Item) => Key): DashboardBucket<Key>[] {
		const buckets = new Map<Key, number>();
		for (const item of items) buckets.set(getKey(item), (buckets.get(getKey(item)) ?? 0) + 1);
		return toDashboardBuckets(buckets);
	}

	function uniquePetsFromVaccines(vaccines: StudyVaccineSummary[]): DashboardPetStudyItem[] {
		const pets = new Map<number, DashboardPetStudyItem>();
		for (const vaccine of vaccines) pets.set(vaccine.pet.id, vaccine.pet);
		return [...pets.values()].sort((first, second) => first.name.localeCompare(second.name));
	}

	function petsRelatedToOwners(owners: DashboardOwnerStudyItem[]): DashboardPetStudyItem[] {
		const petIds = new Set<number>();
		for (const owner of owners) for (const pet of owner.pets) petIds.add(pet.id);
		return allStudyPets.filter((pet) => petIds.has(pet.id)).sort((first, second) => first.name.localeCompare(second.name));
	}

	function ownersRelatedToPets(pets: DashboardPetStudyItem[]): DashboardOwnerStudyItem[] {
		const ownerIds = new Set<number>();
		for (const pet of pets) for (const owner of pet.owners) ownerIds.add(owner.id);
		return allStudyOwners.filter((owner) => ownerIds.has(owner.id) && ownerMatchesOwnerFilters(owner)).sort((first, second) => second.petCount - first.petCount || first.name.localeCompare(second.name));
	}

	function resolveStudyTargetPets(): DashboardPetStudyItem[] {
		if (studyTarget === 'vaccines') return uniquePetsFromVaccines(filteredStudyVaccineItems);
		if (studyTarget === 'owners') return petsRelatedToOwners(filteredStudyOwners);
		return filteredStudyPets;
	}

	function resolveStudyTargetOwners(): DashboardOwnerStudyItem[] {
		if (studyTarget === 'owners') return filteredStudyOwners;
		return ownersRelatedToPets(studyTargetPets);
	}

	function resolveStudyTargetVaccines(): StudyVaccineSummary[] {
		if (studyTarget === 'vaccines') return filteredStudyVaccineItems;
		const petIds = new Set(studyTargetPets.map((pet) => pet.id));
		return allStudyVaccines.filter((vaccine) => petIds.has(vaccine.pet.id) && studyVaccineMatchesFilters(vaccine));
	}

	function hasStudyFilters(): boolean {
		return !!(studySpecies || studyBreed || studySex || studyAge || studyVaccineStatus || studyVaccinePresetId || studyCity || studyLocation);
	}

	function clearStudyFilters(): void {
		studySpecies = '';
		studyBreed = '';
		studySex = '';
		studyAge = '';
		studyVaccineStatus = '';
		studyVaccinePresetId = '';
		studyCity = '';
		studyLocation = '';
	}

	function studyFactorSummaries(): StudyFactor[] {
		const factors: StudyFactor[] = [];
		if (studyVaccinePresetId) factors.push({ label: t('analysis.study.vaccinePreset'), value: selectedVaccinePresetLabel(), count: countStudyTargetForFactor('vaccinePreset') });
		if (studyVaccineStatus) factors.push({ label: t('analysis.study.vaccineStatus'), value: vaccineStatusLabel(studyVaccineStatus as DashboardVaccineStatusKey), count: countStudyTargetForFactor('vaccineStatus') });
		if (studySpecies) factors.push({ label: t('analysis.study.species'), value: speciesLabel(studySpecies), count: countStudyTargetForFactor('species') });
		if (studyBreed) factors.push({ label: t('analysis.study.breed'), value: breedLabel(studyBreed), count: countStudyTargetForFactor('breed') });
		if (studySex) factors.push({ label: t('analysis.study.sex'), value: sexLabel(studySex), count: countStudyTargetForFactor('sex') });
		if (studyAge) factors.push({ label: t('analysis.study.age'), value: t(ageLabelKey(studyAge)), count: countStudyTargetForFactor('age') });
		if (studyCity) factors.push({ label: t('analysis.study.city'), value: selectedCityLabel(), count: countStudyTargetForFactor('city') });
		if (studyLocation) factors.push({ label: t('analysis.study.location'), value: selectedLocationLabel(), count: countStudyTargetForFactor('location') });
		return factors;
	}

	function selectedVaccinePresetLabel(): string {
		const bucket = clinic.dashboard?.analytics.study.vaccinePresets.find((item) => item.key === studyVaccinePresetId);
		return bucket ? renderBucketLabel(bucket) : t('common.notInformed');
	}

	function selectedCityLabel(): string {
		return studyCityOptions().find((option) => option.value === studyCity)?.label.replace(/ \([0-9.,]+\)$/, '') ?? t('common.notInformed');
	}

	function selectedLocationLabel(): string {
		return studyLocationOptions().find((option) => option.value === studyLocation)?.label.replace(/ \([0-9.,]+\)$/, '') ?? t('common.notInformed');
	}

	function petMatchesFactor(pet: DashboardPetStudyItem, factor: StudyFactorKind): boolean {
		if (factor === 'vaccinePreset') return pet.vaccinePresetIds.includes(Number(studyVaccinePresetId));
		if (factor === 'vaccineStatus') return studyVaccineStatus ? pet.vaccineStatus === studyVaccineStatus : true;
		if (factor === 'species') return pet.species === studySpecies;
		if (factor === 'breed') return pet.breed === studyBreed;
		if (factor === 'sex') return pet.sex === studySex;
		if (factor === 'age') return pet.age === studyAge;
		if (factor === 'city') return pet.ownerCityKeys.includes(studyCity);
		return pet.ownerLocationKeys.includes(studyLocation);
	}

	function vaccineMatchesFactor(vaccine: StudyVaccineSummary, factor: StudyFactorKind): boolean {
		if (factor === 'vaccinePreset') return vaccine.presetId === Number(studyVaccinePresetId);
		if (factor === 'vaccineStatus') return vaccine.status === studyVaccineStatus;
		return petMatchesFactor(vaccine.pet, factor);
	}

	function ownerMatchesFactor(owner: DashboardOwnerStudyItem, factor: StudyFactorKind): boolean {
		if (factor === 'city') return owner.cityKey === studyCity;
		if (factor === 'location') return owner.locationKey === studyLocation;
		return owner.pets.some((pet) => {
			if (factor === 'vaccinePreset') return pet.vaccinePresetIds.includes(Number(studyVaccinePresetId));
			if (factor === 'vaccineStatus') return studyVaccineStatus ? pet.vaccineStatus === studyVaccineStatus : true;
			if (factor === 'species') return pet.species === studySpecies;
			if (factor === 'breed') return pet.breed === studyBreed;
			if (factor === 'sex') return pet.sex === studySex;
			return pet.age === studyAge;
		});
	}

	function countStudyTargetForFactor(factor: StudyFactorKind): number {
		if (studyTarget === 'vaccines') return allStudyVaccines.filter((vaccine) => vaccineMatchesFactor(vaccine, factor)).length;
		if (studyTarget === 'owners') return allStudyOwners.filter((owner) => ownerMatchesFactor(owner, factor)).length;
		return allStudyPets.filter((pet) => petMatchesFactor(pet, factor)).length;
	}

	function ownerPetCountBand(value: number): string {
		if (value <= 0) return 'none';
		if (value === 1) return 'one';
		if (value === 2) return 'two';
		return 'threePlus';
	}

	function ownerVaccineStatus(owner: DashboardOwnerStudyItem): DashboardVaccineStatusKey {
		let statusValue: DashboardVaccineStatusKey = 'untracked';
		for (const pet of owner.pets) if (studyVaccineStatusWeight[pet.vaccineStatus] > studyVaccineStatusWeight[statusValue]) statusValue = pet.vaccineStatus;
		return statusValue;
	}

	function uniqueStudyLabels(values: string[]): string[] {
		const labels = values.map((value) => value.trim()).filter((value) => value.length > 0);
		return labels.length > 0 ? [...new Set(labels)] : [t('common.notInformed')];
	}

	function activePetDimensionLabels(pet: DashboardPetStudyItem, dimension: StudyDimension): string[] {
		if (dimension === 'vaccinePreset') return uniqueStudyLabels(pet.vaccinePresetNames.length > 0 ? pet.vaccinePresetNames : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'vaccineStatus') return uniqueStudyLabels(pet.vaccines.length > 0 ? pet.vaccines.map((vaccine) => vaccineStatusLabel(vaccine.status)) : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'petSpecies') return [speciesLabel(pet.species)];
		if (dimension === 'petBreed') return [breedLabel(pet.breed)];
		if (dimension === 'petSex') return [sexLabel(pet.sex)];
		if (dimension === 'petAge') return [t(ageLabelKey(pet.age))];
		if (dimension === 'petVaccineStatus') return [vaccineStatusLabel(pet.vaccineStatus)];
		if (dimension === 'ownerLocation') return uniqueStudyLabels(pet.ownerLocationLabels);
		return [t('common.notInformed')];
	}

	function ownerPetDimensionLabels(pet: DashboardOwnerStudyPet, dimension: StudyDimension): string[] {
		if (dimension === 'petSpecies') return [speciesLabel(pet.species)];
		if (dimension === 'petBreed') return [breedLabel(pet.breed)];
		if (dimension === 'petSex') return [sexLabel(pet.sex)];
		if (dimension === 'petAge') return [t(ageLabelKey(pet.age))];
		if (dimension === 'petVaccineStatus') return [vaccineStatusLabel(pet.vaccineStatus)];
		if (dimension === 'vaccinePreset') return uniqueStudyLabels(pet.vaccinePresetNames.length > 0 ? pet.vaccinePresetNames : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'vaccineStatus') return uniqueStudyLabels(pet.vaccines.length > 0 ? pet.vaccines.map((vaccine) => vaccineStatusLabel(vaccine.status)) : [t('analysis.vaccineStatus.untracked')]);
		return [t('common.notInformed')];
	}

	function vaccineDimensionLabels(vaccine: StudyVaccineSummary, dimension: StudyDimension): string[] {
		if (dimension === 'vaccinePreset') return [vaccine.presetName];
		if (dimension === 'vaccineStatus') return [vaccineStatusLabel(vaccine.status)];
		return activePetDimensionLabels(vaccine.pet, dimension);
	}

	function ownerDimensionLabels(owner: DashboardOwnerStudyItem, dimension: StudyDimension): string[] {
		if (dimension === 'ownerLocation') return [owner.locationLabel ?? t('common.notInformed')];
		if (dimension === 'ownerPetCount') return [t(petCountLabelKey(ownerPetCountBand(owner.petCount)))];
		if (dimension === 'ownerPetVaccineStatus') return [vaccineStatusLabel(ownerVaccineStatus(owner))];
		if (dimension === 'ownerPetSpecies') return uniqueStudyLabels(owner.pets.map((pet) => speciesLabel(pet.species)));
		return uniqueStudyLabels(owner.pets.flatMap((pet) => ownerPetDimensionLabels(pet, dimension)));
	}

	function addStudyCrossBucket(buckets: Map<string, StudyCrossBucket>, primaryLabels: string[], secondaryLabels: string[]): void {
		if (studyPrimaryDimension === studySecondaryDimension) {
			for (const label of primaryLabels) {
				const key = `${label}\u0000${label}`;
				const current = buckets.get(key) ?? { primaryLabel: label, secondaryLabel: label, count: 0 };
				current.count += 1;
				buckets.set(key, current);
			}
			return;
		}

		for (const primaryLabel of primaryLabels) {
			for (const secondaryLabel of secondaryLabels) {
				const key = `${primaryLabel}\u0000${secondaryLabel}`;
				const current = buckets.get(key) ?? { primaryLabel, secondaryLabel, count: 0 };
				current.count += 1;
				buckets.set(key, current);
			}
		}
	}

	function buildStudyVisualizationBuckets(): StudyCrossBucket[] {
		const buckets = new Map<string, StudyCrossBucket>();
		if (studyTarget === 'vaccines') for (const vaccine of studyTargetVaccines) addStudyCrossBucket(buckets, vaccineDimensionLabels(vaccine, studyPrimaryDimension), vaccineDimensionLabels(vaccine, studySecondaryDimension));
		else if (studyTarget === 'owners') for (const owner of studyTargetOwners) addStudyCrossBucket(buckets, ownerDimensionLabels(owner, studyPrimaryDimension), ownerDimensionLabels(owner, studySecondaryDimension));
		else for (const pet of studyTargetPets) addStudyCrossBucket(buckets, activePetDimensionLabels(pet, studyPrimaryDimension), activePetDimensionLabels(pet, studySecondaryDimension));
		return [...buckets.values()].sort((first, second) => second.count - first.count || first.primaryLabel.localeCompare(second.primaryLabel) || first.secondaryLabel.localeCompare(second.secondaryLabel));
	}

	function studyVisualizationTitle(): string {
		return `${studyDimensionLabel(studyPrimaryDimension)} ${t('common.and')} ${studyDimensionLabel(studySecondaryDimension)}`;
	}

	function chartGroupTotal(buckets: { count: number }[]): number {
		return buckets.reduce((total, bucket) => total + bucket.count, 0);
	}

	function chartBucketPercentLabel(count: number, buckets: { count: number }[]): string {
		const total = chartGroupTotal(buckets);
		if (total <= 0 || count <= 0) return '0%';
		const percent = (count / total) * 100;
		return `${new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(Math.round(percent * 10) / 10)}%`;
	}

	function maxChartBucketCount(buckets: { count: number }[]): number {
		return buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
	}

	function topChartBuckets<T>(buckets: T[], limit: number): T[] {
		return buckets.slice(0, limit);
	}

	function bucketWidth(count: number, max: number): number {
		return max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
	}

	function speciesLabel(key: string): string {
		const option = isPetSpecies(key) ? getPetSpeciesOption(key) : null;
		return option ? t(option.labelKey) : t('common.notInformed');
	}

	function breedLabel(key: string): string {
		const option = isPetBreed(key) ? getPetBreedOption(key) : null;
		return option ? t(option.labelKey) : t('common.notInformed');
	}

	function sexLabel(key: string): string {
		if (key === 'M') return t('pet.sexMale');
		if (key === 'F') return t('pet.sexFemale');
		return t('pet.sexUnknown');
	}

	function ageLabelKey(key: string): TranslationKey {
		return `analysis.age.${key}` as TranslationKey;
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

	function studyOwnerText(pet: DashboardPetStudyItem): string {
		return pet.owners.map((owner) => owner.name).join(' - ') || t('owner.unassigned');
	}

	function studyPetLocationText(pet: DashboardPetStudyItem): string {
		return pet.ownerLocationLabels.join(' - ') || t('common.notInformed');
	}

	function studyPetVaccineText(pet: DashboardPetStudyItem): string {
		return pet.vaccinePresetNames.join(' - ') || t('analysis.vaccineStatus.untracked');
	}

	function studyPetProfileHref(pet: DashboardPetStudyItem): string {
		return `/pets/${pet.id}`;
	}

	function ownerProfileHref(owner: DashboardOwnerStudyItem): string {
		return `/owners/${owner.id}`;
	}

	function studyOwnerPetNamesText(owner: DashboardOwnerStudyItem): string {
		return owner.petNames.slice(0, 4).join(' - ') || t('common.notInformed');
	}

	$effect(() => {
		const dimensionOptions = availableStudyDimensions();
		if (!dimensionOptions.some((option) => option.dimension === studyPrimaryDimension)) studyPrimaryDimension = defaultStudyPrimaryDimension(studyTarget);
		if (!dimensionOptions.some((option) => option.dimension === studySecondaryDimension)) studySecondaryDimension = defaultStudySecondaryDimension(studyTarget);
		if (studyBreed && !studyBreedOptions().some((option) => option.value === studyBreed)) studyBreed = '';
		if (studyLocation && !studyLocationOptions().some((option) => option.value === studyLocation)) studyLocation = '';
		if (studyVaccineStatus && !studyVaccineStatusOptions().some((option) => option.value === studyVaccineStatus)) studyVaccineStatus = '';
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
		<ChartColumn class="size-4" />
		{t('analysis.general.title')}
	</div>
	<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.general.description')}</p>

	<div class="mt-5 rounded-md border border-border bg-background p-3">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="min-w-0">
				<p class="text-sm font-semibold">{t('analysis.study.axis')}</p>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.study.axisDescription')}</p>
			</div>
			<div class="grid gap-2 sm:grid-cols-3 lg:min-w-136" role="tablist" aria-label={t('analysis.study.axis')}>
				{#each studyTargetOptions as option}
					<button class="flex min-h-20 items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent {studyTarget === option.target ? 'border-primary bg-primary/10 ring-2 ring-ring/20' : 'border-border bg-background'}" type="button" role="tab" aria-selected={studyTarget === option.target} onclick={() => selectStudyTarget(option.target)}>
						<option.icon class="mt-0.5 size-4 shrink-0" />
						<span class="min-w-0">
							<span class="block text-sm font-semibold">{t(option.labelKey)}</span>
							<span class="mt-1 block text-xs leading-5 text-muted-foreground">{t(option.descriptionKey)}</span>
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="mt-5 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
		<aside class="rounded-md border border-border bg-background p-4">
			<div class="flex items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
					<SlidersHorizontal class="size-4" />
					<span>{t('analysis.study.yAxis')}</span>
				</div>
				<button class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" type="button" disabled={!hasStudyFilters()} onclick={clearStudyFilters} aria-label={t('analysis.study.clear')}>
					<X class="size-4" />
				</button>
			</div>

			<div class="mt-5 space-y-5">
				<div class="space-y-3">
					<p class="text-sm font-semibold">{t('analysis.study.vaccineCriteria')}</p>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-vaccine-preset">{t('analysis.study.vaccinePreset')}</label>
						<Select id="study-vaccine-preset" bind:value={studyVaccinePresetId} options={studyVaccinePresetOptions()} />
					</div>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-vaccine-status">{t('analysis.study.vaccineStatus')}</label>
						<Select id="study-vaccine-status" bind:value={studyVaccineStatus} options={studyVaccineStatusOptions()} />
					</div>
				</div>

				<div class="space-y-3 border-t border-border pt-5">
					<p class="text-sm font-semibold">{t('analysis.study.petCriteria')}</p>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-species">{t('analysis.study.species')}</label>
						<Select id="study-species" bind:value={studySpecies} options={studySpeciesOptions()} />
					</div>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-breed">{t('analysis.study.breed')}</label>
						<Select id="study-breed" bind:value={studyBreed} options={studyBreedOptions()} />
					</div>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-sex">{t('analysis.study.sex')}</label>
						<Select id="study-sex" bind:value={studySex} options={studySexOptions()} />
					</div>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-age">{t('analysis.study.age')}</label>
						<Select id="study-age" bind:value={studyAge} options={studyAgeOptions()} />
					</div>
				</div>

				<div class="space-y-3 border-t border-border pt-5">
					<p class="text-sm font-semibold">{t('analysis.study.ownerCriteria')}</p>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-city">{t('analysis.study.city')}</label>
						<Select id="study-city" bind:value={studyCity} options={studyCityOptions()} />
					</div>
					<div class="space-y-1">
						<label class="text-sm font-medium" for="study-location">{t('analysis.study.location')}</label>
						<Select id="study-location" bind:value={studyLocation} options={studyLocationOptions()} />
					</div>
				</div>
			</div>
		</aside>

		<div class="min-w-0 space-y-4">
			<section class="rounded-md border border-border bg-background p-4">
				<div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
					<div class="min-w-0">
						<h3 class="text-sm font-semibold">{t('analysis.study.visualization')}</h3>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.study.visualizationDescription')}</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-2 xl:min-w-160 xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto]">
						<div class="space-y-1">
							<label class="text-sm font-medium" for="study-primary-dimension">{t('analysis.study.visualizeByPrimary')}</label>
							<Select id="study-primary-dimension" bind:value={studyPrimaryDimension} options={studyDimensionOptions()} />
						</div>
						<div class="space-y-1">
							<label class="text-sm font-medium" for="study-secondary-dimension">{t('analysis.study.visualizeBySecondary')}</label>
							<Select id="study-secondary-dimension" bind:value={studySecondaryDimension} options={studyDimensionOptions()} />
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
						<span class="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{metricFormatter(chartGroupTotal(selectedStudyBuckets))}</span>
					</div>

					{#if studyVisualizationMode === 'bars'}
						<div class="divide-y divide-border/70">
							{#each topChartBuckets(selectedStudyBuckets, 16) as bucket}
								<div class="grid grid-cols-[minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1.6fr)_5rem_4.5rem] items-center gap-3 py-2 text-sm">
									<span class="truncate text-muted-foreground" title={bucket.primaryLabel}>{bucket.primaryLabel}</span>
									<span class="truncate text-muted-foreground" title={bucket.secondaryLabel}>{bucket.secondaryLabel}</span>
									<span class="h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxChartBucketCount(selectedStudyBuckets))}%`}></span></span>
									<span class="text-right font-medium tabular-nums">{metricFormatter(bucket.count)}</span>
									<span class="text-right text-xs font-medium tabular-nums text-muted-foreground">{chartBucketPercentLabel(bucket.count, selectedStudyBuckets)}</span>
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
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									{#each topChartBuckets(selectedStudyBuckets, 16) as bucket}
										<tr>
											<td class="truncate px-3 py-2 text-muted-foreground" title={bucket.primaryLabel}>{bucket.primaryLabel}</td>
											<td class="truncate px-3 py-2 text-muted-foreground" title={bucket.secondaryLabel}>{bucket.secondaryLabel}</td>
											<td class="px-3 py-2 text-right font-medium tabular-nums">{metricFormatter(bucket.count)}</td>
											<td class="px-3 py-2 text-right font-medium tabular-nums text-muted-foreground">{chartBucketPercentLabel(bucket.count, selectedStudyBuckets)}</td>
										</tr>
									{:else}
										<tr><td class="px-3 py-4 text-muted-foreground" colspan="4">{t('analysis.empty')}</td></tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</section>

			<section class="rounded-md border border-border bg-background p-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h3 class="text-sm font-semibold">{studyTarget === 'vaccines' ? t('analysis.study.relatedVaccines') : studyTarget === 'owners' ? t('analysis.study.relatedOwners') : t('analysis.study.relatedPets')}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{studyTarget === 'vaccines' ? t('analysis.study.relatedVaccinesDescription') : studyTarget === 'owners' ? t('analysis.study.relatedOwnersListDescription') : t('analysis.study.relatedPetsDescription')}</p>
					</div>
					<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTarget === 'vaccines' ? studyTargetVaccines.length : studyTarget === 'owners' ? studyTargetOwners.length : studyTargetPets.length)}</span>
				</div>
				<div class="mt-4 divide-y divide-border rounded-md border border-border">
					{#if studyTarget === 'vaccines'}
						{#each studyTargetVaccines.slice(0, 40) as vaccine}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div class="min-w-0">
									<p class="wrap-break-word text-sm font-semibold">{vaccine.presetName} - {vaccineStatusLabel(vaccine.status)}</p>
									<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{vaccine.pet.name} - {speciesLabel(vaccine.pet.species)} - {breedLabel(vaccine.pet.breed)}</p>
									<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(vaccine.pet)} - {studyPetLocationText(vaccine.pet)}</p>
									<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{t('vaccine.appliedAt')}: {formatDateForDisplay(vaccine.appliedAt)} - {t('vaccine.analytics.dueAt')}: {formatDateForDisplay(vaccine.dueAt)}</p>
								</div>
								<a href={studyPetProfileHref(vaccine.pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
							</article>
						{:else}
							<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyVaccines')}</p>
						{/each}
					{:else if studyTarget === 'owners'}
						{#each studyTargetOwners.slice(0, 40) as owner}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div class="min-w-0">
									<p class="wrap-break-word text-sm font-semibold">{owner.name}</p>
									<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{owner.locationLabel ?? t('common.notInformed')}</p>
									<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{metricFormatter(owner.petCount)} {t('analysis.study.ownerPets')}: {studyOwnerPetNamesText(owner)}</p>
								</div>
								<a href={ownerProfileHref(owner)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openOwner')}</a>
							</article>
						{:else}
							<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyOwners')}</p>
						{/each}
					{:else}
						{#each studyTargetPets.slice(0, 40) as pet}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div class="min-w-0">
									<p class="wrap-break-word text-sm font-semibold">{pet.name}</p>
									<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{speciesLabel(pet.species)} - {breedLabel(pet.breed)} - {sexLabel(pet.sex)}</p>
									<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(pet)} - {studyPetLocationText(pet)}</p>
									<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{vaccineStatusLabel(pet.vaccineStatus)} - {studyPetVaccineText(pet)}</p>
								</div>
								<a href={studyPetProfileHref(pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
							</article>
						{:else}
							<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyPets')}</p>
						{/each}
					{/if}
				</div>
			</section>
		</div>
	</div>
</section>
