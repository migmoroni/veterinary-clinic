<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '@vet/ui/components/forms/CharacterLimitHint.svelte';
	import OwnerAvatar from '@vet/modules/registry/components/owner/OwnerAvatar.svelte';
	import OwnerAvatarEditorDialog from '@vet/modules/registry/components/owner/OwnerAvatarEditorDialog.svelte';
	import OwnerContactEditorList from '@vet/modules/registry/components/owner/OwnerContactEditorList.svelte';
	import WorkplaceImageCaptureDialog from '@vet/modules/registry/components/practice/WorkplaceImageCaptureDialog.svelte';
	import WorkplaceAddressFields from '@vet/modules/registry/components/practice/WorkplaceAddressFields.svelte';
	import ImageCollectionOrganizer from '@vet/ui/components/shared/ImageCollectionOrganizer.svelte';
	import ImageCollectionSummary from '@vet/ui/components/shared/ImageCollectionSummary.svelte';
	import type { ImageCollectionItem, ImageCollectionItemInput } from '@vet/types/domain/image-collection/image-collection.js';
	import { DEFAULT_OWNER_COUNTRY, type OwnerContactInput } from '@vet/types/domain/owner/owner.js';
	import type { VeterinarianProfileInput, WorkplaceInput } from '@vet/types/domain/practice-profile/practice-profile.js';
	import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
	import { t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import { loadPracticeProfiles, saveVeterinarianSettings, saveWorkplaceSettings } from '@vet/modules/registry/services/practice-profile.service.js';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Save from '@lucide/svelte/icons/save';
	import UserRound from '@lucide/svelte/icons/user-round';

	type ProfileTab = 'user' | 'workplace';

	function contactInputs(contacts: { kind: OwnerContactInput['kind']; label: string; value: string }[] = []): OwnerContactInput[] {
		return contacts.map((contact) => ({ kind: contact.kind, label: contact.label, value: contact.value }));
	}

	function imageInputs(images: ImageCollectionItem[] = []): ImageCollectionItemInput[] {
		return images.map((image) => ({
			clientId: `saved-${image.id}`,
			imageBytes: image.imageBytes,
			originalImageBytes: image.originalImageBytes,
			description: image.description ?? '',
			isPrimary: image.isPrimary
		}));
	}

	function newImageClientId(): string {
		return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `image-${Date.now()}-${Math.random()}`;
	}

	function emptyVeterinarian(): VeterinarianProfileInput {
		return { name: '', professionalRegistration: '', avatarBytes: null, contacts: [] };
	}

	function emptyWorkplace(): WorkplaceInput {
		return {
			name: '',
			servicesDescription: '',
			street: '',
			streetNumber: '',
			addressComplement: '',
			neighborhood: '',
			city: '',
			state: '',
			country: DEFAULT_OWNER_COUNTRY,
			postalCode: '',
			contacts: [],
			images: []
		};
	}

	let activeTab = $state<ProfileTab>('user');
	let veterinarianForm = $state<VeterinarianProfileInput>(emptyVeterinarian());
	let workplaceForm = $state<WorkplaceInput>(emptyWorkplace());
	let loading = $state(true);
	let saving = $state(false);
	let avatarDialogOpen = $state(false);
	let workplaceImageDialogOpen = $state(false);
	let workplaceImageManagerOpen = $state(false);
	let workplaceImageEditIndex = $state<number | null>(null);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);

	function errorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'owner_contact_required') return t('owner.contactRequired');
		if (exception instanceof Error && exception.message === 'owner_location_invalid') return t('owner.locationInvalid');
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') return t('form.limitExceeded');
		if (exception instanceof Error && exception.message === 'image_collection_limit_exceeded') return t('practiceProfile.imageLimitExceeded');
		if (exception instanceof Error && exception.message === 'image_collection_primary_required') return t('practiceProfile.primaryImageRequiredError');
		return exception instanceof Error ? exception.message : String(exception);
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const profiles = await loadPracticeProfiles();
			if (profiles.veterinarian) {
				veterinarianForm = {
					name: profiles.veterinarian.name ?? '',
					professionalRegistration: profiles.veterinarian.professionalRegistration ?? '',
					avatarBytes: profiles.veterinarian.avatarBytes,
					contacts: contactInputs(profiles.veterinarian.contacts)
				};
			}
			if (profiles.workplace) {
				workplaceForm = {
					name: profiles.workplace.name ?? '',
					servicesDescription: profiles.workplace.servicesDescription ?? '',
					street: profiles.workplace.street ?? '',
					streetNumber: profiles.workplace.streetNumber ?? '',
					addressComplement: profiles.workplace.addressComplement ?? '',
					neighborhood: profiles.workplace.neighborhood ?? '',
					city: profiles.workplace.city ?? '',
					state: profiles.workplace.state ?? '',
					country: profiles.workplace.country || DEFAULT_OWNER_COUNTRY,
					postalCode: profiles.workplace.postalCode ?? '',
					contacts: contactInputs(profiles.workplace.contacts),
					images: imageInputs(profiles.workplace.images)
				};
			}
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			loading = false;
		}
	}

	function selectTab(tab: ProfileTab) {
		activeTab = tab;
		statusKey = null;
		error = null;
	}

	function applyAvatar(bytes: Uint8Array) {
		veterinarianForm = { ...veterinarianForm, avatarBytes: bytes };
		avatarDialogOpen = false;
		statusKey = null;
	}

	function removeAvatar() {
		veterinarianForm = { ...veterinarianForm, avatarBytes: null };
		avatarDialogOpen = false;
		statusKey = null;
	}

	function openNewWorkplaceImage() {
		workplaceImageEditIndex = null;
		workplaceImageDialogOpen = true;
	}

	function openWorkplaceImageEditor(index: number) {
		workplaceImageEditIndex = index;
		workplaceImageDialogOpen = true;
	}

	function closeWorkplaceImageEditor() {
		workplaceImageDialogOpen = false;
		workplaceImageEditIndex = null;
	}

	function applyWorkplaceImage(bytes: Uint8Array, originalBytes: Uint8Array) {
		if (workplaceImageEditIndex === null) {
			workplaceForm.images = [
				...workplaceForm.images,
				{
					clientId: newImageClientId(),
					imageBytes: bytes,
					originalImageBytes: originalBytes,
					description: '',
					isPrimary: workplaceForm.images.length === 0
				}
			];
		} else {
			workplaceForm.images = workplaceForm.images.map((image, index) =>
				index === workplaceImageEditIndex ? { ...image, imageBytes: bytes, originalImageBytes: originalBytes } : image
			);
		}
		closeWorkplaceImageEditor();
		statusKey = null;
	}

	async function saveVeterinarian(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		error = null;
		try {
			const saved = await saveVeterinarianSettings(veterinarianForm);
			veterinarianForm = {
				name: saved.name ?? '',
				professionalRegistration: saved.professionalRegistration ?? '',
				avatarBytes: saved.avatarBytes,
				contacts: contactInputs(saved.contacts)
			};
			statusKey = 'practiceProfile.userSaved';
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
		}
	}

	async function saveWorkplace(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		error = null;
		try {
			const saved = await saveWorkplaceSettings(workplaceForm);
			workplaceForm = {
				name: saved.name ?? '',
				servicesDescription: saved.servicesDescription ?? '',
				street: saved.street ?? '',
				streetNumber: saved.streetNumber ?? '',
				addressComplement: saved.addressComplement ?? '',
				neighborhood: saved.neighborhood ?? '',
				city: saved.city ?? '',
				state: saved.state ?? '',
				country: saved.country,
				postalCode: saved.postalCode ?? '',
				contacts: contactInputs(saved.contacts),
				images: imageInputs(saved.images)
			};
			statusKey = 'practiceProfile.workplaceSaved';
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			saving = false;
		}
	}

	onMount(() => void load());
</script>

<svelte:head>
	<title>{t('settings.profile.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full min-w-0 flex-col gap-5">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('settings.profile.title')}</h2>
	</header>

	<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('settings.profile.title')}>
		<button type="button" role="tab" aria-selected={activeTab === 'user'} class="flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {activeTab === 'user' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}" onclick={() => selectTab('user')}>
			<UserRound class="size-4" />
			{t('practiceProfile.userTab')}
		</button>
		<button type="button" role="tab" aria-selected={activeTab === 'workplace'} class="flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {activeTab === 'workplace' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}" onclick={() => selectTab('workplace')}>
			<Building2 class="size-4" />
			{t('practiceProfile.workplaceTab')}
		</button>
	</div>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}
	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	{#if loading}
		<p class="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">{t('common.loading')}</p>
	{:else if activeTab === 'user'}
		<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={saveVeterinarian}>
			<div class="mb-5 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
				<OwnerAvatar avatarBytes={veterinarianForm.avatarBytes} ownerName={veterinarianForm.name} avatarAltKey="practiceProfile.avatarAlt" avatarPlaceholderAltKey="practiceProfile.avatarPlaceholderAlt" className="size-24 border border-border shadow-sm" iconClass="size-10 text-muted-foreground" />
				<div class="min-w-0">
					<p class="text-sm font-semibold">{t('practiceProfile.photo')}</p>
					<button type="button" class="mt-2 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={() => (avatarDialogOpen = true)}>
						{t('owner.avatarEdit')}
					</button>
				</div>
			</div>

			<div class="grid gap-4">
				<label class="flex flex-col gap-1 text-sm font-medium">
					<span class="flex min-w-0 items-baseline justify-between gap-2">
						<span>{t('practiceProfile.veterinarianName')}</span>
						<CharacterLimitHint value={veterinarianForm.name} max={FIELD_LIMITS.veterinarianName} />
					</span>
					<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={veterinarianForm.name} maxlength={FIELD_LIMITS.veterinarianName} disabled={saving} />
				</label>

				<label class="flex flex-col gap-1 text-sm font-medium">
					<span class="flex min-w-0 items-baseline justify-between gap-2">
						<span>{t('practiceProfile.professionalRegistration')}</span>
						<CharacterLimitHint value={veterinarianForm.professionalRegistration} max={FIELD_LIMITS.veterinarianProfessionalRegistration} />
					</span>
					<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={veterinarianForm.professionalRegistration} maxlength={FIELD_LIMITS.veterinarianProfessionalRegistration} disabled={saving} placeholder={t('practiceProfile.professionalRegistrationPlaceholder')} />
				</label>

				<div class="border-t border-border pt-5">
					<OwnerContactEditorList bind:contacts={veterinarianForm.contacts} country={DEFAULT_OWNER_COUNTRY} titleKey="practiceProfile.contacts" />
				</div>
			</div>

			<button type="submit" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t('actions.save')}
			</button>
		</form>
	{:else}
		<form class="w-full min-w-0 max-w-full rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={saveWorkplace}>
			<div class="grid w-full min-w-0 gap-5">
				<ImageCollectionSummary
					images={workplaceForm.images}
					maxItems={9}
					primaryRequired
					disabled={saving}
					onManage={() => (workplaceImageManagerOpen = true)}
				/>

				<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<span class="flex min-w-0 items-baseline justify-between gap-2">
						<span>{t('practiceProfile.workplaceName')}</span>
						<CharacterLimitHint value={workplaceForm.name} max={FIELD_LIMITS.workplaceName} />
					</span>
					<input class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={workplaceForm.name} maxlength={FIELD_LIMITS.workplaceName} disabled={saving} />
				</label>

				<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<span class="flex min-w-0 items-baseline justify-between gap-2">
						<span>{t('practiceProfile.servicesDescription')}</span>
						<CharacterLimitHint value={workplaceForm.servicesDescription} max={FIELD_LIMITS.workplaceServicesDescription} />
					</span>
					<textarea class="min-h-32 w-full min-w-0 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={workplaceForm.servicesDescription} maxlength={FIELD_LIMITS.workplaceServicesDescription} disabled={saving}></textarea>
				</label>

				<div class="min-w-0 border-t border-border pt-5">
					<h3 class="mb-4 text-sm font-semibold">{t('practiceProfile.address')}</h3>
					<WorkplaceAddressFields bind:form={workplaceForm} disabled={saving} />
				</div>

				<div class="min-w-0 border-t border-border pt-5">
					<OwnerContactEditorList bind:contacts={workplaceForm.contacts} country={workplaceForm.country} titleKey="practiceProfile.contacts" />
				</div>
			</div>

			<button type="submit" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t('actions.save')}
			</button>
		</form>
	{/if}
</section>

{#if avatarDialogOpen}
	<OwnerAvatarEditorDialog
		initialAvatarBytes={veterinarianForm.avatarBytes}
		titleKey="practiceProfile.avatarDialogTitle"
		descriptionKey="practiceProfile.avatarDialogDescription"
		onApply={applyAvatar}
		onRemove={removeAvatar}
		onClose={() => (avatarDialogOpen = false)}
	/>
{/if}

{#if workplaceImageManagerOpen}
	<ImageCollectionOrganizer
		bind:images={workplaceForm.images}
		maxItems={9}
		primaryRequired
		disabled={saving}
		onAdd={openNewWorkplaceImage}
		onEdit={openWorkplaceImageEditor}
		onClose={() => (workplaceImageManagerOpen = false)}
	/>
{/if}

{#if workplaceImageDialogOpen}
	<WorkplaceImageCaptureDialog
		initialImageBytes={workplaceImageEditIndex === null ? null : workplaceForm.images[workplaceImageEditIndex]?.imageBytes}
		initialOriginalImageBytes={workplaceImageEditIndex === null ? null : workplaceForm.images[workplaceImageEditIndex]?.originalImageBytes}
		onApply={applyWorkplaceImage}
		onClose={closeWorkplaceImageEditor}
	/>
{/if}
