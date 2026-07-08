<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import PetTaxonomyPicker from '$lib/components/pet/PetTaxonomyPicker.svelte';
	import type { Owner } from '$lib/domain/owner/owner.js';
	import type { Pet, PetInput, PetSex } from '$lib/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '$lib/domain/pet/taxonomy.js';
	import { normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { t } from '$lib/i18n/index.js';
	import { loadOwnerProfile, searchOwners } from '$lib/services/owner.service.js';
	import { saveNewPet } from '$lib/services/pet.service.js';
	import Save from '@lucide/svelte/icons/save';
	import Search from '@lucide/svelte/icons/search';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	type PetForm = Omit<PetInput, 'sex'> & { sex: '' | Exclude<PetSex, null> };

	let owners = $state<Owner[]>([]);
	let ownerQuery = $state('');
	let selectedOwnerId = $state<number | null>(null);
	let selectedOwnerName = $state('');
	let ownerPets = $state<Pet[]>([]);
	let form = $state<PetForm>({ name: '', birthDate: '', species: null, breed: null, sex: '' });
	let ownersLoading = $state(false);
	let ownerPetsLoading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let ownerListElement = $state<HTMLDivElement>();
	let ownerPetListElement = $state<HTMLDivElement>();
	let ownerListHasMoreBelow = $state(false);
	let ownerPetListHasMoreBelow = $state(false);

	const busy = $derived(saving || ownerPetsLoading);
	const canContinue = $derived(selectedOwnerId !== null);

	async function loadOwners() {
		const query = ownerQuery;
		ownersLoading = true;
		error = null;

		try {
			const result = await searchOwners(query);
			if (ownerQuery === query) owners = result;
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			if (ownerQuery === query) ownersLoading = false;
		}
	}

	async function selectOwner(owner: Owner) {
		selectedOwnerId = owner.id;
		selectedOwnerName = owner.name;
		ownerPets = [];
		error = null;
		ownerPetsLoading = true;

		const ownerId = owner.id;
		try {
			const profile = await loadOwnerProfile(ownerId);
			if (selectedOwnerId === ownerId) {
				selectedOwnerName = profile.owner.name;
				ownerPets = profile.pets;
			}
		} catch (exception) {
			if (selectedOwnerId === ownerId) error = errorMessage(exception);
		} finally {
			if (selectedOwnerId === ownerId) ownerPetsLoading = false;
		}
	}

	function ownerSubtitle(owner: Owner): string {
		const contact = owner.contacts.find((item) => item.value.trim().length > 0);
		if (contact) return contact.kind === 'other' && contact.label.trim().length > 0 ? `${contact.label}: ${contact.value}` : contact.value;

		const responsible = owner.additionalResponsibles.find((item) => item.name.trim().length > 0);
		if (responsible) return responsible.name;

		const additionalInformation = owner.additionalInformation?.trim();
		if (additionalInformation) return additionalInformation;

		const location = [owner.city?.trim(), owner.state?.trim()].filter(Boolean).join(' · ');
		return location || t('common.notInformed');
	}

	function resultCountLabel(count: number): string {
		return t(count === 1 ? 'search.resultCountOne' : 'search.resultCount').replace('{count}', String(count));
	}

	function updateScrollableHint(element: HTMLDivElement | undefined, setValue: (value: boolean) => void) {
		if (!element) {
			setValue(false);
			return;
		}

		setValue(element.scrollTop + element.clientHeight < element.scrollHeight - 2);
	}

	function updateOwnerListScrollHint() {
		updateScrollableHint(ownerListElement, (value) => (ownerListHasMoreBelow = value));
	}

	function updateOwnerPetListScrollHint() {
		updateScrollableHint(ownerPetListElement, (value) => (ownerPetListHasMoreBelow = value));
	}

	async function refreshScrollHints() {
		await tick();
		updateOwnerListScrollHint();
		updateOwnerPetListScrollHint();
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
		if (selectedOwnerId === null) {
			error = t('pet.ownerRequired');
			return;
		}

		saving = true;
		error = null;

		try {
			const pet = await saveNewPet(selectedOwnerId, toInput());
			await goto(`/pets/${pet.id}`);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void loadOwners();
	});

	$effect(() => {
		owners.length;
		ownerPets.length;
		ownerPetsLoading;
		void refreshScrollHints();
	});
</script>

<svelte:window onresize={refreshScrollHints} />

<svelte:head>
	<title>{t('pet.titleNew')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('pet.titleNew')}</h2>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<UserPlus class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('pet.ownerSelectTitle')}</h3>

				<div class="mt-4">
					<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('pet.ownerSearch')}</span>
								<CharacterLimitHint value={ownerQuery} max={FIELD_LIMITS.searchQuery} />
							</span>
							<span class="relative">
								<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<input class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder={t('pet.ownerSearchPlaceholder')} bind:value={ownerQuery} maxlength={FIELD_LIMITS.searchQuery} disabled={busy} oninput={() => void loadOwners()} />
							</span>
						</label>

						<p class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm">
							{resultCountLabel(owners.length)}
						</p>
					</div>

					<div class="relative mt-4">
						<div bind:this={ownerListElement} class="grid max-h-[min(18rem,calc(100vh-20rem))] gap-2 overflow-y-scroll pr-3 scrollbar-gutter-stable" onscroll={updateOwnerListScrollHint}>
							{#each owners as owner (owner.id)}
								<button type="button" class="flex min-w-0 cursor-pointer items-start gap-3 rounded-md border p-3 text-left shadow-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-50 {selectedOwnerId === owner.id ? 'border-primary bg-accent' : 'border-border bg-background'}" disabled={busy} aria-pressed={selectedOwnerId === owner.id} onclick={() => void selectOwner(owner)}>
									<OwnerAvatar avatarBytes={owner.avatarBytes} ownerName={owner.name} className="mt-0.5 size-10" iconClass="size-5 text-primary" />
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium">{owner.name}</span>
										<span class="block truncate text-xs text-muted-foreground">{t('search.kind.owner')} · {ownerSubtitle(owner)}</span>
									</span>
								</button>
							{:else}
								{#if !ownersLoading}
									<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{ownerQuery.trim().length > 0 ? t('search.empty') : t('pet.ownerSelectEmpty')}</p>
								{/if}
							{/each}
						</div>

						{#if ownerListHasMoreBelow}
							<div class="pointer-events-none absolute bottom-0 left-0 right-5 h-20 rounded-b-md bg-linear-to-t from-card via-card/90 to-transparent"></div>
						{/if}
					</div>
				</div>

				{#if ownersLoading}
					<p class="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('common.loading')}</p>
				{/if}
			</div>
		</div>
	</section>

	{#if canContinue}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<h3 class="text-base font-semibold">{t('owner.petsSection')}</h3>

			<div class="relative mt-4">
				<div bind:this={ownerPetListElement} class="flex max-h-[min(18rem,calc(100vh-20rem))] flex-col gap-2 overflow-y-scroll pr-3 scrollbar-gutter-stable" onscroll={updateOwnerPetListScrollHint}>
					{#if ownerPetsLoading}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('common.loading')}</p>
					{:else}
						{#each ownerPets as pet}
							<a href={`/pets/${pet.id}`} class="flex min-w-0 items-center gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
								<PetAvatar avatarBytes={pet.avatarBytes} petName={pet.name} className="size-11" iconClass="size-5 text-primary" />
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-medium">{pet.name}</span>
									<span class="block truncate text-xs text-muted-foreground">{petTaxonomyLabel(pet)}</span>
								</span>
							</a>
						{:else}
							<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.emptyPets')}</p>
						{/each}
					{/if}
				</div>

				{#if ownerPetListHasMoreBelow}
					<div class="pointer-events-none absolute bottom-0 left-0 right-5 h-20 rounded-b-md bg-linear-to-t from-card via-card/90 to-transparent"></div>
				{/if}
			</div>
		</section>

		<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
			<h3 class="text-base font-semibold">{t('pet.createSection')}</h3>
			<p class="mt-1 text-sm text-muted-foreground">{selectedOwnerName || t('owner.profileTitle')}</p>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
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
	{:else}
		<p class="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t('pet.selectOwnerFirst')}</p>
	{/if}
</section>
