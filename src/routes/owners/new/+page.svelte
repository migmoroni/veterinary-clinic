<script lang="ts">
	import { goto } from '$app/navigation';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import { DEFAULT_OWNER_COUNTRY, type OwnerInput } from '$lib/domain/owner/owner.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { t } from '$lib/i18n/index.js';
	import { saveNewOwner } from '$lib/services/owner.service.js';
	import Save from '@lucide/svelte/icons/save';

	let name = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	function ownerInputFromName(): OwnerInput {
		return {
			name,
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
		};
	}

	function ownerErrorMessage(exception: unknown): string {
		if (exception instanceof Error && exception.message === 'owner_contact_required') return t('owner.contactRequired');
		if (exception instanceof Error && exception.message === 'owner_location_invalid') return t('owner.locationInvalid');
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') return t('form.limitExceeded');
		if (exception instanceof Error && exception.message === 'field_required') return t('form.fieldRequired');
		return exception instanceof Error ? exception.message : String(exception);
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = null;

		try {
			const owner = await saveNewOwner(ownerInputFromName());
			await goto(`/owners/${owner.id}?edit=1`);
		} catch (exception) {
			error = ownerErrorMessage(exception);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{t('owner.titleNew')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('owner.titleNew')}</h2>
	</header>

	<form class="w-full min-w-0 max-w-full rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
		<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
			<span class="flex min-w-0 items-baseline justify-between gap-2">
				<span>{t('owner.name')}</span>
				<CharacterLimitHint value={name} max={FIELD_LIMITS.ownerName} />
			</span>
			<input class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={name} maxlength={FIELD_LIMITS.ownerName} required />
		</label>

		{#if error}
			<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
		{/if}

		<div class="mt-5 flex flex-wrap gap-2">
			<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t('actions.createOwner')}
			</button>
		</div>
	</form>
</section>
