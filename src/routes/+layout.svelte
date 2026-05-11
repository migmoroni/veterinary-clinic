<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n/index.js';
	import { hasDatabaseFile } from '$lib/native/database-file.js';
	import { loadLocalePreference, loadTypographyPreference } from '$lib/services/preferences.service.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Search from '@lucide/svelte/icons/search';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Settings from '@lucide/svelte/icons/settings';

	let { children } = $props();

	const navItems = [
		{ href: '/', labelKey: 'nav.records', icon: LayoutDashboard },
		{ href: '/search', labelKey: 'nav.search', icon: Search },
		{ href: '/owners/new', labelKey: 'nav.newOwner', icon: UserPlus },
		{ href: '/settings', labelKey: 'nav.settings', icon: Settings }
	] as const;

	const showBackButton = $derived(page.url.pathname !== '/');

	function isActive(href: string) {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}

	async function goBack() {
		if (window.history.length > 1) {
			window.history.back();
			return;
		}

		await goto('/');
	}

	async function loadDatabasePreferences() {
		try {
			if (await hasDatabaseFile()) {
				await loadLocalePreference();
				await loadTypographyPreference();
			}
		} catch {
			// The setup screen can render before the local database exists.
		}
	}

	onMount(() => {
		void loadDatabasePreferences();
	});
</script>

<div class="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
	<header class="hidden shrink-0 border-b border-border bg-background/95 md:block">
		<div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 lg:px-8">
			<div class="min-w-0">
				<p class="text-xs font-semibold uppercase text-muted-foreground">{t('app.brandKicker')}</p>
				<h1 class="truncate text-lg font-semibold">{t('app.name')}</h1>
			</div>

			<div class="flex w-full max-w-3xl items-center justify-end gap-2">
				{#if showBackButton}
					<button type="button" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent" aria-label={t('common.back')} title={t('common.back')} onclick={() => void goBack()}>
						<ArrowLeft class="size-4" />
						{t('common.back')}
					</button>
				{/if}

				<nav class="grid w-full max-w-xl grid-cols-4 gap-2">
					{#each navItems as item}
						<a
							href={item.href}
							class="flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(item.href)
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
						>
							<item.icon class="size-4 shrink-0" />
							<span class="truncate">{t(item.labelKey)}</span>
						</a>
					{/each}
				</nav>
			</div>
		</div>
	</header>

	<main class="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0">
		{@render children()}
	</main>

	<nav class="grid h-16 shrink-0 grid-cols-4 border-t border-border bg-background md:hidden">
		{#each navItems as item}
			<a
				href={item.href}
				aria-label={t(item.labelKey)}
				class="flex flex-col items-center justify-center gap-1 text-xs {isActive(item.href)
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				<item.icon class="size-5" />
				<span class="max-w-full truncate px-1">{t(item.labelKey)}</span>
			</a>
		{/each}
	</nav>
</div>
