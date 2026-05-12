<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import OwnerAvatarEditorDialog from '$lib/components/owner/OwnerAvatarEditorDialog.svelte';
	import OwnerContactsField from '$lib/components/owner/OwnerContactsField.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import UnsavedChangesDialog from '$lib/components/records/UnsavedChangesDialog.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import { DEFAULT_OWNER_COUNTRY, type Owner, type OwnerContactKind, type OwnerInput } from '$lib/domain/owner/owner.js';
	import type { Pet } from '$lib/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '$lib/domain/pet/taxonomy.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { isCountrySupportedForCepLookup, lookupCep } from '$lib/services/cep.service.js';
	import { openPhoneCallForPhone, openWhatsAppForPhone } from '$lib/services/contact.service.js';
	import type { OwnerProfile } from '$lib/services/owner.service.js';
	import { loadOwnerProfile, removeOwner, saveOwner } from '$lib/services/owner.service.js';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import PhoneCall from '@lucide/svelte/icons/phone-call';
	import Save from '@lucide/svelte/icons/save';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';

type OwnerForm = OwnerInput & { avatarBytes: Uint8Array | null };

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

	function toForm(owner: Owner): OwnerForm {
		return {
			name: owner.name,
			avatarBytes: owner.avatarBytes,
			street: owner.street ?? '',
			streetNumber: owner.streetNumber ?? '',
			addressComplement: owner.addressComplement ?? '',
			neighborhood: owner.neighborhood ?? '',
			city: owner.city ?? '',
			country: owner.country ?? DEFAULT_OWNER_COUNTRY,
			postalCode: owner.postalCode ?? '',
			contacts: owner.contacts.length > 0 ? owner.contacts.map((contact) => ({ kind: contact.kind, value: contact.value })) : [{ kind: 'mobile', value: '' }],
			state: owner.state ?? ''
		};
	}

	function snapshotForm(input: OwnerForm): string {
		return JSON.stringify({
			name: input.name ?? '',
			avatar: avatarSnapshotValue(input.avatarBytes),
			street: input.street ?? '',
			streetNumber: input.streetNumber ?? '',
			addressComplement: input.addressComplement ?? '',
			neighborhood: input.neighborhood ?? '',
			city: input.city ?? '',
			country: input.country ?? '',
			postalCode: input.postalCode ?? '',
			contacts: input.contacts.map((contact) => ({ kind: contact.kind, value: contact.value.trim() })),
			state: input.state ?? ''
		});
	}

	function hrefFromUrl(url: URL): string {
		return `${url.pathname}${url.search}${url.hash}`;
	}

	function contactKindLabelKey(kind: OwnerContactKind): TranslationKey {
		return `owner.contactKind.${kind}` as TranslationKey;
	}

	function canOpenWhatsApp(kind: OwnerContactKind): boolean {
		return kind == 'mobile';
	}

	const ownerId = $derived(Number(page.params.id));
	let profile = $state<OwnerProfile | null>(null);
	let form = $state<OwnerForm>({
		name: '',
		avatarBytes: null,
		street: '',
		streetNumber: '',
		addressComplement: '',
		neighborhood: '',
		city: '',
		country: DEFAULT_OWNER_COUNTRY,
		postalCode: '',
		contacts: [{ kind: 'mobile', value: '' }],
		state: ''
	});
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let editing = $state(false);
	let avatarDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let cepLoading = $state(false);
	let unsavedDialogOpen = $state(false);
	let pendingNavigationHref = $state<string | null>(null);
	let pendingCancelEdit = $state(false);
	let savedSnapshot = $state('');
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);
	let allowNavigation = false;

	const currentSnapshot = $derived(snapshotForm(form));
	const hasUnsavedChanges = $derived(editing && Boolean(profile) && !loading && currentSnapshot !== savedSnapshot);
	const visibleContacts = $derived((editing ? form.contacts : (profile?.owner.contacts ?? [])).filter((contact) => contact.value.trim().length > 0));

	function petTaxonomyLabel(pet: Pet): string {
		const species = getPetSpeciesOption(pet.species);
		const breed = getPetBreedOption(pet.breed);
		const parts = [species ? t(species.labelKey) : null, breed ? t(breed.labelKey) : null].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : t('common.notInformed');
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

	async function load() {
		loading = true;
		error = null;

		try {
			profile = await loadOwnerProfile(ownerId);
			const loadedForm = toForm(profile.owner);
			form = loadedForm;
			savedSnapshot = snapshotForm(loadedForm);
			editing = false;
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			loading = false;
		}
	}

	function startEditing() {
		if (!profile) return;
		const nextForm = toForm(profile.owner);
		form = nextForm;
		savedSnapshot = snapshotForm(nextForm);
		statusKey = null;
		error = null;
		editing = true;
	}

	function requestCancelEditing() {
		if (!editing || !profile) return;

		if (!hasUnsavedChanges) {
			const nextForm = toForm(profile.owner);
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

	async function fillAddressFromCep() {
		if (!editing) return;

		cepLoading = true;
		statusKey = 'status.cepSearching';
		error = null;

		try {
			const cepAddress = await lookupCep(form.postalCode, form.country);
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
			if (exception instanceof Error && exception.message === 'cep_invalid') {
				statusKey = 'status.cepInvalid';
			} else if (exception instanceof Error && exception.message === 'cep_country_unsupported') {
				statusKey = 'status.cepCountryUnsupported';
			} else {
				statusKey = 'status.cepUnavailable';
			}
		} finally {
			cepLoading = false;
		}
	}

	async function saveCurrentOwner(showStatus: boolean): Promise<boolean> {
		if (!profile) return false;

		saving = true;
		error = null;

		try {
			const owner = await saveOwner(ownerId, form);
			profile = { ...profile, owner };

			const nextForm = toForm(owner);
			form = nextForm;
			savedSnapshot = snapshotForm(nextForm);
			editing = false;

			if (showStatus) statusKey = 'status.saved';
			return true;
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
			return false;
		} finally {
			saving = false;
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!editing) return;
		await saveCurrentOwner(true);
	}

	async function confirmSaveAndLeave() {
		const href = pendingNavigationHref;
		const cancelEdit = pendingCancelEdit;

		const saved = await saveCurrentOwner(false);
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
			const nextForm = toForm(profile.owner);
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

	async function callContact(value: string) {
		await openPhoneCallForPhone(value);
	}

	async function messageContact(value: string) {
		await openWhatsAppForPhone(value);
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
			await navigateToHref('/settings/trash');
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
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
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="text-base font-semibold">{t('owner.editSection')}</h3>
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

				<div class="mt-4 flex flex-col gap-3 rounded-md border border-border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex min-w-0 items-center gap-3">
						<OwnerAvatar avatarBytes={form.avatarBytes} ownerName={form.name} className="size-20" iconClass="size-8 text-muted-foreground" />

						<div class="min-w-0">
							<p class="text-sm font-semibold">{t('owner.avatarLabel')}</p>
							<p class="text-xs text-muted-foreground">{t('owner.avatarHint')}</p>
						</div>
					</div>

					{#if editing}
						<div class="flex flex-wrap gap-2">
							<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={openAvatarDialog}>
								{t('owner.avatarEdit')}
							</button>
							{#if form.avatarBytes}
								<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={removeAvatar}>
									{t('owner.avatarRemove')}
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<div class="mt-4 grid gap-4 sm:grid-cols-5">
					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-5">
						<span>{t('owner.name')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.name} disabled={!editing} required />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
						<span>{t('owner.country')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.country} disabled={!editing} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-3">
						<span>{t('owner.postalCode')}</span>
						<span class="flex gap-2">
							<input class="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.postalCode} disabled={!editing} />
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={!editing || cepLoading || !isCountrySupportedForCepLookup(form.country)} onclick={() => void fillAddressFromCep()} aria-label={t('actions.searchCep')}>
								<Search class="size-4" />
								{t('actions.searchCep')}
							</button>
						</span>
					</label>

					{#if editing && !isCountrySupportedForCepLookup(form.country)}
						<p class="text-xs text-muted-foreground sm:col-span-2">{t('status.cepCountryUnsupported')}</p>
					{/if}

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-3">
						<span>{t('owner.street')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.street} disabled={!editing} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-1">
						<span>{t('owner.streetNumber')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.streetNumber} disabled={!editing} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-1">
						<span>{t('owner.addressComplement')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.addressComplement} disabled={!editing} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
						<span>{t('owner.neighborhood')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.neighborhood} disabled={!editing} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
						<span>{t('owner.city')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.city} disabled={!editing} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.state')}</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.state} disabled={!editing} />
					</label>

					{#if editing}
						<OwnerContactsField bind:contacts={form.contacts} />
					{:else}
						<div class="sm:col-span-5 rounded-md border border-border bg-background p-3">
							<h4 class="text-sm font-semibold">{t('owner.contacts')}</h4>
							<div class="mt-3 flex flex-col gap-2">
								{#each visibleContacts as contact}
									<article class="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold">{contact.value}</p>
											<p class="mt-1 text-xs text-muted-foreground">{t(contactKindLabelKey(contact.kind))}</p>
										</div>

										<div class="grid gap-2 sm:flex sm:justify-end {canOpenWhatsApp(contact.kind) ? 'grid-cols-2' : 'grid-cols-1'}">
											<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.call')}: ${contact.value}`} onclick={() => void callContact(contact.value)}>
												<PhoneCall class="size-4" />
												{t('owner.call')}
											</button>
											{#if canOpenWhatsApp(contact.kind)}
												<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.messageWhatsApp')}: ${contact.value}`} onclick={() => void messageContact(contact.value)}>
													<MessageCircle class="size-4" />
													{t('owner.messageWhatsApp')}
												</button>
											{/if}
										</div>
									</article>
								{:else}
									<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.noContacts')}</p>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				{#if statusKey}
					<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
				{/if}

				{#if editing}
					<div class="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
						<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Save class="size-4" />
							{saving ? t('record.saving') : t('actions.updateOwner')}
						</button>

						{#if hasUnsavedChanges}
							<span class="text-xs font-medium text-muted-foreground">{t('record.unsavedChanges')}</span>
						{/if}
					</div>
				{/if}
			</form>

			<aside class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-base font-semibold">{t('owner.petsSection')}</h3>
					<PawPrint class="size-5 text-primary" />
				</div>

				<div class="mt-4 flex flex-col gap-2">
					{#each profile.pets as pet}
						<a href={`/owners/${ownerId}/pets/${pet.id}`} class="flex items-center gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
							<PetAvatar avatarBytes={pet.avatarBytes} petName={pet.name} className="size-11" iconClass="size-5 text-primary" />
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium">{pet.name}</span>
								<span class="block truncate text-xs text-muted-foreground">{petTaxonomyLabel(pet)}</span>
							</span>
						</a>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.emptyPets')}</p>
					{/each}
				</div>
			</aside>
		</div>
	{/if}
</section>

<UnsavedChangesDialog
	open={unsavedDialogOpen}
	saving={saving}
	titleKey="owner.unsavedDialogTitle"
	descriptionKey="owner.unsavedDialogDescription"
	onSave={() => void confirmSaveAndLeave()}
	onDiscard={() => void discardAndLeave()}
	onCancel={cancelLeave}
/>

<TrashRemovalDialog open={deleteDialogOpen} messageKey="owner.deleteConfirm" confirming={deleting} onConfirm={() => void confirmDeleteOwner()} onCancel={() => (deleteDialogOpen = false)} />

{#if avatarDialogOpen}
	<OwnerAvatarEditorDialog initialAvatarBytes={form.avatarBytes} onApply={applyAvatar} onRemove={removeAvatar} onClose={closeAvatarDialog} />
{/if}
