<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import OwnerAdditionalResponsiblesField from '$lib/components/owner/OwnerAdditionalResponsiblesField.svelte';
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import OwnerAvatarEditorDialog from '$lib/components/owner/OwnerAvatarEditorDialog.svelte';
	import OwnerContactsField from '$lib/components/owner/OwnerContactsField.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import UnsavedChangesDialog from '$lib/components/records/UnsavedChangesDialog.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { brazilCityOptions, brazilStateOptions, countryHasStructuredLocations, countryOptions, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '$lib/domain/geo/location.js';
	import { DEFAULT_OWNER_COUNTRY, type Owner, type OwnerContact, type OwnerContactKind, type OwnerInput } from '$lib/domain/owner/owner.js';
	import type { Pet } from '$lib/domain/pet/pet.js';
	import { getPetBreedOption, getPetSpeciesOption } from '$lib/domain/pet/taxonomy.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { isCountrySupportedForCepLookup, lookupCep } from '$lib/services/cep.service.js';
	import { openEmailForEmail, openPhoneCallForPhone, openWhatsAppForPhone } from '$lib/services/contact.service.js';
	import type { OwnerProfile } from '$lib/services/owner.service.js';
	import { loadOwnerProfile, removeOwner, saveOwner } from '$lib/services/owner.service.js';
	import Mail from '@lucide/svelte/icons/mail';
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
		const country = normalizeOwnerCountry(owner.country) ?? DEFAULT_OWNER_COUNTRY;
		const state = normalizeOwnerState(owner.state, country, owner.city) ?? '';
		const city = normalizeOwnerCity(owner.city, country, state) ?? '';

		return {
			name: owner.name,
			avatarBytes: owner.avatarBytes,
			street: owner.street ?? '',
			streetNumber: owner.streetNumber ?? '',
			addressComplement: owner.addressComplement ?? '',
			neighborhood: owner.neighborhood ?? '',
			city,
			country,
			postalCode: owner.postalCode ?? '',
			additionalInformation: owner.additionalInformation ?? '',
			contacts: owner.contacts.map((contact) => ({ kind: contact.kind, label: contact.label, value: contact.value })),
			additionalResponsibles: owner.additionalResponsibles.map((responsible) => ({
				name: responsible.name,
				avatarBytes: responsible.avatarBytes,
				contacts: responsible.contacts.map((contact) => ({ kind: contact.kind, label: contact.label, value: contact.value }))
			})),
			state
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
			additionalInformation: input.additionalInformation?.trim() ?? '',
			contacts: input.contacts.map((contact) => ({ kind: contact.kind, label: (contact.label ?? '').trim(), value: contact.value.trim() })),
			additionalResponsibles: input.additionalResponsibles.map((responsible) => ({
				name: responsible.name.trim(),
				avatar: avatarSnapshotValue(responsible.avatarBytes),
				contacts: responsible.contacts.map((contact) => ({ kind: contact.kind, label: (contact.label ?? '').trim(), value: contact.value.trim() }))
			})),
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

	function isEmailContact(kind: OwnerContactKind): boolean {
		return kind === 'email';
	}

	function canCallContact(kind: OwnerContactKind): boolean {
		return kind === 'phone' || kind === 'mobile';
	}

	function updateCountry(value: string) {
		form = {
			...form,
			country: normalizeOwnerCountry(value) ?? DEFAULT_OWNER_COUNTRY,
			state: '',
			city: ''
		};
	}

	function updateState(value: string) {
		if (!countryHasStructuredLocations(form.country)) {
			form = { ...form, state: value };
			return;
		}

		const state = normalizeOwnerState(value, form.country) ?? '';
		form = {
			...form,
			state,
			city: normalizeOwnerCity(form.city, form.country, state) ?? ''
		};
	}

	function updateCity(value: string) {
		if (!countryHasStructuredLocations(form.country)) {
			form = { ...form, city: value };
			return;
		}

		form = { ...form, city: normalizeOwnerCity(value, form.country, form.state) ?? '' };
	}

	function contactIsVisible(contact: OwnerContact | OwnerInput['contacts'][number]): boolean {
		return contact.value.trim().length > 0 && (contact.kind !== 'other' || (contact.label ?? '').trim().length > 0);
	}

	function contactSubtitle(contact: OwnerContact | OwnerInput['contacts'][number]): string {
		const label = (contact.label ?? '').trim();
		return contact.kind === 'other' && label.length > 0 ? label : t(contactKindLabelKey(contact.kind));
	}

	function ownerErrorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'owner_contact_required') return t('owner.contactRequired');
		if (exception instanceof Error && exception.message === 'owner_location_invalid') return t('owner.locationInvalid');
		return exception instanceof Error ? exception.message : String(exception);
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
		additionalInformation: '',
		contacts: [],
		additionalResponsibles: [],
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
	const visibleContacts = $derived((editing ? form.contacts : (profile?.owner.contacts ?? [])).filter((contact) => contactIsVisible(contact)));
	const hasStructuredLocations = $derived(countryHasStructuredLocations(form.country));
	const countrySelectOptions = $derived(countryOptions(i18n.locale));
	const stateSelectOptions = $derived(hasStructuredLocations ? [{ value: '', label: t('owner.statePlaceholder') }, ...brazilStateOptions()] : []);
	const citySelectOptions = $derived(hasStructuredLocations ? [{ value: '', label: t('owner.cityPlaceholder') }, ...brazilCityOptions(form.state)] : []);

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
			form.state = normalizeOwnerState(cepAddress.state, form.country, cepAddress.city) ?? '';
			form.city = normalizeOwnerCity(cepAddress.city, form.country, form.state) ?? '';
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
			error = ownerErrorMessage(exception);
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

	async function emailContact(value: string) {
		await openEmailForEmail(value);
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

				<div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
					<OwnerAvatar avatarBytes={form.avatarBytes} ownerName={form.name} className="size-24 border border-border shadow-sm" iconClass="size-10 text-muted-foreground" />
					{#if editing}
						<div class="flex flex-col gap-1.5 min-w-0">
							<p class="text-sm font-semibold">{t('owner.avatarLabel')}</p>
							<div class="flex flex-wrap gap-2">
								<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={openAvatarDialog}>
									{t('owner.avatarEdit')}
								</button>
							</div>
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
						<Select id="owner-country" value={form.country} options={countrySelectOptions} disabled={!editing} ariaLabel={t('owner.country')} onchange={updateCountry} />
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

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.state')}</span>
						{#if hasStructuredLocations}
							<Select id="owner-state" value={form.state} options={stateSelectOptions} disabled={!editing} ariaLabel={t('owner.state')} onchange={updateState} />
						{:else}
							<input id="owner-state" class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.state} disabled={!editing} autocomplete="address-level1" />
						{/if}
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
						<span>{t('owner.city')}</span>
						{#if hasStructuredLocations}
							<Select id="owner-city" value={form.city} options={citySelectOptions} disabled={!editing || !form.state} ariaLabel={t('owner.city')} onchange={updateCity} />
						{:else}
							<input id="owner-city" class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.city} disabled={!editing} autocomplete="address-level2" />
						{/if}
					</label>

					{#if editing}
						<OwnerContactsField bind:contacts={form.contacts} country={form.country} />
						<OwnerAdditionalResponsiblesField bind:responsibles={form.additionalResponsibles} country={form.country} />

						<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-5">
							<span>{t('owner.additionalInformation')}</span>
							<textarea class="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.additionalInformation} aria-label={t('owner.additionalInformation')}></textarea>
						</label>
					{:else}
						<div class="sm:col-span-5 pt-2">
							<h4 class="text-sm font-semibold">{t('owner.contacts')}</h4>
							<div class="mt-4 flex flex-col gap-3">
								{#each visibleContacts as contact}
									<article class="flex flex-col gap-3 rounded-md border border-border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
										<div class="min-w-0">
											<p class="truncate text-sm font-semibold">{contact.value}</p>
											<p class="mt-1 text-xs text-muted-foreground">{contactSubtitle(contact)}</p>
										</div>

										{#if isEmailContact(contact.kind) || canCallContact(contact.kind) || canOpenWhatsApp(contact.kind)}
										<div class="flex flex-wrap gap-2">
											{#if isEmailContact(contact.kind)}
												<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.email')}: ${contact.value}`} onclick={() => void emailContact(contact.value)}>
													<Mail class="size-4" />
													{t('owner.email')}
												</button>
											{:else if canCallContact(contact.kind)}
												<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.call')}: ${contact.value}`} onclick={() => void callContact(contact.value)}>
													<PhoneCall class="size-4" />
													{t('owner.call')}
												</button>
											{/if}
											{#if canOpenWhatsApp(contact.kind)}
												<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.messageWhatsApp')}: ${contact.value}`} onclick={() => void messageContact(contact.value)}>
													<MessageCircle class="size-4 text-[#25D366] sm:text-[#25D366]" />
													{t('owner.messageWhatsApp')}
												</button>
											{/if}
										</div>
										{/if}
									</article>
								{:else}
									<p class="text-sm text-muted-foreground">{t('owner.noContacts')}</p>
								{/each}
							</div>
						</div>

						{#if profile.owner.additionalResponsibles.length > 0}
							<div class="sm:col-span-5 pt-2">
								<h4 class="text-sm font-semibold">{t('owner.additionalResponsibles')}</h4>
								<div class="mt-4 flex flex-col gap-3">
									{#each profile.owner.additionalResponsibles as responsible}
										<article class="rounded-md border border-border bg-background/50 p-3">
											<div class="flex min-w-0 items-center gap-3">
												<OwnerAvatar
													avatarBytes={responsible.avatarBytes}
													ownerName={responsible.name}
													avatarAltKey="owner.additionalResponsibleAvatarAlt"
													avatarPlaceholderAltKey="owner.additionalResponsibleAvatarPlaceholderAlt"
													className="size-12"
													iconClass="size-5 text-muted-foreground"
												/>
												<div class="min-w-0">
													<p class="truncate text-sm font-semibold">{responsible.name}</p>
													<p class="mt-1 text-xs text-muted-foreground">{t('owner.additionalResponsibleLabel')}</p>
												</div>
											</div>

											<div class="mt-3 flex flex-col gap-2">
												{#each responsible.contacts.filter((contact) => contactIsVisible(contact)) as contact}
													<div class="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
														<div class="min-w-0">
															<p class="truncate text-sm font-semibold">{contact.value}</p>
															<p class="mt-1 text-xs text-muted-foreground">{contactSubtitle(contact)}</p>
														</div>

														{#if isEmailContact(contact.kind) || canCallContact(contact.kind) || canOpenWhatsApp(contact.kind)}
														<div class="flex flex-wrap gap-2">
															{#if isEmailContact(contact.kind)}
																<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.email')}: ${contact.value}`} onclick={() => void emailContact(contact.value)}>
																	<Mail class="size-4" />
																	{t('owner.email')}
																</button>
															{:else if canCallContact(contact.kind)}
																<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.call')}: ${contact.value}`} onclick={() => void callContact(contact.value)}>
																	<PhoneCall class="size-4" />
																	{t('owner.call')}
																</button>
															{/if}
															{#if canOpenWhatsApp(contact.kind)}
																<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.messageWhatsApp')}: ${contact.value}`} onclick={() => void messageContact(contact.value)}>
																	<MessageCircle class="size-4 text-[#25D366] sm:text-[#25D366]" />
																	{t('owner.messageWhatsApp')}
																</button>
															{/if}
														</div>
														{/if}
													</div>
												{:else}
													<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.noContacts')}</p>
												{/each}
											</div>
										</article>
									{/each}
								</div>
							</div>
						{/if}

						{#if profile.owner.additionalInformation?.trim()}
							<div class="sm:col-span-5 pt-2">
								<h4 class="text-sm font-semibold">{t('owner.additionalInformation')}</h4>
								<p class="mt-3 whitespace-pre-wrap rounded-md border border-border bg-background/50 p-3 text-sm leading-6">{profile.owner.additionalInformation}</p>
							</div>
						{/if}
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
						<a href={`/pets/${pet.id}`} class="flex items-center gap-3 rounded-md border border-border bg-background p-3 hover:bg-accent">
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
