<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PetTaxonomyPicker from '$lib/components/pet/PetTaxonomyPicker.svelte';
	import VaccinationPanel from '$lib/components/pet/VaccinationPanel.svelte';
	import UnsavedChangesDialog from '$lib/components/records/UnsavedChangesDialog.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import type { MedicalRecord } from '$lib/domain/medical-record/medical-record.js';
	import type { Pet, PetInput, PetSex } from '$lib/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '$lib/domain/pet/taxonomy.js';
	import { formatDateForDisplay, formatDateForInput, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { computeAgeFromBirthDate } from '$lib/domain/shared/time.js';
	import type { PetProfile } from '$lib/services/pet.service.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadPetProfile, removePet, savePet } from '$lib/services/pet.service.js';
	import { saveNewRecord } from '$lib/services/record.service.js';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import Syringe from '@lucide/svelte/icons/syringe';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type PetForm = Omit<PetInput, 'sex'> & { sex: '' | Exclude<PetSex, null> };
	type PetPanel = 'records' | 'vaccines';

	function toForm(pet: Pet): PetForm {
		return { name: pet.name, birthDate: formatDateForInput(pet.birthDate), species: pet.species, breed: pet.breed, sex: pet.sex ?? '' };
	}

	function snapshotForm(input: PetForm): string {
		return JSON.stringify({
			name: input.name ?? '',
			birthDate: input.birthDate ?? '',
			species: input.species ?? null,
			breed: input.breed ?? null,
			sex: input.sex ?? ''
		});
	}

	function toInput(): PetInput {
		return { ...form, birthDate: normalizeDateInput(form.birthDate), breed: form.species ? form.breed : null, sex: form.sex === '' ? null : form.sex };
	}

	function hrefFromUrl(url: URL): string {
		return `${url.pathname}${url.search}${url.hash}`;
	}

	function errorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'date_invalid') return t('date.invalid');
		if (exception instanceof Error && exception.message === 'pet_taxonomy_invalid') return t('pet.taxonomyInvalid');
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
		const parts = [species ? t(species.labelKey) : null, breed ? t(breed.labelKey) : null].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : t('common.notInformed');
	}

	function recordPeriodLabel(record: Pick<MedicalRecord, 'admittedAt' | 'dischargedAt'>): string {
		const admittedAt = formatDateForDisplay(record.admittedAt, i18n.locale);
		const dischargedAt = formatDateForDisplay(record.dischargedAt, i18n.locale);
		if (admittedAt && dischargedAt) return `${admittedAt} - ${dischargedAt}`;
		return admittedAt || dischargedAt || t('common.notInformed');
	}

	const ownerId = $derived(Number(page.params.id));
	const petId = $derived(Number(page.params.petId));
	let profile = $state<PetProfile | null>(null);
	let form = $state<PetForm>({ name: '', birthDate: '', species: null, breed: null, sex: '' });
	let activePanel = $state<PetPanel>('records');
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let editing = $state(false);
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
			await navigateToHref(`/owners/${ownerId}`);
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
			<a href={`/owners/${ownerId}`} aria-label={`${t('actions.openOwner')}: ${profile?.owner.name ?? t('owner.profileTitle')}`} class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent">
				<UserRound class="size-4 shrink-0 text-primary" />
				<span class="shrink-0 text-xs font-semibold uppercase text-muted-foreground">{t('owner.contextLabel')}</span>
				<span class="truncate text-primary">{profile?.owner.name ?? t('owner.profileTitle')}</span>
			</a>
			<h2 class="mt-1 truncate text-2xl font-semibold sm:text-3xl">{profile?.pet.name ?? t('common.loading')}</h2>
			{#if profile}
				<p class="mt-1 text-sm text-muted-foreground">{sexLabel(profile.pet.sex)} · {taxonomyLabel(profile.pet)}</p>
			{/if}
		</div>
		<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={deleting} onclick={requestDeletePet}>
			<Trash2 class="size-4" />
			{t('actions.delete')}
		</button>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if loading}
		<div class="h-64 animate-pulse rounded-md bg-muted"></div>
	{:else if profile}
		<div class="flex flex-col gap-5">
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
				<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2 lg:col-span-1">
						<span>{t('pet.name')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} disabled={!editing} required />
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

					<div class="sm:col-span-2 lg:col-span-3">
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

			<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1 lg:hidden" role="tablist" aria-label={t('pet.profileSections')}>
				<button
					class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activePanel === 'vaccines' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
					type="button"
					role="tab"
					aria-selected={activePanel === 'vaccines'}
					onclick={() => selectPanel('vaccines')}
				>
					<Syringe class="size-4" />
					<span class="truncate">{t('vaccine.sectionTitle')}</span>
				</button>
                <button
					class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activePanel === 'records' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
					type="button"
					role="tab"
					aria-selected={activePanel === 'records'}
					onclick={() => selectPanel('records')}
				>
					<ClipboardPenLine class="size-4" />
					<span class="truncate">{t('pet.recordsSection')}</span>
				</button>
			</div>

			<div class="grid gap-5 lg:grid-cols-2 lg:items-start">
                <section class="{activePanel === 'vaccines' ? 'block' : 'hidden'} lg:block" role="tabpanel">
					<VaccinationPanel petId={petId} vaccinations={profile.vaccinations} presets={profile.vaccinePresets} />
				</section>
				<section class="{activePanel === 'records' ? 'block' : 'hidden'} rounded-md border border-border bg-card p-4 shadow-sm sm:p-5 lg:block" role="tabpanel">
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
			</div>
		</div>
	{/if}
</section>

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