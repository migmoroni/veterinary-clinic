<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import CharacterLimitHint from '@vet/ui/components/forms/CharacterLimitHint.svelte';
	import DateField from '@vet/ui/components/forms/DateField.svelte';
	import PetAvatar from '@vet/modules/registry/components/pet/PetAvatar.svelte';
	import PetTaxonomyPicker from '@vet/modules/registry/components/pet/PetTaxonomyPicker.svelte';
	import DebouncedSearchField from '@vet/ui/components/ui/DebouncedSearchField.svelte';
	import { createLatestAsyncSearchController } from '@vet/types/domain/search/search-controller.js';
	import type { Pet, PetInput, PetSex } from '@vet/types/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '@vet/types/domain/pet/taxonomy.js';
	import { normalizeDateInput } from '@vet/types/domain/shared/date-input.js';
	import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import { loadOwnerProfile } from '@vet/modules/registry/services/owner.service.js';
	import { addExistingPetToOwner, saveNewPet, searchExistingPetsForOwner } from '@vet/modules/registry/services/pet.service.js';
	import Link from '@lucide/svelte/icons/link';
	import Save from '@lucide/svelte/icons/save';

	type PetForm = Omit<PetInput, 'sex'> & { sex: '' | Exclude<PetSex, null> };

	const ownerId = $derived(page.params.id ?? '');
	let ownerName = $state('');
	let form = $state<PetForm>({ name: '', birthDate: '', species: null, breed: null, sex: '' });
	let existingQuery = $state('');
	let existingPets = $state<Pet[]>([]);
	let searching = $state(false);
	let linkingPetId = $state<string | null>(null);
	let saving = $state(false);
	let error = $state<string | null>(null);

	const busy = $derived(saving || linkingPetId !== null);

	async function load() {
		try {
			ownerName = (await loadOwnerProfile(ownerId)).owner.name;
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	function toInput(): PetInput {
		return { ...form, birthDate: normalizeDateInput(form.birthDate), breed: form.species ? form.breed : null, sex: form.sex === '' ? null : form.sex };
	}

	function petTaxonomyLabel(pet: Pet): string {
		const species = getPetSpeciesOption(pet.species);
		const breed = getPetBreedOption(pet.breed);
		const parts = [species ? t(species.labelKey) : (pet.species?.trim() || null), breed ? t(breed.labelKey) : (pet.breed?.trim() || null)].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : t('common.notInformed');
	}

	function errorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'date_invalid') return t('date.invalid');
		if (exception instanceof Error && exception.message === 'pet_taxonomy_invalid') return t('pet.taxonomyInvalid');
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') return t('form.limitExceeded');
		if (exception instanceof Error && exception.message === 'field_required') return t('form.fieldRequired');
		return exception instanceof Error ? exception.message : String(exception);
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		try {
			const pet = await saveNewPet(ownerId, toInput());
			await goto(`/pets/${pet.id}`);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
		}
	}

	const existingPetSearchController = createLatestAsyncSearchController<Pet[]>({
		search: (value) => searchExistingPetsForOwner(ownerId, value),
		onerror: (exception) => {
			error = errorMessage(exception);
		},
		onsettled: () => {
			searching = false;
		},
		onstart: () => {
			searching = true;
			error = null;
		},
		onsuccess: (pets) => {
			existingPets = pets;
		}
	});

	async function searchExistingPets(value = existingQuery) {
		if (value.trim().length < 2) {
			existingPets = [];
			return;
		}

		await existingPetSearchController.run(value);
	}

	function clearExistingPetSearch() {
		existingPetSearchController.invalidate();
		existingPets = [];
		searching = false;
	}

	async function linkExistingPet(petId: string) {
		linkingPetId = petId;
		error = null;

		try {
			const pet = await addExistingPetToOwner(ownerId, petId);
			await goto(`/pets/${pet.id}`);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			linkingPetId = null;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('pet.titleNew')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{ownerName || t('owner.profileTitle')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('pet.titleNew')}</h2>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('pet.existingSection')}</h3>
		<DebouncedSearchField class="mt-4 gap-2" label={t('pet.existingSearchLabel')} placeholder={t('pet.existingSearchPlaceholder')} bind:value={existingQuery} maxLength={FIELD_LIMITS.searchQuery} minLength={2} showCharacterLimit disabled={busy} onsearch={(value) => void searchExistingPets(value)} onclear={clearExistingPetSearch} />

		<div class="mt-4 flex flex-col gap-2">
			{#each existingPets as pet}
				<article class="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex min-w-0 items-center gap-3">
						<PetAvatar avatarBytes={pet.avatarBytes} petName={pet.name} className="size-11" iconClass="size-5 text-primary" />
						<span class="min-w-0">
							<span class="block truncate text-sm font-medium">{pet.name}</span>
							<span class="block truncate text-xs text-muted-foreground">{petTaxonomyLabel(pet)}</span>
						</span>
					</div>
					<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={busy} onclick={() => void linkExistingPet(pet.id)}>
						<Link class="size-4" />
						{linkingPetId === pet.id ? t('common.loading') : t('pet.linkExisting')}
					</button>
				</article>
			{:else}
				{#if existingQuery.trim().length > 1 && !searching}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('pet.existingEmpty')}</p>
				{/if}
			{/each}
			{#if searching}
				<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('common.loading')}</p>
			{/if}
		</div>
	</section>

	<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
		<h3 class="text-base font-semibold">{t('pet.createSection')}</h3>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
				<span class="flex min-w-0 items-baseline justify-between gap-2">
					<span>{t('pet.name')}</span>
					<CharacterLimitHint value={form.name} max={FIELD_LIMITS.petName} />
				</span>
				<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} maxlength={FIELD_LIMITS.petName} required />
			</label>

			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('pet.birthDate')}</span>
				<DateField bind:value={form.birthDate} ariaLabel={t('pet.birthDate')} />
			</label>


			<div class="sm:col-span-2">
				<PetTaxonomyPicker bind:species={form.species} bind:breed={form.breed} bind:sex={form.sex} disabled={saving} />
			</div>
		</div>

		<button type="submit" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={busy}>
			<Save class="size-4" />
			{t('actions.createPet')}
		</button>
	</form>
</section>
