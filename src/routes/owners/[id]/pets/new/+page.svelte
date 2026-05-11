<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PetTaxonomyPicker from '$lib/components/pet/PetTaxonomyPicker.svelte';
	import type { PetInput, PetSex } from '$lib/domain/pet/pet.js';
	import { normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { t } from '$lib/i18n/index.js';
	import { loadOwnerProfile } from '$lib/services/owner.service.js';
	import { saveNewPet } from '$lib/services/pet.service.js';
	import Save from '@lucide/svelte/icons/save';

	type PetForm = Omit<PetInput, 'sex'> & { sex: '' | Exclude<PetSex, null> };

	const ownerId = $derived(Number(page.params.id));
	let ownerName = $state('');
	let form = $state<PetForm>({ name: '', birthDate: '', species: null, breed: null, sex: '' });
	let saving = $state(false);
	let error = $state<string | null>(null);

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

	function errorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'date_invalid') return t('date.invalid');
		if (exception instanceof Error && exception.message === 'pet_taxonomy_invalid') return t('pet.taxonomyInvalid');
		return exception instanceof Error ? exception.message : String(exception);
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		try {
			const pet = await saveNewPet(ownerId, toInput());
			await goto(`/owners/${ownerId}/pets/${pet.id}`);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
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

	<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
				<span>{t('pet.name')}</span>
				<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} required />
			</label>

			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('pet.birthDate')}</span>
				<DateField bind:value={form.birthDate} ariaLabel={t('pet.birthDate')} />
			</label>


			<div class="sm:col-span-2">
				<PetTaxonomyPicker bind:species={form.species} bind:breed={form.breed} bind:sex={form.sex} disabled={saving} />
			</div>
		</div>

		<button type="submit" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
			<Save class="size-4" />
			{t('actions.createPet')}
		</button>
	</form>
</section>