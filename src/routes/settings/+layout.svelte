<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n/index.js';
	import Archive from '@lucide/svelte/icons/archive';
	import DatabaseBackup from '@lucide/svelte/icons/database-backup';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import type { Component, Snippet } from 'svelte';

	const { children } = $props<{ children: Snippet }>();

	const settingsItems: { href: string; titleKey: Parameters<typeof t>[0]; descriptionKey: Parameters<typeof t>[0]; icon: Component }[] = [
		{
			href: '/settings/profile',
			titleKey: 'settings.profile.title',
			descriptionKey: 'settings.profile.description',
			icon: UserCog
		},
		{
			href: '/settings/backups',
			titleKey: 'settings.backups.title',
			descriptionKey: 'settings.backups.description',
			icon: DatabaseBackup
		},
		{
			href: '/settings/data',
			titleKey: 'settings.data.title',
			descriptionKey: 'settings.data.description',
			icon: Archive
		},
		{
			href: '/settings/trash',
			titleKey: 'settings.trash.title',
			descriptionKey: 'settings.trash.description',
			icon: Trash2
		},
		{
			href: '/settings/vaccines',
			titleKey: 'settings.vaccines.title',
			descriptionKey: 'settings.vaccines.description',
			icon: Syringe
		},
		{
			href: '/settings/preferences',
			titleKey: 'settings.preferences.title',
			descriptionKey: 'settings.preferences.description',
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

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('settings.description')}</p>
	</header>

	<div class="grid min-w-0 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
		<aside class="min-w-0 border-b border-border pb-3 lg:sticky lg:top-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
			<nav class="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label={t('settings.title')}>
				{#each settingsItems as item}
					{@const active = isActive(item.href)}
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="group flex min-w-48 shrink-0 items-start gap-3 rounded-md px-3 py-3 text-sm transition-colors lg:min-w-0 {active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
					>
						<span class="flex size-9 shrink-0 items-center justify-center rounded-md transition-colors {active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground'}">
							<item.icon class="size-4" />
						</span>
						<span class="min-w-0">
							<span class="block truncate font-semibold text-foreground {active ? 'text-primary' : ''}">{t(item.titleKey)}</span>
							<span class="mt-1 hidden text-xs leading-5 {active ? 'text-primary/80' : 'text-muted-foreground'} lg:block">{t(item.descriptionKey)}</span>
						</span>
					</a>
				{/each}
			</nav>
		</aside>

		<div class="min-w-0">
			{@render children()}
		</div>
	</div>
</section>
