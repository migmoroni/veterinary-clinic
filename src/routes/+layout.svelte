<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n/index.js';
	import { hasDatabaseFile } from '$lib/native/database-file.js';
	import { AUTOMATIC_BACKUP_CHECK_INTERVAL_MS, createAutomaticBackupIfDue } from '$lib/services/backup.service.js';
	import {
		adjustTypographyZoom,
		loadLocalePreference,
		loadTypographyPreference,
		resetTypographyZoom
	} from '$lib/services/preferences.service.js';
	import {
		loadPracticeIdentity,
		PRACTICE_IDENTITY_CHANGED_EVENT
	} from '$lib/services/practice-profile.service.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Settings from '@lucide/svelte/icons/settings';

	let { children } = $props();

	const navItems = [
		{ href: '/', labelKey: 'nav.records', icon: LayoutDashboard },
		{ href: '/search', labelKey: 'nav.search', icon: Search },
		{ href: '/new', labelKey: 'nav.new', icon: Plus },
		{ href: '/settings', labelKey: 'nav.settings', icon: Settings }
	] as const;

	const showBackButton = $derived(page.url.pathname !== '/');
	let adjustingTypographyShortcut = false;
	let automaticBackupTimer: number | undefined;
	let brandName = $state('');

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/new') return path === '/new' || path === '/owners/new' || path === '/pets/new';
		return href === '/' ? path === '/' || path === '/dashboard' : path.startsWith(href);
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
				await createAutomaticBackupIfDue();
			}
		} catch {
			// The setup screen can render before the local database exists.
		}
	}

	async function loadBrandName() {
		try {
			if (!(await hasDatabaseFile())) {
				brandName = '';
				return;
			}
			const identity = await loadPracticeIdentity();
			brandName = identity.workplaceName ?? identity.veterinarianName ?? '';
		} catch {
			brandName = '';
		}
	}

	async function checkAutomaticBackupPolicy() {
		try {
			if (await hasDatabaseFile()) await createAutomaticBackupIfDue();
		} catch {
			// Automatic backups should not interrupt the active workflow.
		}
	}

	function getTypographyShortcutStep(event: KeyboardEvent): -1 | 0 | 1 | null {
		if (!event.ctrlKey || event.metaKey || event.altKey) return null;

		if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
			return 1;
		}

		if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
			return -1;
		}

		if (event.key === '0' || event.code === 'Numpad0') {
			return 0;
		}

		return null;
	}

	async function applyTypographyShortcut(step: -1 | 0 | 1): Promise<void> {
		if (adjustingTypographyShortcut) return;

		adjustingTypographyShortcut = true;

		try {
			if (step === 0) {
				await resetTypographyZoom();
			} else {
				await adjustTypographyZoom(step);
			}
		} catch {
			// Shortcut can fire before the local database exists during initial setup.
		} finally {
			adjustingTypographyShortcut = false;
		}
	}

	function handleTypographyShortcut(event: KeyboardEvent) {
		if (event.defaultPrevented || event.repeat) return;

		const step = getTypographyShortcutStep(event);
		if (step === null) return;

		event.preventDefault();
		void applyTypographyShortcut(step);
	}

	onMount(() => {
		void loadDatabasePreferences();
		void loadBrandName();
		automaticBackupTimer = window.setInterval(() => void checkAutomaticBackupPolicy(), AUTOMATIC_BACKUP_CHECK_INTERVAL_MS);
		window.addEventListener('keydown', handleTypographyShortcut);
		window.addEventListener(PRACTICE_IDENTITY_CHANGED_EVENT, loadBrandName);

		return () => {
			if (automaticBackupTimer) window.clearInterval(automaticBackupTimer);
			window.removeEventListener('keydown', handleTypographyShortcut);
			window.removeEventListener(PRACTICE_IDENTITY_CHANGED_EVENT, loadBrandName);
		};
	});
</script>

<div class="app-zoom-shell flex w-full flex-col overflow-hidden bg-background text-foreground">
	<header class="hidden shrink-0 border-b border-border bg-background/95 md:block">
		<div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 lg:px-8">
			<div class="min-w-0">
				<h1 class="truncate text-lg font-semibold">{brandName || t('app.name')}</h1>
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
