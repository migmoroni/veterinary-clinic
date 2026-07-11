<script lang="ts">
	import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { i18n, t } from '$lib/i18n/index.js';
	import X from '@lucide/svelte/icons/x';

	let {
		id,
		value,
		disabled = false,
		onchange
	}: {
		id: string;
		value: string[];
		disabled?: boolean;
		onchange: (value: string[]) => void;
	} = $props();

	let selectedRegion = $state('');
	const localizedCountries = $derived(countryOptions(i18n.locale));
	const availableCountries = $derived(localizedCountries.filter((country) => !value.includes(country.value)));

	function regionLabel(region: string): string {
		return localizedCountries.find((country) => country.value === region)?.label ?? region;
	}

	function addRegion(region: string) {
		if (!region || value.includes(region)) return;
		onchange([...value, region]);
		selectedRegion = '';
	}

	function removeRegion(region: string) {
		onchange(value.filter((candidate) => candidate !== region));
	}
</script>

<div class="flex min-w-0 flex-col gap-2">
	{#if value.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each value as region (region)}
				<span class="inline-flex h-8 max-w-full items-center gap-1 rounded-md border border-border bg-muted pl-3 pr-1 text-sm">
					<span class="truncate">{regionLabel(region)}</span>
					<button
						type="button"
						class="inline-flex size-7 shrink-0 items-center justify-center rounded-sm hover:bg-background disabled:opacity-50"
						aria-label={`${t('product.removeRegion')}: ${regionLabel(region)}`}
						{disabled}
						onclick={() => removeRegion(region)}
					>
						<X class="size-4" />
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<SearchableSelect
		{id}
		bind:value={selectedRegion}
		emptyValue=""
		options={availableCountries}
		placeholder={t('product.regionPlaceholder')}
		emptyLabel={t('form.noOptions')}
		{disabled}
		onchange={addRegion}
	/>
</div>
