<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Pill from '@lucide/svelte/icons/pill';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Syringe from '@lucide/svelte/icons/syringe';
	import type { Component, Snippet } from 'svelte';

	const { children } = $props<{ children: Snippet }>();

	type DashboardView = 'overview' | 'vaccines' | 'antiparasitics';

	const dashboardViews = ['overview', 'vaccines', 'antiparasitics'] as const satisfies readonly DashboardView[];

	const viewOptions: { view: DashboardView; labelKey: Parameters<typeof t>[0]; icon: Component }[] = [
		{ view: 'overview', labelKey: 'analysis.view.general', icon: ChartColumn },
		{ view: 'vaccines', labelKey: 'analysis.view.vaccines', icon: Syringe },
		{ view: 'antiparasitics', labelKey: 'analysis.view.antiparasitics', icon: Pill }
	];

	const activeView = $derived(resolveActiveView(page.url.pathname));

	function resolveActiveView(pathname: string): DashboardView {
		const segment = pathname.split('/').filter(Boolean)[1];
		if (dashboardViews.includes(segment as DashboardView)) return segment as DashboardView;
		return 'overview';
	}

	function viewHref(view: DashboardView): string {
		return `/dashboard/${view}`;
	}

	onMount(() => {
		void clinic.init();
	});
</script>

<svelte:head>
	<title>{t('analysis.dashboard.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">{t('analysis.dashboard.kicker')}</p>
			<h2 class="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t('analysis.dashboard.title')}</h2>
			<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.dashboard.description')}</p>
		</div>
		<button class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-60" type="button" disabled={clinic.loading} onclick={() => void clinic.refresh()}>
			<RotateCw class="size-4" />
			{t('actions.refresh')}
		</button>
	</header>

	<div class="grid grid-cols-1 gap-1 rounded-md border border-border bg-muted p-1 sm:grid-cols-3" role="tablist" aria-label={t('analysis.dashboard.title')}>
		{#each viewOptions as option}
			<a
				href={viewHref(option.view)}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeView === option.view ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
				role="tab"
				aria-selected={activeView === option.view}
			>
				<option.icon class="size-4" />
				<span class="truncate">{t(option.labelKey)}</span>
			</a>
		{/each}
	</div>

	{#if clinic.error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{clinic.error}</p>
	{/if}

	{#if clinic.needsSetup}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<p class="text-sm font-medium text-muted-foreground">{t('setup.title')}</p>
			<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('setup.description')}</p>
			<a href="/" class="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95">{t('nav.records')}</a>
		</section>
	{:else if clinic.loading || !clinic.dashboard}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{#each Array(4) as _}
				<div class="h-32 animate-pulse rounded-md bg-muted"></div>
			{/each}
		</div>
	{:else}
		{@render children()}
	{/if}
</section>
