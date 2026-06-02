<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import PeriodField from '$lib/components/forms/PeriodField.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import type { Dewormer } from '$lib/domain/deworming/deworming.js';
	import { petSpeciesOptions, type KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import type { PreventiveProtocol, PreventiveProtocolDose, PreventiveProtocolKind, PreventiveValidityUnit } from '$lib/domain/preventive/protocol.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import type { Vaccine } from '$lib/domain/vaccine/vaccine.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadDewormers, removeDewormerName, saveDewormerName, setDewormerNameHidden } from '$lib/services/deworming.service.js';
	import { loadPreventiveProtocols, removeProtocol, removeProtocolDose, saveProtocol, saveProtocolDose, setProtocolHidden } from '$lib/services/preventive-protocol.service.js';
	import { loadVaccines, removeVaccineName, saveVaccineName, setVaccineNameHidden } from '$lib/services/vaccine.service.js';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Pill from '@lucide/svelte/icons/pill';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type VaccineSettingsTab = 'vaccines' | 'dewormers' | 'protocols';
	type CatalogItem = Vaccine | Dewormer;

	const tabs: { id: VaccineSettingsTab; labelKey: TranslationKey }[] = [
		{ id: 'vaccines', labelKey: 'vaccine.catalog.tab.vaccines' },
		{ id: 'dewormers', labelKey: 'deworming.catalog.tab.dewormers' },
		{ id: 'protocols', labelKey: 'protocol.tab' }
	];

	let vaccines = $state<Vaccine[]>([]);
	let dewormers = $state<Dewormer[]>([]);
	let protocols = $state<PreventiveProtocol[]>([]);
	let activeTab = $state<VaccineSettingsTab>('vaccines');
	let vaccineDraftNames = $state<Record<number, string>>({});
	let vaccineDraftAliases = $state<Record<number, string>>({});
	let vaccineDraftSpecies = $state<Record<number, KnownPetSpecies[]>>({});
	let dewormerDraftNames = $state<Record<number, string>>({});
	let dewormerDraftAliases = $state<Record<number, string>>({});
	let dewormerDraftSpecies = $state<Record<number, KnownPetSpecies[]>>({});
	let protocolDraftNames = $state<Record<number, string>>({});
	let protocolDraftSpecies = $state<Record<number, KnownPetSpecies[]>>({});
	let protocolDraftObservations = $state<Record<number, string>>({});
	let protocolDraftItemIds = $state<Record<number, number[]>>({});
	let doseDraftDoses = $state<Record<number, string>>({});
	let doseDraftValidityValues = $state<Record<number, number>>({});
	let doseDraftValidityUnits = $state<Record<number, PreventiveValidityUnit>>({});
	let newDoseDoses = $state<Record<number, string>>({});
	let newDoseValidityValues = $state<Record<number, number>>({});
	let newDoseValidityUnits = $state<Record<number, PreventiveValidityUnit>>({});
	let newVaccineName = $state('');
	let newVaccineAliases = $state('');
	let newVaccineSpecies = $state<KnownPetSpecies[]>(defaultSpeciesDraft());
	let newDewormerName = $state('');
	let newDewormerAliases = $state('');
	let newDewormerSpecies = $state<KnownPetSpecies[]>(defaultSpeciesDraft());
	let newProtocolKind = $state<PreventiveProtocolKind>('vaccine');
	let newProtocolName = $state('');
	let newProtocolSpecies = $state<KnownPetSpecies[]>(defaultSpeciesDraft());
	let newProtocolObservation = $state('');
	let newProtocolItemIds = $state<number[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let protocolPendingRemoval = $state<PreventiveProtocol | null>(null);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	function sortedVaccines(source: Vaccine[]): Vaccine[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name));
	}

	function sortedDewormers(source: Dewormer[]): Dewormer[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name));
	}

	function sortedProtocols(source: PreventiveProtocol[]): PreventiveProtocol[] {
		return [...source].sort((first, second) => first.kind.localeCompare(second.kind) || first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
	}

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function defaultSpeciesDraft(): KnownPetSpecies[] {
		return petSpeciesOptions.map((option) => option.id);
	}

	function parseAliases(value: string): string[] {
		return value
			.split(',')
			.map((alias) => alias.trim())
			.filter(Boolean);
	}

	function aliasDraft(aliases: string[]): string {
		return aliases.join(', ');
	}

	function toggleSpeciesDraft(values: KnownPetSpecies[], species: KnownPetSpecies): KnownPetSpecies[] {
		if (values.includes(species)) return values.length > 1 ? values.filter((value) => value !== species) : values;
		return [...values, species];
	}

	function speciesLabel(species: KnownPetSpecies): string {
		const option = petSpeciesOptions.find((item) => item.id === species);
		return option ? t(option.labelKey) : species;
	}

	function speciesSummary(species: KnownPetSpecies[]): string {
		return species.map(speciesLabel).join(', ');
	}

	function vaccineDraftSpeciesValue(vaccine: Vaccine): KnownPetSpecies[] {
		return vaccineDraftSpecies[vaccine.id] ?? vaccine.species;
	}

	function dewormerDraftSpeciesValue(dewormer: Dewormer): KnownPetSpecies[] {
		return dewormerDraftSpecies[dewormer.id] ?? dewormer.species;
	}

	function protocolDraftSpeciesValue(protocol: PreventiveProtocol): KnownPetSpecies[] {
		return protocolDraftSpecies[protocol.id] ?? protocol.species;
	}

	function setVaccineSpecies(vaccine: Vaccine, species: KnownPetSpecies) {
		vaccineDraftSpecies = { ...vaccineDraftSpecies, [vaccine.id]: toggleSpeciesDraft(vaccineDraftSpeciesValue(vaccine), species) };
	}

	function setDewormerSpecies(dewormer: Dewormer, species: KnownPetSpecies) {
		dewormerDraftSpecies = { ...dewormerDraftSpecies, [dewormer.id]: toggleSpeciesDraft(dewormerDraftSpeciesValue(dewormer), species) };
	}

	function itemMatchesSpecies(kind: PreventiveProtocolKind, itemId: number, species: KnownPetSpecies[]): boolean {
		return catalogItems(kind).some((item) => item.id === itemId && speciesOverlap(item.species, species));
	}

	function setNewProtocolSpecies(species: KnownPetSpecies) {
		const nextSpecies = toggleSpeciesDraft(newProtocolSpecies, species);
		newProtocolSpecies = nextSpecies;
		newProtocolItemIds = newProtocolItemIds.filter((itemId) => itemMatchesSpecies(newProtocolKind, itemId, nextSpecies));
	}

	function setProtocolSpecies(protocol: PreventiveProtocol, species: KnownPetSpecies) {
		const nextSpecies = toggleSpeciesDraft(protocolDraftSpeciesValue(protocol), species);
		protocolDraftSpecies = { ...protocolDraftSpecies, [protocol.id]: nextSpecies };
		protocolDraftItemIds = { ...protocolDraftItemIds, [protocol.id]: selectedItemIds(protocol).filter((itemId) => itemMatchesSpecies(protocol.kind, itemId, nextSpecies)) };
	}

	function itemCount(tab: VaccineSettingsTab): number {
		if (tab === 'vaccines') return vaccines.length;
		if (tab === 'dewormers') return dewormers.length;
		return protocols.length;
	}

	function kindOptions() {
		return [
			{ value: 'vaccine' as const, label: t('protocol.kind.vaccine') },
			{ value: 'dewormer' as const, label: t('protocol.kind.dewormer') }
		];
	}

	function catalogItems(kind: PreventiveProtocolKind): CatalogItem[] {
		return kind === 'vaccine' ? vaccines : dewormers;
	}

	function visibleCatalogItems(kind: PreventiveProtocolKind): CatalogItem[] {
		return catalogItems(kind).filter((item) => !item.hiddenAt);
	}

	function speciesOverlap(left: KnownPetSpecies[], right: KnownPetSpecies[]): boolean {
		return left.some((species) => right.includes(species));
	}

	function visibleCatalogItemsForSpecies(kind: PreventiveProtocolKind, species: KnownPetSpecies[]): CatalogItem[] {
		return visibleCatalogItems(kind).filter((item) => speciesOverlap(item.species, species));
	}

	function protocolCatalogItems(protocol: PreventiveProtocol): CatalogItem[] {
		const selected = selectedItemIds(protocol);
		return catalogItems(protocol.kind).filter((item) => selected.includes(item.id) || speciesOverlap(item.species, protocolDraftSpeciesValue(protocol)));
	}

	function kindLabel(kind: PreventiveProtocolKind): string {
		return kind === 'vaccine' ? t('protocol.kind.vaccine') : t('protocol.kind.dewormer');
	}

	function validityLabel(value: number, unit: PreventiveValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : unit === 'months' ? (value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural') : value === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural';
		return `${value} ${t(unitKey)}`;
	}

	function protocolDraftName(protocol: PreventiveProtocol): string {
		return protocolDraftNames[protocol.id] ?? protocol.name;
	}

	function protocolDraftObservation(protocol: PreventiveProtocol): string {
		return protocolDraftObservations[protocol.id] ?? protocol.observation ?? '';
	}

	function selectedItemIds(protocol: PreventiveProtocol): number[] {
		return protocolDraftItemIds[protocol.id] ?? protocol.items.map((item) => item.id);
	}

	function syncProtocolDraft(protocol: PreventiveProtocol) {
		protocolDraftNames = { ...protocolDraftNames, [protocol.id]: protocol.name };
		protocolDraftSpecies = { ...protocolDraftSpecies, [protocol.id]: protocol.species };
		protocolDraftObservations = { ...protocolDraftObservations, [protocol.id]: protocol.observation ?? '' };
		protocolDraftItemIds = { ...protocolDraftItemIds, [protocol.id]: protocol.items.map((item) => item.id) };

		for (const dose of protocol.doses) syncDoseDraft(dose);
		newDoseValidityValues = { ...newDoseValidityValues, [protocol.id]: newDoseValidityValues[protocol.id] ?? 12 };
		newDoseValidityUnits = { ...newDoseValidityUnits, [protocol.id]: newDoseValidityUnits[protocol.id] ?? 'months' };
	}

	function syncDoseDraft(dose: PreventiveProtocolDose) {
		doseDraftDoses = { ...doseDraftDoses, [dose.id]: dose.dose };
		doseDraftValidityValues = { ...doseDraftValidityValues, [dose.id]: dose.validityValue };
		doseDraftValidityUnits = { ...doseDraftValidityUnits, [dose.id]: dose.validityUnit };
	}

	function upsertVaccine(vaccine: Vaccine) {
		vaccines = sortedVaccines([...vaccines.filter((item) => item.id !== vaccine.id && item.normalizedName !== vaccine.normalizedName), vaccine]);
		vaccineDraftNames = { ...vaccineDraftNames, [vaccine.id]: vaccine.name };
		vaccineDraftAliases = { ...vaccineDraftAliases, [vaccine.id]: aliasDraft(vaccine.aliases) };
		vaccineDraftSpecies = { ...vaccineDraftSpecies, [vaccine.id]: vaccine.species };
	}

	function upsertDewormer(dewormer: Dewormer) {
		dewormers = sortedDewormers([...dewormers.filter((item) => item.id !== dewormer.id && item.normalizedName !== dewormer.normalizedName), dewormer]);
		dewormerDraftNames = { ...dewormerDraftNames, [dewormer.id]: dewormer.name };
		dewormerDraftAliases = { ...dewormerDraftAliases, [dewormer.id]: aliasDraft(dewormer.aliases) };
		dewormerDraftSpecies = { ...dewormerDraftSpecies, [dewormer.id]: dewormer.species };
	}

	function upsertProtocol(protocol: PreventiveProtocol) {
		protocols = sortedProtocols([...protocols.filter((item) => item.id !== protocol.id && !(item.kind === protocol.kind && item.normalizedName === protocol.normalizedName)), protocol]);
		syncProtocolDraft(protocol);
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
		else if (exception instanceof Error && exception.message === 'field_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_name_required') errorKey = 'vaccine.nameRequired';
		else if (exception instanceof Error && exception.message === 'deworming_name_required') errorKey = 'deworming.nameRequired';
		else if (exception instanceof Error && exception.message === 'protocol_name_required') errorKey = 'protocol.nameRequired';
		else if (exception instanceof Error && exception.message === 'protocol_item_required') errorKey = 'protocol.itemRequired';
		else if (exception instanceof Error && exception.message === 'protocol_dose_required') errorKey = 'protocol.doseRequired';
		else if (exception instanceof Error && exception.message === 'protocol_validity_required') errorKey = 'protocol.validityRequired';
		else errorKey = 'protocol.saveFailed';
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const [loadedVaccines, loadedDewormers, loadedProtocols] = await Promise.all([loadVaccines(true), loadDewormers(true), loadPreventiveProtocols(undefined, true)]);
			vaccines = sortedVaccines(loadedVaccines);
			dewormers = sortedDewormers(loadedDewormers);
			protocols = sortedProtocols(loadedProtocols);
			vaccineDraftNames = Object.fromEntries(vaccines.map((vaccine) => [vaccine.id, vaccine.name]));
			vaccineDraftAliases = Object.fromEntries(vaccines.map((vaccine) => [vaccine.id, aliasDraft(vaccine.aliases)]));
			vaccineDraftSpecies = Object.fromEntries(vaccines.map((vaccine) => [vaccine.id, vaccine.species]));
			dewormerDraftNames = Object.fromEntries(dewormers.map((dewormer) => [dewormer.id, dewormer.name]));
			dewormerDraftAliases = Object.fromEntries(dewormers.map((dewormer) => [dewormer.id, aliasDraft(dewormer.aliases)]));
			dewormerDraftSpecies = Object.fromEntries(dewormers.map((dewormer) => [dewormer.id, dewormer.species]));
			for (const protocol of protocols) syncProtocolDraft(protocol);
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			loading = false;
		}
	}

	async function submitNewVaccine(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveVaccineName({ name: newVaccineName, species: newVaccineSpecies, aliases: parseAliases(newVaccineAliases) });
			upsertVaccine(saved);
			newVaccineName = '';
			newVaccineAliases = '';
			newVaccineSpecies = defaultSpeciesDraft();
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitNewDewormer(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveDewormerName({ name: newDewormerName, species: newDewormerSpecies, aliases: parseAliases(newDewormerAliases) });
			upsertDewormer(saved);
			newDewormerName = '';
			newDewormerAliases = '';
			newDewormerSpecies = defaultSpeciesDraft();
			statusKey = 'deworming.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitNewProtocol(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocol({ kind: newProtocolKind, name: newProtocolName, species: newProtocolSpecies, catalogItemIds: newProtocolItemIds, observation: newProtocolObservation || null });
			upsertProtocol(saved);
			newProtocolName = '';
			newProtocolSpecies = defaultSpeciesDraft();
			newProtocolObservation = '';
			newProtocolItemIds = [];
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingVaccine(vaccine: Vaccine) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveVaccineName({ name: vaccineDraftNames[vaccine.id] ?? vaccine.name, species: vaccineDraftSpeciesValue(vaccine), aliases: parseAliases(vaccineDraftAliases[vaccine.id] ?? aliasDraft(vaccine.aliases)) }, vaccine.id);
			upsertVaccine(saved);
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingDewormer(dewormer: Dewormer) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveDewormerName({ name: dewormerDraftNames[dewormer.id] ?? dewormer.name, species: dewormerDraftSpeciesValue(dewormer), aliases: parseAliases(dewormerDraftAliases[dewormer.id] ?? aliasDraft(dewormer.aliases)) }, dewormer.id);
			upsertDewormer(saved);
			statusKey = 'deworming.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingProtocol(protocol: PreventiveProtocol) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocol(
				{
					kind: protocol.kind,
					name: protocolDraftName(protocol),
					species: protocolDraftSpeciesValue(protocol),
					catalogItemIds: selectedItemIds(protocol),
					observation: protocolDraftObservation(protocol) || null
				},
				protocol.id
			);
			upsertProtocol(saved);
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function toggleVaccineHidden(vaccine: Vaccine) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setVaccineNameHidden(vaccine.id, !vaccine.hiddenAt);
			upsertVaccine(saved);
			statusKey = saved.hiddenAt ? 'vaccine.hiddenSaved' : 'vaccine.shownSaved';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleDewormerHidden(dewormer: Dewormer) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setDewormerNameHidden(dewormer.id, !dewormer.hiddenAt);
			upsertDewormer(saved);
			statusKey = saved.hiddenAt ? 'deworming.hiddenSaved' : 'deworming.shownSaved';
		} catch {
			errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleProtocolHidden(protocol: PreventiveProtocol) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setProtocolHidden(protocol.id, !protocol.hiddenAt);
			upsertProtocol(saved);
			statusKey = saved.hiddenAt ? 'protocol.hiddenSaved' : 'protocol.shownSaved';
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteVaccine(vaccine: Vaccine) {
		if (!window.confirm(t('vaccine.list.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeVaccineName(vaccine.id);
			vaccines = vaccines.filter((item) => item.id !== vaccine.id);
			const { [vaccine.id]: _removed, ...remainingDrafts } = vaccineDraftNames;
			vaccineDraftNames = remainingDrafts;
			const { [vaccine.id]: _removedAliases, ...remainingAliases } = vaccineDraftAliases;
			const { [vaccine.id]: _removedSpecies, ...remainingSpecies } = vaccineDraftSpecies;
			vaccineDraftAliases = remainingAliases;
			vaccineDraftSpecies = remainingSpecies;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteDewormer(dewormer: Dewormer) {
		if (!window.confirm(t('deworming.list.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeDewormerName(dewormer.id);
			dewormers = dewormers.filter((item) => item.id !== dewormer.id);
			const { [dewormer.id]: _removed, ...remainingDrafts } = dewormerDraftNames;
			dewormerDraftNames = remainingDrafts;
			const { [dewormer.id]: _removedAliases, ...remainingAliases } = dewormerDraftAliases;
			const { [dewormer.id]: _removedSpecies, ...remainingSpecies } = dewormerDraftSpecies;
			dewormerDraftAliases = remainingAliases;
			dewormerDraftSpecies = remainingSpecies;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	function deleteProtocol(protocol: PreventiveProtocol) {
		if (saving) return;
		protocolPendingRemoval = protocol;
	}

	async function confirmProtocolRemoval() {
		const protocol = protocolPendingRemoval;
		if (!protocol || saving) return;

		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeProtocol(protocol.id);
			protocols = protocols.filter((item) => item.id !== protocol.id);
			protocolPendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			saving = false;
		}
	}

	function cancelProtocolRemoval() {
		if (!saving) protocolPendingRemoval = null;
	}

	function toggleNewProtocolItem(itemId: number) {
		newProtocolItemIds = newProtocolItemIds.includes(itemId) ? newProtocolItemIds.filter((id) => id !== itemId) : [...newProtocolItemIds, itemId];
	}

	function handleNewProtocolKindChange(kind: PreventiveProtocolKind) {
		newProtocolKind = kind;
		newProtocolItemIds = [];
	}

	function toggleProtocolItem(protocol: PreventiveProtocol, itemId: number) {
		const selected = selectedItemIds(protocol);
		protocolDraftItemIds = {
			...protocolDraftItemIds,
			[protocol.id]: selected.includes(itemId) ? selected.filter((id) => id !== itemId) : [...selected, itemId]
		};
	}

	function setProtocolObservation(protocolId: number, value: string) {
		protocolDraftObservations = { ...protocolDraftObservations, [protocolId]: value };
	}

	function setNewDose(protocolId: number, value: string) {
		newDoseDoses = { ...newDoseDoses, [protocolId]: value };
	}

	function setNewDoseValidity(protocolId: number, value: number, unit: PreventiveValidityUnit) {
		newDoseValidityValues = { ...newDoseValidityValues, [protocolId]: value };
		newDoseValidityUnits = { ...newDoseValidityUnits, [protocolId]: unit };
	}

	function setDoseValidity(doseId: number, value: number, unit: PreventiveValidityUnit) {
		doseDraftValidityValues = { ...doseDraftValidityValues, [doseId]: value };
		doseDraftValidityUnits = { ...doseDraftValidityUnits, [doseId]: unit };
	}

	async function addProtocolDose(event: SubmitEvent, protocol: PreventiveProtocol) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocolDose(protocol.id, {
				dose: newDoseDoses[protocol.id] ?? '',
				validityValue: newDoseValidityValues[protocol.id] ?? 12,
				validityUnit: newDoseValidityUnits[protocol.id] ?? 'months'
			});
			upsertProtocol(saved);
			newDoseDoses = { ...newDoseDoses, [protocol.id]: '' };
			newDoseValidityValues = { ...newDoseValidityValues, [protocol.id]: 12 };
			newDoseValidityUnits = { ...newDoseValidityUnits, [protocol.id]: 'months' };
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingProtocolDose(event: SubmitEvent, protocol: PreventiveProtocol, dose: PreventiveProtocolDose) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocolDose(
				protocol.id,
				{
					dose: doseDraftDoses[dose.id] ?? dose.dose,
					validityValue: doseDraftValidityValues[dose.id] ?? dose.validityValue,
					validityUnit: doseDraftValidityUnits[dose.id] ?? dose.validityUnit
				},
				dose.id
			);
			upsertProtocol(saved);
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function deleteProtocolDose(protocol: PreventiveProtocol, dose: PreventiveProtocolDose) {
		if (!window.confirm(t('protocol.doseDeleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await removeProtocolDose(protocol.id, dose.id);
			upsertProtocol(saved);
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.vaccines.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.vaccines.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('settings.vaccines.description')}</p>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<div class="grid grid-cols-1 gap-1 rounded-md border border-border bg-muted p-1 sm:grid-cols-3" role="tablist" aria-label={t('vaccine.catalog.tabs')}>
		{#each tabs as tab}
			{@const count = itemCount(tab.id)}
			<button class="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				<span class="truncate">{t(tab.labelKey)}</span>
				<span class="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold {count > 0 ? (activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary') : 'bg-background/70 text-muted-foreground'}">{count}</span>
			</button>
		{/each}
	</div>

	{#if activeTab === 'vaccines'}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-start gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Syringe class="size-5" />
				</span>
				<div class="min-w-0 flex-1">
					<h3 class="text-base font-semibold">{t('vaccine.list.title')}</h3>
					<form class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start" onsubmit={submitNewVaccine}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('vaccine.name')}</span>
								<CharacterLimitHint value={newVaccineName} max={FIELD_LIMITS.vaccineName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newVaccineName} maxlength={FIELD_LIMITS.vaccineName} required />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('preventive.aliases')}</span>
								<CharacterLimitHint value={newVaccineAliases} max={FIELD_LIMITS.preventiveAliasesJson} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newVaccineAliases} maxlength={FIELD_LIMITS.preventiveAliasesJson} placeholder={t('preventive.aliasesPlaceholder')} />
						</label>
						<div class="flex min-w-0 flex-col gap-2 text-sm font-medium lg:col-span-2">
							<span>{t('preventive.species')}</span>
							<div class="flex flex-wrap gap-2">
								{#each petSpeciesOptions as option}
									<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
										<input type="checkbox" class="size-4 accent-primary" checked={newVaccineSpecies.includes(option.id)} onchange={() => (newVaccineSpecies = toggleSpeciesDraft(newVaccineSpecies, option.id))} />
										<span>{t(option.labelKey)}</span>
									</label>
								{/each}
							</div>
						</div>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Plus class="size-4" />
							{t('vaccine.list.add')}
						</button>
					</form>
				</div>
			</div>

			<div class="mt-4 flex flex-col gap-3">
				{#if loading}
					<div class="h-28 animate-pulse rounded-md bg-muted"></div>
				{:else}
					{#each vaccines as vaccine (vaccine.id)}
						<form class="grid gap-3 rounded-md border border-border bg-background p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] xl:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingVaccine(vaccine); }}>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t('vaccine.name')}</span>
									<CharacterLimitHint value={vaccineDraftNames[vaccine.id] ?? vaccine.name} max={FIELD_LIMITS.vaccineName} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={vaccineDraftNames[vaccine.id] ?? vaccine.name} maxlength={FIELD_LIMITS.vaccineName} required oninput={(event) => (vaccineDraftNames = { ...vaccineDraftNames, [vaccine.id]: inputValue(event) })} />
							</label>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t('preventive.aliases')}</span>
									<CharacterLimitHint value={vaccineDraftAliases[vaccine.id] ?? aliasDraft(vaccine.aliases)} max={FIELD_LIMITS.preventiveAliasesJson} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={vaccineDraftAliases[vaccine.id] ?? aliasDraft(vaccine.aliases)} maxlength={FIELD_LIMITS.preventiveAliasesJson} placeholder={t('preventive.aliasesPlaceholder')} oninput={(event) => (vaccineDraftAliases = { ...vaccineDraftAliases, [vaccine.id]: inputValue(event) })} />
							</label>
							<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
								<Save class="size-4" />
								{t('actions.save')}
							</button>
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={vaccine.hiddenAt ? t('vaccine.list.show') : t('vaccine.list.hide')} onclick={() => void toggleVaccineHidden(vaccine)}>
								{#if vaccine.hiddenAt}
									<Eye class="size-4" />
									{t('vaccine.list.show')}
								{:else}
									<EyeOff class="size-4" />
									{t('vaccine.list.hide')}
								{/if}
							</button>
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteVaccine(vaccine)}>
								<Trash2 class="size-4" />
								{t('actions.delete')}
							</button>
							<div class="flex min-w-0 flex-col gap-2 text-sm font-medium xl:col-span-5">
								<span>{t('preventive.species')}: <span class="font-normal text-muted-foreground">{speciesSummary(vaccineDraftSpeciesValue(vaccine))}</span></span>
								<div class="flex flex-wrap gap-2">
									{#each petSpeciesOptions as option}
										<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
											<input type="checkbox" class="size-4 accent-primary" checked={vaccineDraftSpeciesValue(vaccine).includes(option.id)} onchange={() => setVaccineSpecies(vaccine, option.id)} />
											<span>{t(option.labelKey)}</span>
										</label>
									{/each}
								</div>
							</div>
						</form>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.emptyVaccines')}</p>
					{/each}
				{/if}
			</div>
		</section>
	{:else if activeTab === 'dewormers'}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-start gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Pill class="size-5" />
				</span>
				<div class="min-w-0 flex-1">
					<h3 class="text-base font-semibold">{t('deworming.list.title')}</h3>
					<form class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start" onsubmit={submitNewDewormer}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('deworming.name')}</span>
								<CharacterLimitHint value={newDewormerName} max={FIELD_LIMITS.dewormerName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newDewormerName} maxlength={FIELD_LIMITS.dewormerName} required />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('preventive.aliases')}</span>
								<CharacterLimitHint value={newDewormerAliases} max={FIELD_LIMITS.preventiveAliasesJson} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newDewormerAliases} maxlength={FIELD_LIMITS.preventiveAliasesJson} placeholder={t('preventive.aliasesPlaceholder')} />
						</label>
						<div class="flex min-w-0 flex-col gap-2 text-sm font-medium lg:col-span-2">
							<span>{t('preventive.species')}</span>
							<div class="flex flex-wrap gap-2">
								{#each petSpeciesOptions as option}
									<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
										<input type="checkbox" class="size-4 accent-primary" checked={newDewormerSpecies.includes(option.id)} onchange={() => (newDewormerSpecies = toggleSpeciesDraft(newDewormerSpecies, option.id))} />
										<span>{t(option.labelKey)}</span>
									</label>
								{/each}
							</div>
						</div>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Plus class="size-4" />
							{t('deworming.list.add')}
						</button>
					</form>
				</div>
			</div>

			<div class="mt-4 flex flex-col gap-3">
				{#if loading}
					<div class="h-28 animate-pulse rounded-md bg-muted"></div>
				{:else}
					{#each dewormers as dewormer (dewormer.id)}
						<form class="grid gap-3 rounded-md border border-border bg-background p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] xl:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingDewormer(dewormer); }}>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t('deworming.name')}</span>
									<CharacterLimitHint value={dewormerDraftNames[dewormer.id] ?? dewormer.name} max={FIELD_LIMITS.dewormerName} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dewormerDraftNames[dewormer.id] ?? dewormer.name} maxlength={FIELD_LIMITS.dewormerName} required oninput={(event) => (dewormerDraftNames = { ...dewormerDraftNames, [dewormer.id]: inputValue(event) })} />
							</label>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t('preventive.aliases')}</span>
									<CharacterLimitHint value={dewormerDraftAliases[dewormer.id] ?? aliasDraft(dewormer.aliases)} max={FIELD_LIMITS.preventiveAliasesJson} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dewormerDraftAliases[dewormer.id] ?? aliasDraft(dewormer.aliases)} maxlength={FIELD_LIMITS.preventiveAliasesJson} placeholder={t('preventive.aliasesPlaceholder')} oninput={(event) => (dewormerDraftAliases = { ...dewormerDraftAliases, [dewormer.id]: inputValue(event) })} />
							</label>
							<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
								<Save class="size-4" />
								{t('actions.save')}
							</button>
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={dewormer.hiddenAt ? t('deworming.list.show') : t('deworming.list.hide')} onclick={() => void toggleDewormerHidden(dewormer)}>
								{#if dewormer.hiddenAt}
									<Eye class="size-4" />
									{t('deworming.list.show')}
								{:else}
									<EyeOff class="size-4" />
									{t('deworming.list.hide')}
								{/if}
							</button>
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteDewormer(dewormer)}>
								<Trash2 class="size-4" />
								{t('actions.delete')}
							</button>
							<div class="flex min-w-0 flex-col gap-2 text-sm font-medium xl:col-span-5">
								<span>{t('preventive.species')}: <span class="font-normal text-muted-foreground">{speciesSummary(dewormerDraftSpeciesValue(dewormer))}</span></span>
								<div class="flex flex-wrap gap-2">
									{#each petSpeciesOptions as option}
										<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
											<input type="checkbox" class="size-4 accent-primary" checked={dewormerDraftSpeciesValue(dewormer).includes(option.id)} onchange={() => setDewormerSpecies(dewormer, option.id)} />
											<span>{t(option.labelKey)}</span>
										</label>
									{/each}
								</div>
							</div>
						</form>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('deworming.emptyDewormers')}</p>
					{/each}
				{/if}
			</div>
		</section>
	{:else}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-start gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<ScrollText class="size-5" />
				</span>
				<div class="min-w-0 flex-1">
					<h3 class="text-base font-semibold">{t('protocol.title')}</h3>
					<form class="mt-4 grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]" onsubmit={submitNewProtocol}>
						<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<label for="new-protocol-kind">{t('protocol.kind')}</label>
							<Select id="new-protocol-kind" bind:value={newProtocolKind} options={kindOptions()} onchange={handleNewProtocolKindChange} />
						</div>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('protocol.name')}</span>
								<CharacterLimitHint value={newProtocolName} max={FIELD_LIMITS.preventiveProtocolName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newProtocolName} maxlength={FIELD_LIMITS.preventiveProtocolName} required />
						</label>

						<div class="lg:col-span-2 flex min-w-0 flex-col gap-2 text-sm font-medium">
							<span>{t('preventive.species')}</span>
							<div class="flex flex-wrap gap-2">
								{#each petSpeciesOptions as option}
									<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
										<input type="checkbox" class="size-4 accent-primary" checked={newProtocolSpecies.includes(option.id)} onchange={() => setNewProtocolSpecies(option.id)} />
										<span>{t(option.labelKey)}</span>
									</label>
								{/each}
							</div>
						</div>

						<div class="lg:col-span-2 flex min-w-0 flex-col gap-2 text-sm font-medium">
							<span>{t('protocol.items')}</span>
							<div class="flex flex-wrap gap-2">
								{#each visibleCatalogItemsForSpecies(newProtocolKind, newProtocolSpecies) as item (item.id)}
									<button type="button" class="inline-flex h-8 max-w-full items-center rounded-md border px-3 text-sm transition-colors {newProtocolItemIds.includes(item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent'}" aria-pressed={newProtocolItemIds.includes(item.id)} onclick={() => toggleNewProtocolItem(item.id)}>
										<span class="truncate">{item.name}</span>
									</button>
								{:else}
									<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.noItems')}</p>
								{/each}
							</div>
						</div>

						<div class="lg:col-span-2 flex min-w-0 flex-col gap-1 text-sm font-medium">
							<label for="new-protocol-observation">{t('protocol.observation')}</label>
							<Textarea id="new-protocol-observation" bind:value={newProtocolObservation} ariaLabel={t('protocol.observation')} maxLength={FIELD_LIMITS.preventiveProtocolObservation} class="min-h-24" />
						</div>

						<button type="submit" class="lg:col-span-2 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Plus class="size-4" />
							{t('protocol.add')}
						</button>
					</form>
				</div>
			</div>

			<div class="mt-5 flex flex-col gap-4">
				{#if loading}
					<div class="h-32 animate-pulse rounded-md bg-muted"></div>
				{:else}
					{#each protocols as protocol (protocol.id)}
						<div class="rounded-md border border-border bg-background p-3">
							<form class="grid gap-3 lg:grid-cols-[8rem_minmax(0,1fr)_auto_auto_auto] lg:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingProtocol(protocol); }}>
								<p class="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-medium text-muted-foreground">{kindLabel(protocol.kind)}</p>
								<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
									<span class="flex min-w-0 items-baseline justify-between gap-2">
										<span>{t('protocol.name')}</span>
										<CharacterLimitHint value={protocolDraftName(protocol)} max={FIELD_LIMITS.preventiveProtocolName} />
									</span>
									<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={protocolDraftName(protocol)} maxlength={FIELD_LIMITS.preventiveProtocolName} required oninput={(event) => (protocolDraftNames = { ...protocolDraftNames, [protocol.id]: inputValue(event) })} />
								</label>
								<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
									<Save class="size-4" />
									{t('actions.save')}
								</button>
								<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={protocol.hiddenAt ? t('protocol.show') : t('protocol.hide')} onclick={() => void toggleProtocolHidden(protocol)}>
									{#if protocol.hiddenAt}
										<Eye class="size-4" />
										{t('protocol.show')}
									{:else}
										<EyeOff class="size-4" />
										{t('protocol.hide')}
									{/if}
								</button>
								<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteProtocol(protocol)}>
									<Trash2 class="size-4" />
									{t('actions.delete')}
								</button>

								<div class="lg:col-span-5 flex min-w-0 flex-col gap-2 text-sm font-medium">
									<span>{t('preventive.species')}: <span class="font-normal text-muted-foreground">{speciesSummary(protocolDraftSpeciesValue(protocol))}</span></span>
									<div class="flex flex-wrap gap-2">
										{#each petSpeciesOptions as option}
											<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
												<input type="checkbox" class="size-4 accent-primary" checked={protocolDraftSpeciesValue(protocol).includes(option.id)} onchange={() => setProtocolSpecies(protocol, option.id)} />
												<span>{t(option.labelKey)}</span>
											</label>
										{/each}
									</div>
								</div>

								<div class="lg:col-span-5 flex min-w-0 flex-col gap-2 text-sm font-medium">
									<span>{t('protocol.items')}</span>
									<div class="flex flex-wrap gap-2">
										{#each protocolCatalogItems(protocol) as item (item.id)}
											{@const selected = selectedItemIds(protocol).includes(item.id)}
											<button type="button" class="inline-flex h-8 max-w-full items-center rounded-md border px-3 text-sm transition-colors {selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent'} {item.hiddenAt ? 'opacity-60' : ''}" aria-pressed={selected} onclick={() => toggleProtocolItem(protocol, item.id)}>
												<span class="truncate">{item.name}</span>
											</button>
										{:else}
											<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.noItems')}</p>
										{/each}
									</div>
								</div>

								<div class="lg:col-span-5 flex min-w-0 flex-col gap-1 text-sm font-medium">
									<label for={`protocol-observation-${protocol.id}`}>{t('protocol.observation')}</label>
									<Textarea id={`protocol-observation-${protocol.id}`} value={protocolDraftObservation(protocol)} oninput={(value) => setProtocolObservation(protocol.id, value)} ariaLabel={t('protocol.observation')} maxLength={FIELD_LIMITS.preventiveProtocolObservation} class="min-h-20" />
								</div>
							</form>

							<div class="mt-4 border-t border-border pt-4">
								<h4 class="text-sm font-semibold">{t('protocol.doseTitle')}</h4>
								<form class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end" onsubmit={(event) => void addProtocolDose(event, protocol)}>
									<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
										<span>{t('protocol.doseText')}</span>
										<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newDoseDoses[protocol.id] ?? ''} maxlength={FIELD_LIMITS.preventiveProtocolDose} required oninput={(event) => setNewDose(protocol.id, inputValue(event))} />
									</label>
									<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
										<span>{t('protocol.doseValidity')}</span>
										<PeriodField value={newDoseValidityValues[protocol.id] ?? 12} unit={newDoseValidityUnits[protocol.id] ?? 'months'} ariaLabel={t('protocol.doseValidity')} onChange={(value, unit) => setNewDoseValidity(protocol.id, value, unit)} />
									</label>
									<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
										<Plus class="size-4" />
										{t('protocol.doseAdd')}
									</button>
								</form>

								<div class="mt-3 flex flex-col gap-3">
									{#each protocol.doses as protocolDose (protocolDose.id)}
										<form class="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto_auto] lg:items-end" onsubmit={(event) => void saveExistingProtocolDose(event, protocol, protocolDose)}>
											<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
												<span>{t('protocol.doseText')}</span>
												<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={doseDraftDoses[protocolDose.id] ?? protocolDose.dose} maxlength={FIELD_LIMITS.preventiveProtocolDose} required oninput={(event) => (doseDraftDoses = { ...doseDraftDoses, [protocolDose.id]: inputValue(event) })} />
											</label>
											<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
												<span>{t('protocol.doseValidity')}</span>
												<PeriodField value={doseDraftValidityValues[protocolDose.id] ?? protocolDose.validityValue} unit={doseDraftValidityUnits[protocolDose.id] ?? protocolDose.validityUnit} ariaLabel={t('protocol.doseValidity')} onChange={(value, unit) => setDoseValidity(protocolDose.id, value, unit)} />
											</label>
											<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
												<Save class="size-4" />
												{t('actions.save')}
											</button>
											<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteProtocolDose(protocol, protocolDose)}>
												<Trash2 class="size-4" />
												{t('actions.delete')}
											</button>
										</form>
									{:else}
										<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.doseEmpty')}</p>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.empty')}</p>
					{/each}
				{/if}
			</div>
		</section>
	{/if}
</section>

<TrashRemovalDialog open={protocolPendingRemoval !== null} messageKey="protocol.deleteConfirm" confirming={saving} onConfirm={() => void confirmProtocolRemoval()} onCancel={cancelProtocolRemoval} />