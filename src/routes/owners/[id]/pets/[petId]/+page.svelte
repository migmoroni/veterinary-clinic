<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PetTaxonomyPicker from '$lib/components/pet/PetTaxonomyPicker.svelte';
	import VaccinationPanel from '$lib/components/pet/VaccinationPanel.svelte';
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

	function toInput(): PetInput {
		return { ...form, birthDate: normalizeDateInput(form.birthDate), breed: form.species ? form.breed : null, sex: form.sex === '' ? null : form.sex };
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
	let deleteDialogOpen = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);
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
			form = toForm(profile.pet);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			loading = false;
		}
	}

	async function submitPet(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		try {
			const pet = await savePet(petId, toInput());
			profile = profile ? { ...profile, pet } : profile;
			statusKey = 'status.saved';
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
		}
	}

	async function createRecord() {
		saving = true;
		error = null;

		try {
			const record = await saveNewRecord(petId, { title: '', description: '', admittedAt: '', dischargedAt: '' });
			await goto(`/records/${record.id}`);
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
			await goto(`/owners/${ownerId}`);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			deleting = false;
		}
	}

	onMount(() => {
		void load();
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
				<h3 class="text-base font-semibold">{t('pet.editSection')}</h3>
				<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2 lg:col-span-1">
						<span>{t('pet.name')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} required />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('pet.birthDate')}</span>
						<DateField bind:value={form.birthDate} ariaLabel={t('pet.birthDate')} />
					</label>

					<div class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('pet.ageLabel')}</span>
						<div class="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground" aria-label={t('pet.ageLabel')} title={petAgeText}>
							{petAgeText}
						</div>
					</div>

					<div class="sm:col-span-2 lg:col-span-3">
						<PetTaxonomyPicker bind:species={form.species} bind:breed={form.breed} bind:sex={form.sex} disabled={saving} />
					</div>
				</div>

				{#if statusKey}
					<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
				{/if}

				<button type="submit" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
					<Save class="size-4" />
					{t('actions.updatePet')}
				</button>
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
						<button type="button" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving} onclick={() => void createRecord()}>
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

<TrashRemovalDialog open={deleteDialogOpen} messageKey="pet.deleteConfirm" confirming={deleting} onConfirm={() => void confirmDeletePet()} onCancel={() => (deleteDialogOpen = false)} />