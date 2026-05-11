<script lang="ts">
	import { t } from '$lib/i18n/index.js';
	import Archive from '@lucide/svelte/icons/archive';
	import DatabaseBackup from '@lucide/svelte/icons/database-backup';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const settingsItems = [
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
	] as const;
</script>

<section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('settings.description')}</p>
	</header>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
		{#each settingsItems as item}
			<a href={item.href} class="flex min-h-36 flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent">
				<span class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
					<item.icon class="size-5" />
				</span>
				<span class="min-w-0">
					<span class="block text-base font-semibold">{t(item.titleKey)}</span>
					<span class="mt-1 block text-sm leading-5 text-muted-foreground">{t(item.descriptionKey)}</span>
				</span>
			</a>
		{/each}
	</div>
</section>