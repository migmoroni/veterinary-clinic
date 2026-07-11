<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n/index.js';
	import Archive from '@lucide/svelte/icons/archive';
	import DatabaseBackup from '@lucide/svelte/icons/database-backup';
	import Package from '@lucide/svelte/icons/package';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import type { Component, Snippet } from 'svelte';

	const { children } = $props<{ children: Snippet }>();

	const settingsItems: { href: string; titleKey: Parameters<typeof t>[0]; icon: Component }[] = [
		{
			href: '/settings/profile',
			titleKey: 'settings.profile.title',
			icon: UserCog
		},
		{
			href: '/settings/backups',
			titleKey: 'settings.backups.title',
			icon: DatabaseBackup
		},
		{
			href: '/settings/data',
			titleKey: 'settings.data.title',
			icon: Archive
		},
		{
			href: '/settings/trash',
			titleKey: 'settings.trash.title',
			icon: Trash2
		},
		{
			href: '/settings/products',
			titleKey: 'settings.products.title',
			icon: Package
		},
		{
			href: '/settings/protocols',
			titleKey: 'settings.protocols.title',
			icon: ScrollText
		},
		{
			href: '/settings/preferences',
			titleKey: 'settings.preferences.title',
			icon: SlidersHorizontal
		}
	];

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<title>{t('settings.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
	<div class="grid min-w-0 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
		<aside class="min-w-0 border-b border-border pb-3 lg:sticky lg:top-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
			<nav class="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label={t('settings.title')}>
				{#each settingsItems as item}
					{@const active = isActive(item.href)}
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="group flex min-w-48 shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors lg:min-w-0 {active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
					>
						<span class="flex size-9 shrink-0 items-center justify-center rounded-md transition-colors {active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground'}">
							<item.icon class="size-4" />
						</span>
						<span class="min-w-0 font-semibold leading-5 text-foreground {active ? 'text-primary' : ''}">{t(item.titleKey)}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<div class="min-w-0">
			{@render children()}
		</div>
	</div>
</section>
