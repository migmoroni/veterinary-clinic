<script lang="ts">
	import { onMount, tick } from 'svelte';
	import OwnerContactDialog from '$lib/components/owner/OwnerContactDialog.svelte';
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import type { SearchResult, SearchResultKind } from '$lib/persistence/repositories/search.repository.js';
	import { t } from '$lib/i18n/index.js';
	import { RECENT_SEARCH_STORAGE_KEY } from '$lib/services/client-state.service.js';
	import { loadOwnerAssociatedContactsByOwnerIds, loadOwnerAvatarsByOwnerIds, loadPetAvatarsByPetIds, searchEverywhere } from '$lib/services/clinic.service.js';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import Phone from '@lucide/svelte/icons/phone';
	import Search from '@lucide/svelte/icons/search';

	const recentSearchLimit = 15;

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let recentResults = $state<SearchResult[]>([]);
	let error = $state<string | null>(null);
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerAssociatedContact[]>([]);
	let resultsListElement = $state<HTMLDivElement>();
	let resultsListHasMoreBelow = $state(false);

	const showRecentResults = $derived(query.trim().length === 0 && recentResults.length > 0);
	const visibleResults = $derived(showRecentResults ? recentResults : results);

	function kindLabel(kind: SearchResultKind): string {
		if (kind === 'owner') return t('search.kind.owner');
		if (kind === 'pet') return t('search.kind.pet');
		return t('search.kind.record');
	}

	function resultKey(result: SearchResult): string {
		return `${result.kind}:${result.id}:${result.href}`;
	}

	function resultSubtitle(result: SearchResult): string {
		if (result.kind === 'pet' && result.subtitle.trim().length === 0) return t('owner.unassigned');
		return result.subtitle;
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

	async function runSearch() {
		try {
			results = await searchEverywhere(query);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	function persistableSearchResult(result: SearchResult): SearchResult {
		const { ownerAvatarBytes: _ownerAvatarBytes, petAvatarBytes: _petAvatarBytes, ...persistableResult } = result;
		return persistableResult;
	}

	async function hydrateRecentResults(baseResults: SearchResult[]): Promise<SearchResult[]> {
		const ownerIds = baseResults.filter((result) => result.kind === 'owner').map((result) => result.id);
		const petIds = baseResults.filter((result) => result.kind === 'pet').map((result) => result.id);
		if (ownerIds.length === 0 && petIds.length === 0) return baseResults;

		const [contactsResult, ownerAvatarsResult, petAvatarsResult] = await Promise.allSettled([loadOwnerAssociatedContactsByOwnerIds(ownerIds), loadOwnerAvatarsByOwnerIds(ownerIds), loadPetAvatarsByPetIds(petIds)]);
		const contactsByOwnerId = contactsResult.status === 'fulfilled' ? contactsResult.value : new Map<number, OwnerAssociatedContact[]>();
		const avatarBytesByOwnerId = ownerAvatarsResult.status === 'fulfilled' ? ownerAvatarsResult.value : new Map<number, Uint8Array | null>();
		const avatarBytesByPetId = petAvatarsResult.status === 'fulfilled' ? petAvatarsResult.value : new Map<number, Uint8Array | null>();

		return baseResults.map((result) => {
			if (result.kind === 'owner') return { ...result, ownerAvatarBytes: avatarBytesByOwnerId.get(result.id) ?? null, ownerContacts: contactsByOwnerId.get(result.id) ?? result.ownerContacts ?? [] };
			if (result.kind === 'pet') return { ...result, petAvatarBytes: avatarBytesByPetId.get(result.id) ?? null };
			return result;
		});
	}

	async function loadRecentResults() {
		if (typeof localStorage === 'undefined') return;

		try {
			const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCH_STORAGE_KEY) ?? '[]');
			const baseResults: SearchResult[] = Array.isArray(parsed) ? parsed.slice(0, recentSearchLimit) : [];
			recentResults = await hydrateRecentResults(baseResults);
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

<section class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('search.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('search.description')}</p>
	</header>

	<div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
		<label class="flex min-w-0 flex-col gap-2 text-sm font-medium">
			<span>{t('search.label')}</span>
			<span class="relative">
				<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<input class="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder={t('search.placeholder')} bind:value={query} maxlength={FIELD_LIMITS.searchQuery} oninput={() => void runSearch()} />
			</span>
		</label>

		<p class="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-sm">
			{resultCountLabel(visibleResults.length)}
		</p>
	</div>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if showRecentResults}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm">
			<h3 class="text-sm font-semibold">{t('search.recentTitle')}</h3>
			<p class="mt-1 text-sm text-muted-foreground">{t('search.recentDescription')}</p>
		</section>
	{/if}

	<div class="relative">
		<div bind:this={resultsListElement} class="grid max-h-[min(34rem,calc(100vh-18rem))] gap-2 overflow-y-scroll pr-3 [scrollbar-gutter:stable]" onscroll={updateResultsListScrollHint}>
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
						{:else}
							<ClipboardPenLine class="mt-0.5 size-4 shrink-0 text-primary" />
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