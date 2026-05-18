<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import UnsavedChangesDialog from '$lib/components/records/UnsavedChangesDialog.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import type { MedicalRecordDetails, MedicalRecordInput } from '$lib/domain/medical-record/medical-record.js';
	import { formatDateForInput, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadRecordAutoSavePreference, saveRecordAutoSavePreference } from '$lib/services/preferences.service.js';
	import { loadRecordDetails, removeRecord, saveRecord } from '$lib/services/record.service.js';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const recordId = $derived(Number(page.params.id));
	let details = $state<MedicalRecordDetails | null>(null);
	let form = $state<MedicalRecordInput>({ title: '', description: '', admittedAt: '', dischargedAt: '' });
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let autoSaveEnabled = $state(false);
	let savedSnapshot = $state('');
	let unsavedDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let pendingNavigationHref = $state<string | null>(null);
	let loadingPreferences = $state(true);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);
	let activeSave: Promise<boolean> | null = null;
	let allowNavigation = false;

	const currentSnapshot = $derived(snapshotForm(form));
	const hasUnsavedChanges = $derived(Boolean(details) && !loading && currentSnapshot !== savedSnapshot);
	const shouldAutoSave = $derived(autoSaveEnabled && hasUnsavedChanges && !saving && !loading && Boolean(details));

	function formFromDetails(record: MedicalRecordDetails['record']): MedicalRecordInput {
		return {
			title: record.title,
			description: record.description ?? '',
			admittedAt: formatDateForInput(record.admittedAt),
			dischargedAt: formatDateForInput(record.dischargedAt)
		};
	}

	function snapshotForm(input: MedicalRecordInput): string {
		return JSON.stringify({
			title: input.title,
			description: input.description ?? '',
			admittedAt: input.admittedAt ?? '',
			dischargedAt: input.dischargedAt ?? ''
		});
	}

	function inputForSave(): MedicalRecordInput {
		return {
			...form,
			admittedAt: normalizeDateInput(form.admittedAt),
			dischargedAt: normalizeDateInput(form.dischargedAt)
		};
	}

	function hrefFromUrl(url: URL): string {
		return `${url.pathname}${url.search}${url.hash}`;
	}

	function petProfileHref(recordDetails: MedicalRecordDetails): string {
		return `/pets/${recordDetails.record.petId}`;
	}

	function errorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'date_invalid') return t('date.invalid');
		if (exception instanceof Error && exception.message === 'record_period_invalid') return t('record.periodInvalid');
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') return t('form.limitExceeded');
		return exception instanceof Error ? exception.message : String(exception);
	}

	async function load() {
		loading = true;
		loadingPreferences = true;
		error = null;

		try {
			const [loadedDetails, loadedAutoSaveEnabled] = await Promise.all([loadRecordDetails(recordId), loadRecordAutoSavePreference()]);
			details = loadedDetails;
			autoSaveEnabled = loadedAutoSaveEnabled;
			form = formFromDetails(details.record);
			savedSnapshot = snapshotForm(form);
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			loadingPreferences = false;
			loading = false;
		}
	}

	async function changeAutoSave(event: Event) {
		const enabled = (event.currentTarget as HTMLInputElement).checked;
		autoSaveEnabled = enabled;
		statusKey = null;
		error = null;

		try {
			await saveRecordAutoSavePreference(enabled);
			if (enabled && hasUnsavedChanges) await saveUntilClean(false);
		} catch (exception) {
			autoSaveEnabled = !enabled;
			error = errorMessage(exception);
		}
	}

	async function saveCurrentRecord(showStatus: boolean): Promise<boolean> {
		if (!details) return false;
		if (activeSave) return activeSave;

		const snapshotAtStart = currentSnapshot;
		const input = inputForSave();

		activeSave = (async () => {
			saving = true;
			error = null;

			try {
				const record = await saveRecord(recordId, input);
				details = details ? { ...details, record } : details;

				if (currentSnapshot === snapshotAtStart) {
					form = formFromDetails(record);
					savedSnapshot = snapshotForm(form);
				} else {
					savedSnapshot = snapshotAtStart;
				}

				if (showStatus && currentSnapshot === savedSnapshot) statusKey = 'status.saved';
				return true;
			} catch (exception) {
				error = errorMessage(exception);
				return false;
			} finally {
				saving = false;
				activeSave = null;
			}
		})();

		return activeSave;
	}

	async function saveUntilClean(showStatus: boolean): Promise<boolean> {
		for (let attempt = 0; attempt < 5; attempt += 1) {
			if (!hasUnsavedChanges) return true;
			const saved = await saveCurrentRecord(showStatus && attempt === 0);
			if (!saved) return false;
		}

		return !hasUnsavedChanges;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (autoSaveEnabled) return;
		await saveUntilClean(true);
	}

	async function navigateToHref(href: string) {
		allowNavigation = true;
		try {
			await goto(href);
		} finally {
			allowNavigation = false;
		}
	}

	async function saveAndNavigate(href: string) {
		const saved = await saveUntilClean(false);
		if (saved) await navigateToHref(href);
	}

	async function confirmSaveAndLeave() {
		const href = pendingNavigationHref;
		if (!href) return;

		const saved = await saveUntilClean(false);
		if (!saved) {
			unsavedDialogOpen = false;
			pendingNavigationHref = null;
			return;
		}

		unsavedDialogOpen = false;
		pendingNavigationHref = null;
		await navigateToHref(href);
	}

	async function discardAndLeave() {
		const href = pendingNavigationHref;
		if (!href) return;

		unsavedDialogOpen = false;
		pendingNavigationHref = null;
		await navigateToHref(href);
	}

	function cancelLeave() {
		unsavedDialogOpen = false;
		pendingNavigationHref = null;
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!hasUnsavedChanges) return;
		event.preventDefault();
		event.returnValue = '';
	}

	beforeNavigate((navigation) => {
		if (allowNavigation || loading || !details || !hasUnsavedChanges) return;
		if (!navigation.to?.url) {
			navigation.cancel();
			return;
		}

		const href = hrefFromUrl(navigation.to.url);
		navigation.cancel();

		if (autoSaveEnabled) {
			void saveAndNavigate(href);
			return;
		}

		pendingNavigationHref = href;
		unsavedDialogOpen = true;
	});

	$effect(() => {
		if (hasUnsavedChanges) statusKey = null;
	});

	$effect(() => {
		if (!shouldAutoSave) return;

		const snapshotBeforeDelay = currentSnapshot;
		const timeout = window.setTimeout(() => {
			if (autoSaveEnabled && hasUnsavedChanges && currentSnapshot === snapshotBeforeDelay) void saveUntilClean(false);
		}, 900);

		return () => window.clearTimeout(timeout);
	});

	function requestDeleteRecord() {
		if (!details) return;
		deleteDialogOpen = true;
	}

	async function confirmDeleteRecord() {
		if (!details) return;
		deleting = true;
		error = null;

		try {
			await removeRecord(recordId);
			deleteDialogOpen = false;
			await navigateToHref(petProfileHref(details));
		} catch (exception) {
			error = errorMessage(exception);
		} finally {
			deleting = false;
		}
	}

	onMount(() => {
		void load();
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});
</script>

<svelte:head>
	<title>{details?.record.title ?? t('record.profileTitle')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			{#if details}
				<div class="flex flex-wrap gap-2">
					{#each details.owners as owner}
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

					<a href={petProfileHref(details)} aria-label={`${t('actions.openPet')}: ${details.petName}`} class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent">
						<PetAvatar avatarBytes={details.petAvatarBytes} petName={details.petName} className="size-6" iconClass="size-3.5 text-primary" />
						<span class="shrink-0 text-xs font-semibold uppercase text-muted-foreground">{t('pet.contextLabel')}</span>
						<span class="truncate text-primary">{details.petName}</span>
					</a>
				</div>
			{/if}
			<h2 class="mt-1 truncate text-2xl font-semibold sm:text-3xl">{details?.record.title ?? t('record.profileTitle')}</h2>
		</div>
		<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={deleting} onclick={requestDeleteRecord}>
			<Trash2 class="size-4" />
			{t('actions.delete')}
		</button>
	</header>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if loading}
		<div class="h-64 animate-pulse rounded-md bg-muted"></div>
	{:else if details}
		<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h3 class="text-base font-semibold">{t('record.editSection')}</h3>
				<label class="inline-flex h-10 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent {loadingPreferences || saving ? 'opacity-60' : ''}">
					<input type="checkbox" class="size-4 rounded border-input accent-primary" checked={autoSaveEnabled} disabled={loadingPreferences || saving} onchange={changeAutoSave} />
					<span>{t('record.autoSaveLabel')}</span>
				</label>
			</div>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
					<span class="flex min-w-0 items-baseline justify-between gap-2">
						<span>{t('record.titleLabel')}</span>
						<CharacterLimitHint value={form.title} max={FIELD_LIMITS.medicalRecordTitle} />
					</span>
					<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.title} maxlength={FIELD_LIMITS.medicalRecordTitle} />
				</label>

				<fieldset class="grid gap-4 sm:col-span-2 sm:grid-cols-2">
					<legend class="mb-2 text-sm font-medium">{t('record.attendancePeriod')}</legend>
					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('record.admittedAt')}</span>
						<DateField bind:value={form.admittedAt} ariaLabel={t('record.admittedAt')} />
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('record.dischargedAt')}</span>
						<DateField bind:value={form.dischargedAt} ariaLabel={t('record.dischargedAt')} />
					</label>
				</fieldset>

				<label class="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
					<span class="flex min-w-0 items-baseline justify-between gap-2">
						<span>{t('record.descriptionLabel')}</span>
						<CharacterLimitHint value={form.description} max={FIELD_LIMITS.medicalRecordDescription} />
					</span>
					<textarea class="min-h-80 rounded-md border border-input bg-background p-3 text-sm leading-6 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.description} maxlength={FIELD_LIMITS.medicalRecordDescription}></textarea>
				</label>
			</div>

			{#if statusKey}
				<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
			{/if}

			<div class="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
				{#if autoSaveEnabled}
					<span class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-muted px-4 text-sm font-medium text-muted-foreground" aria-live="polite">
						<Save class="size-4" />
						{saving ? t('record.autoSaving') : t('record.autoSaved')}
					</span>
				{:else}
					<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
						<Save class="size-4" />
						{saving ? t('record.saving') : t('actions.updateRecord')}
					</button>
				{/if}

				{#if hasUnsavedChanges && !autoSaveEnabled}
					<span class="text-xs font-medium text-muted-foreground">{t('record.unsavedChanges')}</span>
				{/if}
			</div>
		</form>
	{/if}
</section>

<UnsavedChangesDialog open={unsavedDialogOpen} saving={saving} onSave={() => void confirmSaveAndLeave()} onDiscard={() => void discardAndLeave()} onCancel={cancelLeave} />
<TrashRemovalDialog open={deleteDialogOpen} messageKey="record.deleteConfirm" confirming={deleting} onConfirm={() => void confirmDeleteRecord()} onCancel={() => (deleteDialogOpen = false)} />