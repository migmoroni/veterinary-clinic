<script lang="ts">
	import "../app.css";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import { t } from "@vet/core-local/i18n/index.js";
	import { hasDatabaseFile } from "@vet/core-local/native/database-file.js";
	import {
		adjustTypographyZoom,
		loadLocalePreference,
		loadTypographyPreference,
		resetTypographyZoom,
	} from "@vet/modules/core_services/preferences.service.js";
	import {
		loadPracticeIdentity,
		PRACTICE_IDENTITY_CHANGED_EVENT,
	} from "@vet/modules/registry/services/practice-profile.service.js";
	import ArrowLeft from "@lucide/svelte/icons/arrow-left";
	import BriefcaseMedical from "@lucide/svelte/icons/briefcase-medical";
	import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
	import Plus from "@lucide/svelte/icons/plus";
	import Search from "@lucide/svelte/icons/search";
	import Settings from "@lucide/svelte/icons/settings";

	let { children } = $props();

	const navItems = [
		{ href: "/", labelKey: "nav.records", icon: LayoutDashboard },
		{ href: "/search", labelKey: "nav.search", icon: Search },
		{ href: "/new", labelKey: "nav.new", icon: Plus },
		{ href: "/settings", labelKey: "nav.settings", icon: Settings },
	] as const;

	const showBackButton = $derived(page.url.pathname !== "/");
	let adjustingTypographyShortcut = false;
	let brandName = $state("");

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === "/new")
			return (
				path === "/new" ||
				path === "/owners/new" ||
				path === "/pets/new"
			);
		return href === "/"
			? path === "/" || path === "/dashboard"
			: path.startsWith(href);
	}

	async function goBack() {
		if (window.history.length > 1) {
			window.history.back();
			return;
		}

		await goto("/");
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

	async function loadBrandName() {
		try {
			if (!(await hasDatabaseFile())) {
				brandName = "";
				return;
			}
			const identity = await loadPracticeIdentity();
			brandName =
				identity.workplaceName ?? identity.veterinarianName ?? "";
		} catch {
			brandName = "";
		}
	}

	function getTypographyShortcutStep(
		event: KeyboardEvent,
	): -1 | 0 | 1 | null {
		if (!event.ctrlKey || event.metaKey || event.altKey) return null;

		if (
			event.key === "+" ||
			event.key === "=" ||
			event.code === "NumpadAdd"
		) {
			return 1;
		}

		if (
			event.key === "-" ||
			event.key === "_" ||
			event.code === "NumpadSubtract"
		) {
			return -1;
		}

		if (event.key === "0" || event.code === "Numpad0") {
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
		window.addEventListener("keydown", handleTypographyShortcut);
		window.addEventListener(PRACTICE_IDENTITY_CHANGED_EVENT, loadBrandName);

		return () => {
			window.removeEventListener("keydown", handleTypographyShortcut);
			window.removeEventListener(
				PRACTICE_IDENTITY_CHANGED_EVENT,
				loadBrandName,
			);
		};
	});
</script>

<div
	class="app-zoom-shell flex w-full flex-col overflow-hidden bg-background text-foreground"
>
	<header
		class="hidden shrink-0 border-b border-border bg-background md:block"
	>
		<div
			class="mx-auto grid h-10 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 lg:px-8"
		>
			<!-- Logo/Brand on the left -->
			<div class="flex items-center gap-2 min-w-0 text-primary">
				<BriefcaseMedical class="size-5 shrink-0" />
				<span class="truncate text-lg font-bold tracking-tight"
					>{brandName || t("app.name")}</span
				>
			</div>

			<!-- Menu in the center -->
			<nav class="flex items-center justify-center gap-1.5">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold transition-all select-none {isActive(item.href)
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
					>
						<item.icon class="size-4 shrink-0" />
						<span>{t(item.labelKey)}</span>
					</a>
				{/each}
			</nav>

			<!-- Back button on the right -->
			<div class="flex items-center justify-end">
				{#if showBackButton}
					<button
						type="button"
						class="inline-flex h-6 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
						aria-label={t("common.back")}
						title={t("common.back")}
						onclick={() => void goBack()}
					>
						<ArrowLeft class="size-4" />
						{t("common.back")}
					</button>
				{/if}
			</div>
		</div>
	</header>

	<main class="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0">
		{@render children()}
	</main>

	<nav
		class="grid h-16 shrink-0 grid-cols-4 border-t border-border bg-background md:hidden"
	>
		{#each navItems as item}
			<a
				href={item.href}
				aria-label={t(item.labelKey)}
				class="flex flex-col items-center justify-center gap-1 text-xs {isActive(
					item.href,
				)
					? 'text-primary'
					: 'text-muted-foreground'}"
			>
				<item.icon class="size-5" />
				<span class="max-w-full truncate px-1">{t(item.labelKey)}</span>
			</a>
		{/each}
	</nav>
</div>
