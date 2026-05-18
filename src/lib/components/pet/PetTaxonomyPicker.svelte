<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { getPetBreedOption, getPetBreedOptions, getPetSpeciesOption, petSpeciesOptions, type PetBreed, type PetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { i18n, t } from '$lib/i18n/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';

	type PickerStep = 'species' | 'breed';

	let { species = $bindable(null), breed = $bindable(null), sex = $bindable(''), disabled = false }: { species?: PetSpecies | null; breed?: PetBreed | null; sex?: string; disabled?: boolean } = $props();

	let open = $state(false);
	let activeStep = $state<PickerStep>('species');
	let breedSearch = $state('');
	let manualBreedMode = $state(false);
	let manualBreedName = $state('');

	const speciesOption = $derived(getPetSpeciesOption(species));
	const breedOption = $derived(getPetBreedOption(breed));
	const breedDisplayName = $derived(breedOption ? t(breedOption.labelKey) : (breed?.trim() ?? ''));
	const breedOptions = $derived.by(() => {
		if (!species) return [];
		const search = normalizeSearchText(breedSearch);

		const collator = new Intl.Collator(i18n.locale, {
			usage: 'sort',
			sensitivity: 'base',
			ignorePunctuation: true
		});

		const options = getPetBreedOptions(species)
			.slice()
			.sort((left, right) => collator.compare(t(left.labelKey), t(right.labelKey)));

		if (!search) return options;
		return options.filter((option) => normalizeSearchText(t(option.labelKey)).includes(search));
	});
	const optionGridClass = 'grid h-[min(26rem,calc(100vh-12rem))] auto-rows-min grid-cols-1 content-start gap-2 overflow-y-auto pr-1 landscape:max-md:grid-cols-2 md:grid-cols-2 lg:grid-cols-3';

	function optionClass(selected: boolean, compact = false): string {
		return `flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors ${compact ? 'h-16' : 'min-h-16'} ${selected ? 'border-primary bg-primary/10 text-foreground ring-2 ring-ring/30' : 'border-border bg-background text-foreground hover:bg-accent'}`;
	}

	function summaryClass(selected: boolean): string {
		return `flex h-14 min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-border bg-background' : 'border-dashed border-border bg-muted/30 text-muted-foreground'}`;
	}

	function normalizeSearchText(value: string): string {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	}

	function openDialog(step: PickerStep) {
		if (disabled) return;
		activeStep = step === 'breed' && !species ? 'species' : step;
		breedSearch = '';
		manualBreedMode = false;
		manualBreedName = '';
		open = true;
	}

	function closeDialog() {
		breedSearch = '';
		manualBreedMode = false;
		manualBreedName = '';
		open = false;
	}

	function chooseSpecies(nextSpecies: PetSpecies) {
		species = nextSpecies;

		const nextBreeds = getPetBreedOptions(nextSpecies);
		if (!breed || !nextBreeds.some((option) => option.id === breed)) {
			breed = null;
		}

		breedSearch = '';
		manualBreedMode = false;
		manualBreedName = '';
		activeStep = 'breed';
	}

	function chooseBreed(nextBreed: PetBreed) {
		breed = nextBreed;
		closeDialog();
	}

	function startManualBreed() {
		manualBreedName = breedSearch.trim();
		manualBreedMode = true;
	}

	function cancelManualBreed() {
		manualBreedMode = false;
		manualBreedName = '';
	}

	function chooseManualBreed() {
		const nextBreed = manualBreedName.trim();
		if (!nextBreed) return;
		chooseBreed(nextBreed as PetBreed);
	}

	function submitManualBreedOnEnter(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		chooseManualBreed();
	}

	function useFallbackImage(event: Event, fallbackImagePath: string) {
		const image = event.currentTarget as HTMLImageElement | null;
		if (!image || image.dataset.fallbackApplied === 'true') return;

		image.dataset.fallbackApplied = 'true';
		image.src = fallbackImagePath;
	}

	function closeIfBackdrop(event: PointerEvent) {
		if (event.currentTarget === event.target) closeDialog();
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (open && event.key === 'Escape') closeDialog();
	}

	onMount(() => {
		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	});
</script>

<div class="flex flex-col gap-2">
	<div class="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
		<button type="button" class={summaryClass(Boolean(speciesOption))} aria-label={`${t('pet.species')}: ${speciesOption ? t(speciesOption.labelKey) : t('common.notInformed')}`} disabled={disabled} onclick={() => openDialog('species')}>
			{#if speciesOption}
				<img class="size-10 shrink-0 rounded-md border border-border bg-muted object-cover" src={speciesOption.imagePath} alt="" aria-hidden="true" loading="lazy" onerror={(event) => useFallbackImage(event, speciesOption.fallbackImagePath)} />
			{:else}
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><PawPrint class="size-4" /></span>
			{/if}
			<span class="min-w-0">
				<span class="block truncate text-xs font-semibold uppercase text-muted-foreground">{t('pet.species')}</span>
				<span class="block truncate text-sm font-medium">{speciesOption ? t(speciesOption.labelKey) : t('common.notInformed')}</span>
			</span>
		</button>

		<button type="button" class={summaryClass(Boolean(breedDisplayName))} aria-label={`${t('pet.breed')}: ${breedDisplayName || t('common.notInformed')}`} disabled={disabled} onclick={() => openDialog('breed')}>
			{#if breedOption}
				<img class="size-10 shrink-0 rounded-md border border-border bg-muted object-cover" src={breedOption.imagePath} alt="" aria-hidden="true" loading="lazy" onerror={(event) => useFallbackImage(event, breedOption.fallbackImagePath)} />
			{:else}
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><PawPrint class="size-4" /></span>
			{/if}
			<span class="min-w-0">
				<span class="block truncate text-xs font-semibold uppercase text-muted-foreground">{t('pet.breed')}</span>
				<span class="block truncate text-sm font-medium">{breedDisplayName || t('common.notInformed')}</span>
			</span>
		</button>

		<Select 
			bind:value={sex}
			options={[
				{ value: '', label: t('pet.sexUnknown') },
				{ value: 'M', label: t('pet.sexMale') },
				{ value: 'F', label: t('pet.sexFemale') },
			]}
			{disabled}
			ariaLabel={t('pet.sex')}
		>
			{#snippet trigger()}
				<div class={summaryClass(Boolean(sex))}>
					<span class="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
						<span class="text-sm font-bold">{sex === 'M' ? '♂' : sex === 'F' ? '♀' : '?'}</span>
					</span>
					<span class="min-w-0 pointer-events-none">
						<span class="block truncate text-xs font-semibold uppercase text-muted-foreground">{t('pet.sex')}</span>
						<span class="block truncate text-sm font-medium">
							{sex === 'M' ? t('pet.sexMale') : sex === 'F' ? t('pet.sexFemale') : t('pet.sexUnknown')}
						</span>
					</span>
				</div>
			{/snippet}
		</Select>
	</div>

	{#if open}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
			<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t('pet.taxonomyDialogTitle')}>
				<header class="flex items-center justify-between gap-3 border-b border-border p-4">
					<div class="min-w-0">
						<h3 class="truncate text-base font-semibold">{t('pet.taxonomyDialogTitle')}</h3>
						<p class="mt-1 truncate text-xs text-muted-foreground">{speciesOption ? t(speciesOption.labelKey) : t('common.notInformed')} · {breedDisplayName || t('common.notInformed')}</p>
					</div>

					<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t('pet.closeTaxonomy')} title={t('pet.closeTaxonomy')} onclick={closeDialog}>
						<X class="size-4" />
					</button>
				</header>

				<div class="overflow-hidden">
					<div class="flex w-[200%] transition-transform duration-300 ease-out {activeStep === 'breed' ? '-translate-x-1/2' : 'translate-x-0'}">
						<section class="w-1/2 shrink-0 p-4" aria-label={t('pet.chooseSpecies')}>
							<h4 class="mb-3 text-sm font-semibold">{t('pet.chooseSpecies')}</h4>
							<div class={optionGridClass}>
								{#each petSpeciesOptions as option}
									<button type="button" class={optionClass(species === option.id, true)} aria-label={`${t('pet.species')}: ${t(option.labelKey)}`} aria-pressed={species === option.id} onclick={() => chooseSpecies(option.id)}>
										<img class="size-11 shrink-0 rounded-md border border-border bg-muted object-cover" src={option.imagePath} alt="" aria-hidden="true" loading="lazy" onerror={(event) => useFallbackImage(event, option.fallbackImagePath)} />
										<span class="min-w-0 truncate text-sm font-semibold">{t(option.labelKey)}</span>
									</button>
								{/each}
							</div>
						</section>

						<section class="w-1/2 shrink-0 p-4" aria-label={t('pet.chooseBreed')}>
							<div class="mb-3 flex items-center gap-2">
								<button type="button" class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t('pet.backToSpecies')} title={t('pet.backToSpecies')} onclick={() => (activeStep = 'species')}>
									<ArrowLeft class="size-4" />
								</button>
								<h4 class="min-w-0 truncate text-sm font-semibold">{t('pet.chooseBreed')}</h4>
							</div>

							{#if species}
								<div class="mb-3 flex flex-col gap-1">
									<label class="text-xs font-semibold uppercase text-muted-foreground" for="pet-breed-search">{t('pet.breedSearch')}</label>
									<div class="relative">
										<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
										<input id="pet-breed-search" class="h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={breedSearch} placeholder={t('pet.breedSearchPlaceholder')} aria-label={t('pet.breedSearch')} />
									</div>
								</div>

								{#if manualBreedMode}
									<div class="mb-3 rounded-md border border-border bg-muted/30 p-3">
										<label class="flex flex-col gap-1 text-sm font-medium">
											<span class="flex min-w-0 items-baseline justify-between gap-2">
												<span>{t('pet.manualBreedName')}</span>
												<CharacterLimitHint value={manualBreedName} max={FIELD_LIMITS.petBreed} />
											</span>
											<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={manualBreedName} maxlength={FIELD_LIMITS.petBreed} placeholder={t('pet.manualBreedNamePlaceholder')} aria-label={t('pet.manualBreedName')} onkeydown={submitManualBreedOnEnter} />
										</label>
										<div class="mt-3 flex flex-wrap gap-2">
											<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" onclick={cancelManualBreed}>{t('actions.cancel')}</button>
											<button type="button" class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={!manualBreedName.trim()} onclick={chooseManualBreed}>{t('pet.useManualBreed')}</button>
										</div>
									</div>
								{:else}
								<div class={optionGridClass}>
									<button type="button" class={optionClass(false)} aria-label={t('pet.manualBreed')} onclick={startManualBreed}>
										<span class="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground"><PawPrint class="size-5" /></span>
										<span class="min-w-0 truncate text-sm font-medium">{t('pet.manualBreed')}</span>
									</button>
									{#each breedOptions as option}
										<button type="button" class={optionClass(breed === option.id)} aria-label={`${t('pet.breed')}: ${t(option.labelKey)}`} aria-pressed={breed === option.id} onclick={() => chooseBreed(option.id)}>
											<img class="size-14 shrink-0 rounded-md border border-border bg-muted object-cover" src={option.imagePath} alt="" aria-hidden="true" loading="lazy" onerror={(event) => useFallbackImage(event, option.fallbackImagePath)} />
											<span class="min-w-0 truncate text-sm font-medium">{t(option.labelKey)}</span>
										</button>
									{/each}
								</div>
								{#if breedOptions.length === 0}
									<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('pet.breedSearchEmpty')}</p>
								{/if}
								{/if}
							{:else}
								<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('pet.selectSpeciesFirst')}</p>
							{/if}
						</section>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>