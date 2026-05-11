<script lang="ts">
	import { goto } from '$app/navigation';
	import OwnerContactsField from '$lib/components/owner/OwnerContactsField.svelte';
	import type { OwnerInput } from '$lib/domain/owner/owner.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { lookupCep } from '$lib/services/cep.service.js';
	import { saveNewOwner } from '$lib/services/owner.service.js';
	import Search from '@lucide/svelte/icons/search';
	import Save from '@lucide/svelte/icons/save';

	function emptyOwnerForm(): OwnerInput {
		return {
			name: '',
			street: '',
			streetNumber: '',
			addressComplement: '',
			neighborhood: '',
			city: '',
			postalCode: '',
			contacts: [{ kind: 'mobile', value: '' }],
			state: ''
		};
	}

	let form = $state<OwnerInput>(emptyOwnerForm());
	let saving = $state(false);
	let cepLoading = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let error = $state<string | null>(null);

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
			const owner = await saveNewOwner(form);
			await goto(`/owners/${owner.id}`);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{t('owner.titleNew')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('owner.titleNew')}</h2>
	</header>

	<form class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" onsubmit={submit}>
		<div class="grid gap-4 sm:grid-cols-2">
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