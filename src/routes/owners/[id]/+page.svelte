<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import OwnerContactsField from '$lib/components/owner/OwnerContactsField.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import type { Pet } from '$lib/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '$lib/domain/pet/taxonomy.js';
	import type { Owner, OwnerInput } from '$lib/domain/owner/owner.js';
	import type { OwnerProfile } from '$lib/services/owner.service.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { lookupCep } from '$lib/services/cep.service.js';
	import { loadOwnerProfile, removeOwner, saveOwner } from '$lib/services/owner.service.js';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Save from '@lucide/svelte/icons/save';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	function toForm(owner: Owner): OwnerInput {
		return {
			name: owner.name,
			street: owner.street ?? '',
			streetNumber: owner.streetNumber ?? '',
			addressComplement: owner.addressComplement ?? '',
			neighborhood: owner.neighborhood ?? '',
			city: owner.city ?? '',
			postalCode: owner.postalCode ?? '',
			contacts: owner.contacts.length > 0 ? owner.contacts.map((contact) => ({ kind: contact.kind, value: contact.value })) : [{ kind: 'mobile', value: '' }],
			state: owner.state ?? ''
		};
	}

	const ownerId = $derived(Number(page.params.id));
	let profile = $state<OwnerProfile | null>(null);
	let form = $state<OwnerInput>({
		name: '',
		street: '',
		streetNumber: '',
		addressComplement: '',
		neighborhood: '',
		city: '',
		postalCode: '',
		contacts: [{ kind: 'mobile', value: '' }],
		state: ''
	});
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let deleteDialogOpen = $state(false);
	let cepLoading = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);

	function petTaxonomyLabel(pet: Pet): string {
		const species = getPetSpeciesOption(pet.species);
		const breed = getPetBreedOption(pet.breed);
		const parts = [species ? t(species.labelKey) : null, breed ? t(breed.labelKey) : null].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : t('common.notInformed');
	}

	async function load() {
		loading = true;
		error = null;

		try {
			profile = await loadOwnerProfile(ownerId);
			form = toForm(profile.owner);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			loading = false;
		}
	}

	async function fillAddressFromCep() {
		cepLoading = true;
		statusKey = 'status.cepSearching';
		error = null;

		try {
			const cepAddress = await lookupCep(form.postalCode);
			if (!cepAddress) {
				statusKey = 'status.cepNotFound';
				return;
			}

			form.postalCode = cepAddress.postalCode;
			form.street = cepAddress.street;
			form.neighborhood = cepAddress.neighborhood;
			form.city = cepAddress.city;
			form.state = cepAddress.state;
			statusKey = 'status.cepFound';
		} catch (exception) {
			statusKey = exception instanceof Error && exception.message === 'cep_invalid' ? 'status.cepInvalid' : 'status.cepUnavailable';
		} finally {
			cepLoading = false;
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		try {
			const owner = await saveOwner(ownerId, form);
			profile = profile ? { ...profile, owner } : profile;
			statusKey = 'status.saved';
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			saving = false;
		}
	}

	function requestDeleteOwner() {
		deleteDialogOpen = true;
	}

	async function confirmDeleteOwner() {
		deleting = true;
		error = null;

		try {
			await removeOwner(ownerId);
			deleteDialogOpen = false;
			await goto('/settings/trash');
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			deleting = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{profile?.owner.name ?? t('owner.profileTitle')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">{t('owner.profileTitle')}</p>
			<h2 class="truncate text-2xl font-semibold sm:text-3xl">{profile?.owner.name ?? t('common.loading')}</h2>
		</div>
		<div class="flex flex-wrap gap-2">
			<a href={`/owners/${ownerId}/pets/new`} class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95">
				<UserPlus class="size-4" />
				{t('actions.addPet')}
			</a>
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={deleting} onclick={requestDeleteOwner}>
				<Trash2 class="size-4" />
				{t('actions.delete')}
			</button>
		</div>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if loading}
		<div class="h-64 animate-pulse rounded-md bg-muted"></div>
	{:else if profile}
		<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
				<h3 class="text-base font-semibold">{t('owner.editSection')}</h3>
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
						<span>{t('owner.name')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} required />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.postalCode')}</span>
						<span class="flex gap-2">
							<input class="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.postalCode} />
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={cepLoading} onclick={() => void fillAddressFromCep()} aria-label={t('actions.searchCep')}>
								<Search class="size-4" />
								{t('actions.searchCep')}
							</button>
						</span>
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.state')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.state} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
						<span>{t('owner.street')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.street} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.streetNumber')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.streetNumber} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.addressComplement')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.addressComplement} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.neighborhood')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.neighborhood} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.city')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.city} />
					</label>


					<OwnerContactsField bind:contacts={form.contacts} />
				</div>

				{#if statusKey}
					<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
				{/if}

				<button type="submit" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
					<Save class="size-4" />
					{t('actions.updateOwner')}
				</button>
			</form>

			<aside class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-base font-semibold">{t('owner.petsSection')}</h3>
					<PawPrint class="size-5 text-primary" />
				</div>

				<div class="mt-4 flex flex-col gap-2">
					{#each profile.pets as pet}
						<a href={`/owners/${ownerId}/pets/${pet.id}`} class="rounded-md border border-border bg-background p-3 hover:bg-accent">
							<span class="block truncate text-sm font-medium">{pet.name}</span>
							<span class="block truncate text-xs text-muted-foreground">{petTaxonomyLabel(pet)}</span>
						</a>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.emptyPets')}</p>
					{/each}
				</div>
			</aside>
		</div>
	{/if}
</section>

<TrashRemovalDialog open={deleteDialogOpen} messageKey="owner.deleteConfirm" confirming={deleting} onConfirm={() => void confirmDeleteOwner()} onCancel={() => (deleteDialogOpen = false)} />