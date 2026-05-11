<script lang="ts">
	import { onMount } from 'svelte';
	import type { SearchResult, SearchResultKind } from '$lib/persistence/repositories/search.repository.js';
	import { t } from '$lib/i18n/index.js';
	import { searchEverywhere } from '$lib/services/clinic.service.js';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Search from '@lucide/svelte/icons/search';
	import User from '@lucide/svelte/icons/user';

	const recentSearchStorageKey = 'veterinary-clinic:recent-search-results';
	const recentSearchLimit = 15;

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let recentResults = $state<SearchResult[]>([]);
	let error = $state<string | null>(null);

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

	async function runSearch() {
		try {
			results = await searchEverywhere(query);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : String(exception);
		}
	}

	function loadRecentResults() {
		if (typeof localStorage === 'undefined') return;

		try {
			const parsed = JSON.parse(localStorage.getItem(recentSearchStorageKey) ?? '[]');
			recentResults = Array.isArray(parsed) ? parsed.slice(0, recentSearchLimit) : [];
		} catch {
			recentResults = [];
		}
	}

	function saveRecentResults(nextResults: SearchResult[]) {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(recentSearchStorageKey, JSON.stringify(nextResults.slice(0, recentSearchLimit)));
	}

	function rememberResult(result: SearchResult) {
		const key = resultKey(result);
		const nextResults = [result, ...recentResults.filter((item) => resultKey(item) !== key)].slice(0, recentSearchLimit);
		recentResults = nextResults;
		saveRecentResults(nextResults);
	}

	onMount(() => {
		loadRecentResults();
	});
</script>

<svelte:head>
	<title>{t('search.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('search.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('search.description')}</p>
	</header>

	<label class="flex flex-col gap-2 text-sm font-medium">
		<span>{t('search.label')}</span>
		<span class="relative">
			<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<input class="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder={t('search.placeholder')} bind:value={query} oninput={() => void runSearch()} />
		</span>
	</label>

	{#if error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</p>
	{/if}

	{#if showRecentResults}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm">
			<h3 class="text-sm font-semibold">{t('search.recentTitle')}</h3>
			<p class="mt-1 text-sm text-muted-foreground">{t('search.recentDescription')}</p>
		</section>
	{/if}

	<div class="grid gap-2">
		{#each visibleResults as result (resultKey(result))}
			<a href={result.href} class="flex items-start gap-3 rounded-md border border-border bg-card p-3 shadow-sm hover:bg-accent" onclick={() => rememberResult(result)}>
				{#if result.kind === 'owner'}
					<User class="mt-0.5 size-4 shrink-0 text-primary" />
				{:else if result.kind === 'pet'}
					<PawPrint class="mt-0.5 size-4 shrink-0 text-primary" />
				{:else}
					<ClipboardPenLine class="mt-0.5 size-4 shrink-0 text-primary" />
				{/if}
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium">{result.title}</span>
					<span class="block truncate text-xs text-muted-foreground">{kindLabel(result.kind)} · {result.subtitle}</span>
				</span>
			</a>
		{:else}
			{#if query.trim().length > 1}
				<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('search.empty')}</p>
			{/if}
		{/each}
	</div>
</section>