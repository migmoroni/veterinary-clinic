<script lang="ts">
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { brazilCityOptions, brazilStateOptions, countryHasStructuredLocations, countryOptions, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '$lib/domain/geo/location.js';
	import { DEFAULT_OWNER_COUNTRY } from '$lib/domain/owner/owner.js';
	import type { WorkplaceInput } from '$lib/domain/practice-profile/practice-profile.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { isCountrySupportedForCepLookup, lookupCep } from '$lib/services/cep.service.js';
	import Search from '@lucide/svelte/icons/search';

	let { form = $bindable<WorkplaceInput>(), disabled = false }: { form: WorkplaceInput; disabled?: boolean } = $props();

	let cepLoading = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	const hasStructuredLocations = $derived(countryHasStructuredLocations(form.country));
	const countrySelectOptions = $derived(countryOptions(i18n.locale));
	const stateSelectOptions = $derived(hasStructuredLocations ? [{ value: '', label: t('owner.statePlaceholder') }, ...brazilStateOptions()] : []);
	const citySelectOptions = $derived(hasStructuredLocations ? [{ value: '', label: t('owner.cityPlaceholder') }, ...brazilCityOptions(form.state)] : []);

	function updateCountry(value: string) {
		form = { ...form, country: normalizeOwnerCountry(value) ?? DEFAULT_OWNER_COUNTRY, state: '', city: '' };
		statusKey = null;
	}

	function updateState(value: string) {
		if (!hasStructuredLocations) {
			form = { ...form, state: value };
			return;
		}

		const state = normalizeOwnerState(value, form.country) ?? '';
		form = { ...form, state, city: normalizeOwnerCity(form.city, form.country, state) ?? '' };
	}

	function updateCity(value: string) {
		if (!hasStructuredLocations) {
			form = { ...form, city: value };
			return;
		}
		form = { ...form, city: normalizeOwnerCity(value, form.country, form.state) ?? '' };
	}

	async function fillAddressFromCep() {
		cepLoading = true;
		statusKey = 'status.cepSearching';

		try {
			const address = await lookupCep(form.postalCode, form.country);
			if (!address) {
				statusKey = 'status.cepNotFound';
				return;
			}

			const state = normalizeOwnerState(address.state, form.country, address.city) ?? '';
			form = {
				...form,
				postalCode: address.postalCode,
				street: address.street,
				neighborhood: address.neighborhood,
				state,
				city: normalizeOwnerCity(address.city, form.country, state) ?? ''
			};
			statusKey = 'status.cepFound';
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'cep_invalid') statusKey = 'status.cepInvalid';
			else if (exception instanceof Error && exception.message === 'cep_country_unsupported') statusKey = 'status.cepCountryUnsupported';
			else statusKey = 'status.cepUnavailable';
		} finally {
			cepLoading = false;
		}
	}
</script>

<div class="grid w-full min-w-0 gap-4 sm:grid-cols-5">
	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium sm:col-span-2">
		<span>{t('owner.country')}</span>
		<Select id="workplace-country" value={form.country} options={countrySelectOptions} disabled={disabled} ariaLabel={t('owner.country')} onchange={updateCountry} />
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium sm:col-span-3">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.postalCode')}</span>
			<CharacterLimitHint value={form.postalCode} max={FIELD_LIMITS.ownerPostalCode} />
		</span>
		<span class="flex min-w-0 gap-2">
			<input class="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.postalCode} maxlength={FIELD_LIMITS.ownerPostalCode} disabled={disabled} />
			<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={disabled || cepLoading || !isCountrySupportedForCepLookup(form.country)} onclick={() => void fillAddressFromCep()} aria-label={t('actions.searchCep')}>
				<Search class="size-4" />
				{t('actions.searchCep')}
			</button>
		</span>
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium sm:col-span-3">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.street')}</span>
			<CharacterLimitHint value={form.street} max={FIELD_LIMITS.ownerStreet} />
		</span>
		<input class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.street} maxlength={FIELD_LIMITS.ownerStreet} disabled={disabled} />
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.streetNumber')}</span>
			<CharacterLimitHint value={form.streetNumber} max={FIELD_LIMITS.ownerStreetNumber} />
		</span>
		<input class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.streetNumber} maxlength={FIELD_LIMITS.ownerStreetNumber} disabled={disabled} />
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.addressComplement')}</span>
			<CharacterLimitHint value={form.addressComplement} max={FIELD_LIMITS.ownerAddressComplement} />
		</span>
		<input class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.addressComplement} maxlength={FIELD_LIMITS.ownerAddressComplement} disabled={disabled} />
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium sm:col-span-2">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.neighborhood')}</span>
			<CharacterLimitHint value={form.neighborhood} max={FIELD_LIMITS.ownerNeighborhood} />
		</span>
		<input class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.neighborhood} maxlength={FIELD_LIMITS.ownerNeighborhood} disabled={disabled} />
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.state')}</span>
			{#if !hasStructuredLocations}<CharacterLimitHint value={form.state} max={FIELD_LIMITS.ownerState} />{/if}
		</span>
		{#if hasStructuredLocations}
			<Select id="workplace-state" value={form.state} options={stateSelectOptions} disabled={disabled} ariaLabel={t('owner.state')} onchange={updateState} />
		{:else}
			<input id="workplace-state" class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.state} maxlength={FIELD_LIMITS.ownerState} disabled={disabled} autocomplete="address-level1" />
		{/if}
	</label>

	<label class="flex min-w-0 flex-col gap-1 text-sm font-medium sm:col-span-2">
		<span class="flex min-w-0 items-baseline justify-between gap-2">
			<span>{t('owner.city')}</span>
			{#if !hasStructuredLocations}<CharacterLimitHint value={form.city} max={FIELD_LIMITS.ownerCity} />{/if}
		</span>
		{#if hasStructuredLocations}
			<Select id="workplace-city" value={form.city} options={citySelectOptions} disabled={disabled || !form.state} ariaLabel={t('owner.city')} onchange={updateCity} />
		{:else}
			<input id="workplace-city" class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={form.city} maxlength={FIELD_LIMITS.ownerCity} disabled={disabled} autocomplete="address-level2" />
		{/if}
	</label>
</div>

{#if statusKey}
	<p class="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
{/if}
