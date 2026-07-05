<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import AntiparasiticPanel from '$lib/components/pet/AntiparasiticPanel.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import PetAvatarEditorDialog from '$lib/components/pet/PetAvatarEditorDialog.svelte';
	import PetTaxonomyPicker from '$lib/components/pet/PetTaxonomyPicker.svelte';
	import PreventiveDueBadge from '$lib/components/pet/PreventiveDueBadge.svelte';
	import VaccinationPanel from '$lib/components/pet/VaccinationPanel.svelte';
	import UnsavedChangesDialog from '$lib/components/records/UnsavedChangesDialog.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import { getAntiparasiticTreatmentDueStatus, type PetAntiparasiticTreatment } from '$lib/domain/antiparasitic/antiparasitic.js';
	import type { MedicalRecord } from '$lib/domain/medical-record/medical-record.js';
	import type { Pet, PetInput, PetSex } from '$lib/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '$lib/domain/pet/taxonomy.js';
	import { formatDateForDisplay, formatDateForInput, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { computeAgeFromBirthDate } from '$lib/domain/shared/time.js';
	import { getVaccineDueStatus, type PetVaccination } from '$lib/domain/vaccine/vaccine.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import type { PetProfile } from '$lib/services/pet.service.js';
	import { loadPetProfile, removePet, savePet } from '$lib/services/pet.service.js';
	import { saveNewRecord } from '$lib/services/record.service.js';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import Info from '@lucide/svelte/icons/info';
	import Pill from '@lucide/svelte/icons/pill';
	import Save from '@lucide/svelte/icons/save';
	import Settings from '@lucide/svelte/icons/settings';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type PetForm = Omit<PetInput, 'sex' | 'avatarBytes'> & { sex: '' | Exclude<PetSex, null>; avatarBytes: Uint8Array | null };
	type PetPanel = 'overview' | 'records' | 'vaccines' | 'antiparasiticTreatments' | 'administrative';

	const petId = $derived(Number(page.params.petId));
	const panelItems = [
		{ id: 'overview', titleKey: 'pet.overviewSection', icon: Info },
		{ id: 'records', titleKey: 'pet.recordsSection', icon: ClipboardPenLine },
		{ id: 'vaccines', titleKey: 'pet.vaccinesSection', icon: Syringe },
		{ id: 'antiparasiticTreatments', titleKey: 'pet.antiparasiticsSection', icon: Pill },
		{ id: 'administrative', titleKey: 'pet.administrativeSection', icon: Settings }
	] satisfies { id: PetPanel; titleKey: TranslationKey; icon: typeof Info }[];

	function avatarSnapshotValue(bytes: Uint8Array | null | undefined): string {
		if (!bytes || bytes.length === 0) return 'none';

		let hash = 2166136261;
		const step = Math.max(1, Math.floor(bytes.length / 128));
		for (let index = 0; index < bytes.length; index += step) {
			hash ^= bytes[index];
			hash = Math.imul(hash, 16777619);
		}

		return `${bytes.length}:${hash >>> 0}`;
	}

	function toForm(pet: Pet): PetForm {
		return {
			name: pet.name,
			birthDate: formatDateForInput(pet.birthDate),
			species: pet.species,
			breed: pet.breed,
			sex: pet.sex ?? '',
			avatarBytes: pet.avatarBytes
		};
	}

	function snapshotForm(input: PetForm): string {
		return JSON.stringify({
			name: input.name ?? '',
			birthDate: input.birthDate ?? '',
			species: input.species ?? null,
			breed: input.breed ?? null,
			sex: input.sex ?? '',
			avatar: avatarSnapshotValue(input.avatarBytes)
		});
	}

	function toInput(): PetInput {
		return {
			...form,
			birthDate: normalizeDateInput(form.birthDate),
			breed: form.species ? form.breed : null,
			sex: form.sex === '' ? null : form.sex,
			avatarBytes: form.avatarBytes
		};
	}

	function hrefFromUrl(url: URL): string {
		return `${url.pathname}${url.search}${url.hash}`;
	}

	function errorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'date_invalid') return t('date.invalid');
		if (exception instanceof Error && exception.message === 'pet_taxonomy_invalid') return t('pet.taxonomyInvalid');
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') return t('form.limitExceeded');
		if (exception instanceof Error && exception.message === 'field_required') return t('form.fieldRequired');
		return exception instanceof Error ? exception.message : String(exception);
	}

	function sexLabel(sex: PetSex): string {
		if (sex === 'M') return t('pet.sexMale');
		if (sex === 'F') return t('pet.sexFemale');
		return t('pet.sexUnknown');
	}

	function ageUnitKey(unit: 'year' | 'month' | 'day', value: number): TranslationKey {
		if (unit === 'year') return value === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural';
		if (unit === 'month') return value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural';
		return value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural';
	}

	function taxonomyLabel(pet: Pet): string {
		const species = getPetSpeciesOption(pet.species);
		const breed = getPetBreedOption(pet.breed);
		const parts = [species ? t(species.labelKey) : (pet.species?.trim() || null), breed ? t(breed.labelKey) : (pet.breed?.trim() || null)].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : t('common.notInformed');
	}

	function recordPeriodLabel(record: Pick<MedicalRecord, 'admittedAt' | 'dischargedAt'>): string {
		const admittedAt = formatDateForDisplay(record.admittedAt, i18n.locale);
		const dischargedAt = formatDateForDisplay(record.dischargedAt, i18n.locale);
		if (admittedAt && dischargedAt) return `${admittedAt} - ${dischargedAt}`;
		return admittedAt || dischargedAt || t('common.notInformed');
	}

	function recordEditedSortValue(record: MedicalRecord): string {
		return record.updatedAt ?? record.dischargedAt ?? record.admittedAt ?? '';
	}

	function recordEditedLabel(record: MedicalRecord): string {
		return formatDateForDisplay(recordEditedSortValue(record), i18n.locale) || t('common.notInformed');
	}

	function latestAppliedDate(items: { appliedAt: string }[]): string | null {
		return items.reduce<string | null>((latest, item) => (!latest || item.appliedAt > latest ? item.appliedAt : latest), null);
	}

	function vaccinationOverviewLabel(vaccination: PetVaccination): string {
		return vaccination.dose;
	}

	let profile = $state<PetProfile | null>(null);
	let form = $state<PetForm>({ name: '', birthDate: '', species: null, breed: null, sex: '', avatarBytes: null });
	let activePanel = $state<PetPanel>('overview');
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let editing = $state(false);
	let avatarDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let unsavedDialogOpen = $state(false);
	let pendingNavigationHref = $state<string | null>(null);
	let pendingCancelEdit = $state(false);
	let savedSnapshot = $state('');
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);
	let allowNavigation = false;

	const currentSnapshot = $derived(snapshotForm(form));
	const hasUnsavedChanges = $derived(editing && Boolean(profile) && !loading && currentSnapshot !== savedSnapshot);
	const lastEditedRecord = $derived.by(() => {
		if (!profile) return null;
		return [...profile.records].sort((first, second) => recordEditedSortValue(second).localeCompare(recordEditedSortValue(first)) || second.id - first.id)[0] ?? null;
	});
	const latestVaccinationDate = $derived(profile ? latestAppliedDate(profile.vaccinations) : null);
	const latestVaccinations = $derived(
		profile && latestVaccinationDate
			? profile.vaccinations.filter((vaccination) => vaccination.appliedAt === latestVaccinationDate).sort((first, second) => first.vaccineName.localeCompare(second.vaccineName) || first.id - second.id)
			: []
	);
	const latestAntiparasiticTreatmentDate = $derived(profile ? latestAppliedDate(profile.antiparasiticTreatments) : null);
	const latestAntiparasiticTreatments = $derived(
		profile && latestAntiparasiticTreatmentDate
			? profile.antiparasiticTreatments.filter((antiparasiticTreatment) => antiparasiticTreatment.appliedAt === latestAntiparasiticTreatmentDate).sort((first, second) => first.antiparasiticName.localeCompare(second.antiparasiticName) || first.id - second.id)
			: []
	);

	const petAgeText = $derived.by(() => {
		const age = computeAgeFromBirthDate(form.birthDate);
		if (!age) return t('pet.ageNotInformed');

		return `${age.years} ${t(ageUnitKey('year', age.years))}, ${age.months} ${t(ageUnitKey('month', age.months))} ${t('common.and')} ${age.days} ${t(ageUnitKey('day', age.days))}`;
	});

	async function load() {
		loading = true;
		error = null;

		try {
			profile = await loadPetProfile(petId);
			const loadedForm = toForm(profile.pet);
			form = loadedForm;
			savedSnapshot = snapshotForm(loadedForm);
			editing = false;
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			loading = false;
		}
	}

	function startEditing() {
		if (!profile) return;
		const nextForm = toForm(profile.pet);
		form = nextForm;
		savedSnapshot = snapshotForm(nextForm);
		statusKey = null;
		error = null;
		editing = true;
	}

	function requestCancelEditing() {
		if (!editing || !profile) return;

		if (!hasUnsavedChanges) {
			const nextForm = toForm(profile.pet);
			form = nextForm;
			savedSnapshot = snapshotForm(nextForm);
			statusKey = null;
			editing = false;
			return;
		}

		pendingNavigationHref = null;
		pendingCancelEdit = true;
		unsavedDialogOpen = true;
	}

	function resetUnsavedState() {
		unsavedDialogOpen = false;
		pendingNavigationHref = null;
		pendingCancelEdit = false;
	}

	function openAvatarDialog() {
		if (!editing || saving) return;
		avatarDialogOpen = true;
	}

	function closeAvatarDialog() {
		avatarDialogOpen = false;
	}

	function applyAvatar(bytes: Uint8Array) {
		form = { ...form, avatarBytes: bytes };
		statusKey = null;
		avatarDialogOpen = false;
	}

	function removeAvatar() {
		form = { ...form, avatarBytes: null };
		statusKey = null;
		avatarDialogOpen = false;
	}

	async function navigateToHref(href: string) {
		allowNavigation = true;
		try {
			await goto(href);
		} finally {
			allowNavigation = false;
		}
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!hasUnsavedChanges) return;
		event.preventDefault();
		event.returnValue = '';
	}

	async function saveCurrentPet(showStatus: boolean): Promise<boolean> {
		if (!profile) return false;

		saving = true;
		error = null;

		try {
			const pet = await savePet(petId, toInput());
			profile = { ...profile, pet };

			const nextForm = toForm(pet);
			form = nextForm;
			savedSnapshot = snapshotForm(nextForm);
			editing = false;

			if (showStatus) statusKey = 'status.saved';
			return true;
		} catch (exception) {
			error = errorMessage(exception);
			return false;
		} finally {
			saving = false;
		}
	}

	async function submitPet(event: SubmitEvent) {
		event.preventDefault();
		if (!editing) return;
		await saveCurrentPet(true);
	}

	async function confirmSaveAndLeave() {
		const href = pendingNavigationHref;
		const cancelEdit = pendingCancelEdit;

		const saved = await saveCurrentPet(false);
		if (!saved) {
			resetUnsavedState();
			return;
		}

		resetUnsavedState();
		if (cancelEdit || !href) return;
		await navigateToHref(href);
	}

	async function discardAndLeave() {
		const href = pendingNavigationHref;
		const cancelEdit = pendingCancelEdit;

		if (cancelEdit && profile) {
			const nextForm = toForm(profile.pet);
			form = nextForm;
			savedSnapshot = snapshotForm(nextForm);
			statusKey = null;
			editing = false;
		}

		resetUnsavedState();
		if (!href) return;
		await navigateToHref(href);
	}

	function cancelLeave() {
		resetUnsavedState();
	}

	async function createRecord() {
		if (editing) return;

		saving = true;
		error = null;

		try {
			const record = await saveNewRecord(petId, { title: '', description: '', admittedAt: '', dischargedAt: '' });
			await navigateToHref(`/records/${record.id}`);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
		}
	}

	function updateVaccinations(vaccinations: PetVaccination[]) {
		if (!profile) return;
		profile = { ...profile, vaccinations };
	}

	function updateAntiparasiticTreatments(antiparasiticTreatments: PetAntiparasiticTreatment[]) {
		if (!profile) return;
		profile = { ...profile, antiparasiticTreatments };
	}

	function selectPanel(panel: PetPanel) {
		activePanel = panel;
	}

	function requestDeletePet() {
		deleteDialogOpen = true;
	}

	async function confirmDeletePet() {
		deleting = true;
		error = null;

		try {
			await removePet(petId);
			deleteDialogOpen = false;
			await navigateToHref('/search');
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			deleting = false;
		}
	}

	beforeNavigate((navigation) => {
		if (allowNavigation || loading || !profile || !hasUnsavedChanges) return;
		if (!navigation.to?.url) {
			navigation.cancel();
			return;
		}

		const href = hrefFromUrl(navigation.to.url);
		navigation.cancel();
		pendingCancelEdit = false;
		pendingNavigationHref = href;
		unsavedDialogOpen = true;
	});

	$effect(() => {
		if (hasUnsavedChanges) statusKey = null;
	});

	onMount(() => {
		void load();
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});
</script>

<svelte:head>
	<title>{profile?.pet.name ?? t('pet.profileTitle')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			{#if profile}
				<div class="flex flex-wrap gap-2">
					{#each profile.owners as owner}
						<a href={`/owners/${owner.id}`} aria-label={`${t('actions.openOwner')}: ${owner.name}`} class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent">
							<OwnerAvatar avatarBytes={owner.avatarBytes} ownerName={owner.name} className="size-6" iconClass="size-3.5 text-primary" />
							<span class="shrink-0 text-xs font-semibold uppercase text-muted-foreground">{t('owner.contextLabel')}</span>
							<span class="truncate text-primary">{owner.name}</span>
						</a>
					{:else}
						<span class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm">
							<OwnerAvatar avatarBytes={null} ownerName={t('owner.unassigned')} className="size-6" iconClass="size-3.5 text-primary" />
							<span class="shrink-0 text-xs font-semibold uppercase">{t('owner.contextLabel')}</span>
							<span class="truncate">{t('owner.unassigned')}</span>
						</span>
					{/each}
				</div>
			{/if}
			<h2 class="mt-1 truncate text-2xl font-semibold sm:text-3xl">{profile?.pet.name ?? t('common.loading')}</h2>
			{#if profile}
				<p class="mt-1 text-sm text-muted-foreground">{sexLabel(profile.pet.sex)} · {taxonomyLabel(profile.pet)}</p>
			{/if}
		</div>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if loading}
		<div class="h-64 animate-pulse rounded-md bg-muted"></div>
	{:else if profile}
		<div class="grid min-w-0 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
			<aside class="border border-border bg-card p-2 shadow-sm lg:sticky lg:top-5 lg:border-r lg:border-l-0 lg:border-y-0 lg:bg-transparent lg:p-0 lg:pr-3 lg:shadow-none">
				<div class="grid gap-1" role="tablist" aria-label={t('pet.profileSections')}>
					{#each panelItems as item}
						{@const Icon = item.icon}
						<button
							class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors {activePanel === item.id ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
							type="button"
							role="tab"
							aria-selected={activePanel === item.id}
							onclick={() => selectPanel(item.id)}
						>
							<span class="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background {activePanel === item.id ? 'text-primary' : 'text-muted-foreground'}">
								<Icon class="size-4" />
							</span>
							<span class="min-w-0 truncate text-sm font-semibold">{t(item.titleKey)}</span>
						</button>
					{/each}
				</div>
			</aside>

			<div class="min-w-0">
				{#if activePanel === 'overview'}
					<div class="flex flex-col gap-5" role="tabpanel">
						<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submitPet}>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<h3 class="text-base font-semibold">{t('pet.editSection')}</h3>
								{#if editing}
									<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={requestCancelEditing}>
										{t('actions.cancel')}
									</button>
								{:else}
									<button type="button" class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent" onclick={startEditing}>
										{t('actions.edit')}
									</button>
								{/if}
							</div>
							<div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
								<PetAvatar avatarBytes={form.avatarBytes} petName={form.name} className="size-24 border border-border shadow-sm" iconClass="size-10 text-muted-foreground" />
								{#if editing}
									<div class="flex min-w-0 flex-col gap-1.5">
										<p class="text-sm font-semibold">{t('pet.avatarLabel')}</p>
										<div class="flex flex-wrap gap-2">
											<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={openAvatarDialog}>
												{t('pet.avatarEdit')}
											</button>
											{#if form.avatarBytes}
												<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={removeAvatar}>
													{t('pet.avatarRemove')}
												</button>
											{/if}
										</div>
									</div>
								{/if}
							</div>
							<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2 xl:col-span-1">
									<span class="flex min-w-0 items-baseline justify-between gap-2">
										<span>{t('pet.name')}</span>
										{#if editing}<CharacterLimitHint value={form.name} max={FIELD_LIMITS.petName} />{/if}
									</span>
									<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} maxlength={FIELD_LIMITS.petName} disabled={!editing} required />
								</label>

								<label class="flex flex-col gap-1 text-sm font-medium">
									<span>{t('pet.birthDate')}</span>
									{#if editing}
										<DateField bind:value={form.birthDate} ariaLabel={t('pet.birthDate')} />
									{:else}
										<div class="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground" aria-label={t('pet.birthDate')}>
											{formatDateForDisplay(form.birthDate, i18n.locale) || t('common.notInformed')}
										</div>
									{/if}
								</label>

								<div class="flex flex-col gap-1 text-sm font-medium">
									<span>{t('pet.ageLabel')}</span>
									<div class="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground" aria-label={t('pet.ageLabel')} title={petAgeText}>
										{petAgeText}
									</div>
								</div>

								<div class="sm:col-span-2 xl:col-span-3">
									<PetTaxonomyPicker bind:species={form.species} bind:breed={form.breed} bind:sex={form.sex} disabled={saving || !editing} />
								</div>
							</div>

							{#if statusKey}
								<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
							{/if}

							{#if editing}
								<div class="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
									<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
										<Save class="size-4" />
										{saving ? t('record.saving') : t('actions.updatePet')}
									</button>

									{#if hasUnsavedChanges}
										<span class="text-xs font-medium text-muted-foreground">{t('record.unsavedChanges')}</span>
									{/if}
								</div>
							{/if}
						</form>

						<div class="grid gap-4 xl:grid-cols-3">
							<section class="rounded-md border border-border bg-card p-4 shadow-sm">
								<h3 class="text-sm font-semibold">{t('pet.lastRecord')}</h3>
								{#if lastEditedRecord}
									<a href={`/records/${lastEditedRecord.id}`} class="mt-3 flex items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
										<ClipboardPenLine class="mt-0.5 size-4 shrink-0 text-primary" />
										<span class="min-w-0">
											<span class="block truncate text-sm font-medium">{lastEditedRecord.title}</span>
											<span class="block truncate text-xs text-muted-foreground">{t('pet.lastEditedAt')}: {recordEditedLabel(lastEditedRecord)}</span>
											<span class="block truncate text-xs text-muted-foreground">{recordPeriodLabel(lastEditedRecord)}</span>
										</span>
									</a>
								{:else}
									<p class="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('pet.noRecentRecord')}</p>
								{/if}
							</section>

							<section class="rounded-md border border-border bg-card p-4 shadow-sm">
								<h3 class="text-sm font-semibold">{t('pet.latestVaccines')}</h3>
								{#if latestVaccinationDate && latestVaccinations.length > 0}
									<p class="mt-2 text-xs font-medium text-muted-foreground">{formatDateForDisplay(latestVaccinationDate, i18n.locale)}</p>
									<div class="mt-3 flex flex-col gap-2">
										{#each latestVaccinations as vaccination}
											<div class="flex items-start gap-3 rounded-md border border-border bg-background p-3">
												<Syringe class="mt-0.5 size-4 shrink-0 text-primary" />
												<span class="min-w-0">
													<span class="block truncate text-sm font-medium">{vaccination.vaccineName}</span>
													<span class="block truncate text-xs text-muted-foreground">{vaccinationOverviewLabel(vaccination)}</span>
													<PreventiveDueBadge kind="vaccine" status={getVaccineDueStatus(vaccination)} className="mt-2" />
												</span>
											</div>
										{/each}
									</div>
								{:else}
									<p class="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('pet.noRecentVaccines')}</p>
								{/if}
							</section>

							<section class="rounded-md border border-border bg-card p-4 shadow-sm">
								<h3 class="text-sm font-semibold">{t('pet.latestAntiparasitics')}</h3>
								{#if latestAntiparasiticTreatmentDate && latestAntiparasiticTreatments.length > 0}
									<p class="mt-2 text-xs font-medium text-muted-foreground">{formatDateForDisplay(latestAntiparasiticTreatmentDate, i18n.locale)}</p>
									<div class="mt-3 flex flex-col gap-2">
										{#each latestAntiparasiticTreatments as antiparasiticTreatment}
											<div class="flex items-start gap-3 rounded-md border border-border bg-background p-3">
												<Pill class="mt-0.5 size-4 shrink-0 text-primary" />
												<span class="min-w-0">
													<span class="block truncate text-sm font-medium">{antiparasiticTreatment.antiparasiticName}</span>
													<span class="block truncate text-xs text-muted-foreground">{antiparasiticTreatment.dose}</span>
													<PreventiveDueBadge kind="antiparasitic" status={getAntiparasiticTreatmentDueStatus(antiparasiticTreatment)} className="mt-2" />
												</span>
											</div>
										{/each}
									</div>
								{:else}
									<p class="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('pet.noRecentAntiparasitics')}</p>
								{/if}
							</section>
						</div>
					</div>
				{:else if activePanel === 'records'}
					<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<h3 class="text-base font-semibold">{t('pet.recordsSection')}</h3>
							<button type="button" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving || editing} onclick={() => void createRecord()}>
								<ClipboardPenLine class="size-4" />
								{t('actions.createRecord')}
							</button>
						</div>

						<div class="mt-4 flex flex-col gap-2">
							{#each profile.records as record}
								<a href={`/records/${record.id}`} class="flex items-start gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
									<ClipboardPenLine class="mt-0.5 size-4 shrink-0 text-primary" />
									<span class="min-w-0">
										<span class="block truncate text-sm font-medium">{record.title}</span>
										<span class="block truncate text-xs text-muted-foreground">{recordPeriodLabel(record)}</span>
									</span>
								</a>
							{:else}
								<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('record.empty')}</p>
							{/each}
						</div>
					</section>
				{:else if activePanel === 'vaccines'}
					<div role="tabpanel">
						<VaccinationPanel petId={petId} petSpecies={profile.pet.species} vaccinations={profile.vaccinations} vaccines={profile.vaccines} onChange={updateVaccinations} />
					</div>
				{:else if activePanel === 'antiparasiticTreatments'}
					<div role="tabpanel">
						<AntiparasiticPanel petId={petId} petSpecies={profile.pet.species} antiparasiticTreatments={profile.antiparasiticTreatments} antiparasitics={profile.antiparasitics} onChange={updateAntiparasiticTreatments} />
					</div>
				{:else}
					<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel">
						<h3 class="text-base font-semibold">{t('pet.administrativeSection')}</h3>
						<div class="mt-4 flex flex-wrap gap-2">
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={deleting} onclick={requestDeletePet}>
								<Trash2 class="size-4" />
								{t('actions.delete')}
							</button>
						</div>
					</section>
				{/if}
			</div>
		</div>
	{/if}
</section>

{#if avatarDialogOpen}
	<PetAvatarEditorDialog initialAvatarBytes={form.avatarBytes} onApply={applyAvatar} onRemove={removeAvatar} onClose={closeAvatarDialog} />
{/if}

<UnsavedChangesDialog
	open={unsavedDialogOpen}
	saving={saving}
	titleKey="pet.unsavedDialogTitle"
	descriptionKey="pet.unsavedDialogDescription"
	onSave={() => void confirmSaveAndLeave()}
	onDiscard={() => void discardAndLeave()}
	onCancel={cancelLeave}
/>

<TrashRemovalDialog open={deleteDialogOpen} messageKey="pet.deleteConfirm" confirming={deleting} onConfirm={() => void confirmDeletePet()} onCancel={() => (deleteDialogOpen = false)} />
