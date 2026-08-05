<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { OwnerContactDialog } from '@vet/modules/registry/owners';
	import { OwnerAvatar } from '@vet/modules/registry/owners';
	import { PetAvatar } from '@vet/modules/registry/pets';
	import BinaryImage from '@vet/ui/components/shared/BinaryImage.svelte';
	import DebouncedSearchField from '@vet/ui/components/ui/DebouncedSearchField.svelte';
	import type { OwnerAssociatedContact } from '@vet/types/domain/owner/owner.js';
	import { createLatestAsyncSearchController } from '@vet/types/domain/search/search-controller.js';
	import { SEARCH_RESULT_KINDS, type SearchResult, type SearchResultKind } from '@vet/types/domain/search/search.js';
	import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import { RECENT_SEARCH_STORAGE_KEY } from '@vet/core-local/services/client-state.service.js';
	import { filterActiveSearchResults, loadOwnerAssociatedContactsByOwnerIds, loadOwnerAvatarsByOwnerIds, loadPetAvatarsByPetIds, searchEverywhere } from '$lib/services/clinic.service.js';
	import Activity from '@lucide/svelte/icons/activity';
	import Building2 from '@lucide/svelte/icons/building-2';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Pill from '@lucide/svelte/icons/pill';
	import Phone from '@lucide/svelte/icons/phone';

	const recentSearchLimit = 50;
	const searchFilterKinds = SEARCH_RESULT_KINDS;

	let query = $state('');
	let searchDraft = $state('');
	let results = $state<SearchResult[]>([]);
	let recentResults = $state<SearchResult[]>([]);
	let selectedKind = $state<SearchResultKind | null>(null);
	let error = $state<string | null>(null);
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerAssociatedContact[]>([]);
	let resultsListElement = $state<HTMLDivElement>();
	let resultsListHasMoreBelow = $state(false);

	const hasKindFilter = $derived(selectedKind !== null);
	const filteredResults = $derived(hasKindFilter ? results.filter((result) => result.kind === selectedKind) : results);
	const filteredRecentResults = $derived(hasKindFilter ? recentResults.filter((result) => result.kind === selectedKind) : recentResults);
	const showRecentResults = $derived(searchDraft.trim().length === 0 && filteredRecentResults.length > 0);
	const visibleResults = $derived(showRecentResults ? filteredRecentResults : filteredResults);

	function kindLabel(kind: SearchResultKind): string {
		if (kind === 'owner') return t('search.kind.owner');
		if (kind === 'pet') return t('search.kind.pet');
		if (kind === 'breed') return t('search.kind.breed');
		if (kind === 'product') return t('search.kind.product');
		if (kind === 'manufacturer') return t('search.kind.manufacturer');
		if (kind === 'activeIngredient') return t('search.kind.activeIngredient');
		return t('search.kind.condition');
	}

	function resultKey(result: SearchResult): string {
		return `${result.kind}:${result.id}:${result.href}`;
	}

	function resultSubtitle(result: SearchResult): string {
		if (result.kind === 'pet' && result.subtitle.trim().length === 0) return t('owner.unassigned');
		return result.subtitle;
	}

	function normalizeReferenceResult(result: SearchResult): SearchResult {
		const normalizedResult: SearchResult = {
			kind: result.kind,
			id: result.id,
			ownerId: result.ownerId,
			petId: result.petId,
			href: result.href,
			title: result.title,
			subtitle: result.subtitle,
			referenceImageBytes: result.referenceImageBytes,
			ownerAvatarBytes: result.ownerAvatarBytes,
			petAvatarBytes: result.petAvatarBytes,
			ownerContacts: result.ownerContacts
		};
		if (normalizedResult.kind === 'breed') return { ...normalizedResult, href: `/breeds/${normalizedResult.id}` };
		if (normalizedResult.kind === 'product') return { ...normalizedResult, href: `/formulary/products/${normalizedResult.id}` };
		if (normalizedResult.kind === 'manufacturer') return { ...normalizedResult, href: `/formulary/manufacturers/${normalizedResult.id}` };
		if (normalizedResult.kind === 'activeIngredient') return { ...normalizedResult, href: `/formulary/active-ingredients/${normalizedResult.id}` };
		if (normalizedResult.kind === 'condition') return { ...normalizedResult, href: `/formulary/conditions/${normalizedResult.id}` };
		return normalizedResult;
	}

	function textResultId(result: SearchResult): string | null {
		return result.id.trim().length > 0 ? result.id : null;
	}

	function resultCountLabel(count: number): string {
		return t(count === 1 ? 'search.resultCountOne' : 'search.resultCount').replace('{count}', String(count));
	}

	function updateResultsListScrollHint() {
		if (!resultsListElement) {
			resultsListHasMoreBelow = false;
			return;
		}

		resultsListHasMoreBelow = resultsListElement.scrollTop + resultsListElement.clientHeight < resultsListElement.scrollHeight - 2;
	}

	async function refreshResultsListScrollHint() {
		await tick();
		updateResultsListScrollHint();
	}

	const searchController = createLatestAsyncSearchController<SearchResult[]>({
		search: (value) => searchEverywhere(value, selectedKind ? [selectedKind] : []),
		onerror: (exception) => {
			error = exception instanceof Error ? exception.message : String(exception);
		},
		onsuccess: (nextResults) => {
			results = nextResults;
			error = null;
		}
	});

	async function runSearch(value = searchDraft) {
		query = value;
		await searchController.run(value);
	}

	function clearSearch(value: string) {
		query = value;
		searchController.invalidate();
		results = [];
		error = null;
	}

	function toggleKindFilter(kind: SearchResultKind) {
		selectedKind = selectedKind === kind ? null : kind;
		void runSearch(searchDraft);
	}

	function kindFilterClass(kind: SearchResultKind): string {
		const baseClass = 'inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition';
		return selectedKind === kind ? `${baseClass} border-primary bg-primary text-primary-foreground` : `${baseClass} border-border bg-card text-foreground hover:bg-accent`;
	}

	function persistableSearchResult(result: SearchResult): SearchResult {
		return {
			kind: result.kind,
			id: result.id,
			ownerId: result.ownerId,
			petId: result.petId,
			href: result.href,
			title: result.title,
			subtitle: result.subtitle,
			ownerContacts: result.ownerContacts
		};
	}

	async function hydrateRecentResults(baseResults: SearchResult[]): Promise<SearchResult[]> {
		const normalizedBaseResults = baseResults.map(normalizeReferenceResult);
		const ownerIds = normalizedBaseResults.filter((result) => result.kind === 'owner').map(textResultId).filter((id): id is string => id !== null);
		const petIds = normalizedBaseResults.filter((result) => result.kind === 'pet').map(textResultId).filter((id): id is string => id !== null);
		if (ownerIds.length === 0 && petIds.length === 0) return normalizedBaseResults;

		const [contactsResult, ownerAvatarsResult, petAvatarsResult] = await Promise.allSettled([loadOwnerAssociatedContactsByOwnerIds(ownerIds), loadOwnerAvatarsByOwnerIds(ownerIds), loadPetAvatarsByPetIds(petIds)]);
		const contactsByOwnerId = contactsResult.status === 'fulfilled' ? contactsResult.value : new Map<string, OwnerAssociatedContact[]>();
		const avatarBytesByOwnerId = ownerAvatarsResult.status === 'fulfilled' ? ownerAvatarsResult.value : new Map<string, Uint8Array | null>();
		const avatarBytesByPetId = petAvatarsResult.status === 'fulfilled' ? petAvatarsResult.value : new Map<string, Uint8Array | null>();

		return normalizedBaseResults.map((result) => {
			const id = textResultId(result);
			if (result.kind === 'owner' && id !== null) return { ...result, ownerAvatarBytes: avatarBytesByOwnerId.get(id) ?? null, ownerContacts: contactsByOwnerId.get(id) ?? result.ownerContacts ?? [] };
			if (result.kind === 'pet' && id !== null) return { ...result, petAvatarBytes: avatarBytesByPetId.get(id) ?? null };
			return result;
		});
	}

	async function loadRecentResults() {
		if (typeof localStorage === 'undefined') return;

		try {
			const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCH_STORAGE_KEY) ?? '[]');
			const baseResults: SearchResult[] = Array.isArray(parsed) ? parsed.slice(0, recentSearchLimit) : [];
			const activeResults = await filterActiveSearchResults(baseResults);
			recentResults = await hydrateRecentResults(activeResults);
			if (activeResults.length !== baseResults.length) saveRecentResults(activeResults);
		} catch {
			recentResults = [];
		}
	}

	function saveRecentResults(nextResults: SearchResult[]) {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(nextResults.slice(0, recentSearchLimit).map(persistableSearchResult)));
	}

	function rememberResult(result: SearchResult) {
		const key = resultKey(result);
		const nextResults = [result, ...recentResults.filter((item) => resultKey(item) !== key)].slice(0, recentSearchLimit);
		recentResults = nextResults;
		saveRecentResults(nextResults);
	}

	function ownerContactsFor(result: SearchResult): OwnerAssociatedContact[] {
		if (result.kind !== 'owner') return [];
		return (result.ownerContacts ?? []).filter((contact) => contact.value.trim().length > 0);
	}

	function openOwnerContact(result: SearchResult) {
		if (result.kind !== 'owner') return;

		const contacts = ownerContactsFor(result);
		if (contacts.length === 0) return;

		contactDialogOwnerName = result.title;
		contactDialogContacts = contacts;
		contactDialogOpen = true;
	}

	onMount(() => {
		void loadRecentResults();
	});

	$effect(() => {
		visibleResults.length;
		void refreshResultsListScrollHint();
	});
</script>

<svelte:window onresize={updateResultsListScrollHint} />

<svelte:head>
	<title>{t('search.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-5 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
	<header class="shrink-0 border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('search.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('search.description')}</p>
	</header>

	<div class="grid shrink-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
		<DebouncedSearchField class="gap-2" inputClass="h-11" label={t('search.label')} placeholder={t('search.placeholder')} bind:value={query} bind:draftValue={searchDraft} maxLength={FIELD_LIMITS.searchQuery} minLength={1} onsearch={(value) => void runSearch(value)} onclear={clearSearch} />

		<p class="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-sm">
			{resultCountLabel(visibleResults.length)}
		</p>
	</div>

	<fieldset class="flex shrink-0 flex-wrap items-center gap-2">
		<legend class="sr-only">{t('search.filters')}</legend>
		<span class="mr-1 text-sm font-medium">{t('search.filters')}</span>
		{#each searchFilterKinds as kind}
			<label class={kindFilterClass(kind)}>
				<input class="size-4 accent-primary" type="checkbox" checked={selectedKind === kind} onchange={() => toggleKindFilter(kind)} />
				<span>{kindLabel(kind)}</span>
			</label>
		{/each}
		<span class="text-xs text-muted-foreground">{t('search.filtersEmptyHint')}</span>
	</fieldset>

	{#if error}
		<p class="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if showRecentResults}
		<section class="shrink-0 rounded-md border border-border bg-card p-4 shadow-sm">
			<h3 class="text-sm font-semibold">{t('search.recentTitle')}</h3>
			<p class="mt-1 text-sm text-muted-foreground">{t('search.recentDescription')}</p>
		</section>
	{/if}

	<div class="relative min-h-0 flex-1">
		<div bind:this={resultsListElement} class="grid h-full content-start gap-2 overflow-y-auto overscroll-contain pr-3 scrollbar-gutter-stable" onscroll={updateResultsListScrollHint}>
			{#each visibleResults as result (resultKey(result))}
				{#if result.kind === 'owner'}
					<article class="flex items-start gap-2 rounded-md border border-border bg-card p-3 shadow-sm hover:bg-accent">
						<a href={result.href} class="flex min-w-0 flex-1 items-start gap-3" onclick={() => rememberResult(result)}>
							<OwnerAvatar avatarBytes={result.ownerAvatarBytes} ownerName={result.title} className="mt-0.5 size-10" iconClass="size-5 text-primary" />
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium">{result.title}</span>
								<span class="block truncate text-xs text-muted-foreground">{kindLabel(result.kind)} · {resultSubtitle(result)}</span>
							</span>
						</a>

						{#if ownerContactsFor(result).length > 0}
							<button
								type="button"
								class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-accent"
								onclick={() => openOwnerContact(result)}
								aria-label={`${t('owner.contact')}: ${result.title}`}
							>
								<Phone class="size-4" />
								{t('owner.contact')}
							</button>
						{/if}
					</article>
				{:else}
					<a href={result.href} class="flex items-start gap-3 rounded-md border border-border bg-card p-3 shadow-sm hover:bg-accent" onclick={() => rememberResult(result)}>
						{#if result.kind === 'pet'}
							<PetAvatar avatarBytes={result.petAvatarBytes} petName={result.title} className="mt-0.5 size-10" iconClass="size-5 text-primary" />
						{:else if result.kind === 'breed'}
							<BinaryImage imageBytes={result.referenceImageBytes} alt={result.title} className="mt-0.5 size-10" imageClass="h-full w-full object-cover" iconClass="size-5 text-primary" fallbackIcon={PawPrint} />
						{:else if result.kind === 'product'}
							<BinaryImage imageBytes={result.referenceImageBytes} alt={result.title} className="mt-0.5 size-10" imageClass="h-full w-full object-contain p-1.5" iconClass="size-5 text-primary" fallbackIcon={Pill} />
						{:else if result.kind === 'manufacturer'}
							<BinaryImage imageBytes={result.referenceImageBytes} alt={result.title} className="mt-0.5 size-10" imageClass="h-full w-full object-contain p-1.5" iconClass="size-5 text-primary" fallbackIcon={Building2} />
						{:else if result.kind === 'activeIngredient'}
							<BinaryImage imageBytes={result.referenceImageBytes} alt={result.title} className="mt-0.5 size-10" imageClass="h-full w-full object-contain p-1.5" iconClass="size-5 text-primary" fallbackIcon={FlaskConical} />
						{:else if result.kind === 'condition'}
							<BinaryImage imageBytes={result.referenceImageBytes} alt={result.title} className="mt-0.5 size-10" imageClass="h-full w-full object-contain p-1.5" iconClass="size-5 text-primary" fallbackIcon={Activity} />
						{/if}
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium">{result.title}</span>
							<span class="block truncate text-xs text-muted-foreground">{kindLabel(result.kind)} · {resultSubtitle(result)}</span>
						</span>
					</a>
				{/if}
			{:else}
				{#if query.trim().length > 1}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('search.empty')}</p>
				{/if}
			{/each}
		</div>

		{#if resultsListHasMoreBelow}
			<div class="pointer-events-none absolute bottom-0 left-0 right-5 h-20 rounded-b-md bg-linear-to-t from-background via-background/90 to-transparent"></div>
		{/if}
	</div>
</section>

<OwnerContactDialog bind:open={contactDialogOpen} ownerName={contactDialogOwnerName} contacts={contactDialogContacts} />
