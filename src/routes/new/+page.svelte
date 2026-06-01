<script lang="ts">
	import { t } from '$lib/i18n/index.js';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import UserPlus from '@lucide/svelte/icons/user-plus';
</script>

<svelte:head>
	<title>{t('new.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('new.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('new.description')}</p>
	</header>

	<div class="grid gap-3 sm:grid-cols-2">
		<a href="/owners/new" class="group flex min-w-0 flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent sm:p-5">
			<span class="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
				<UserPlus class="size-5" />
			</span>
			<span class="min-w-0">
				<span class="block text-base font-semibold">{t('new.ownerTitle')}</span>
				<span class="mt-1 block text-sm leading-6 text-muted-foreground">{t('new.ownerDescription')}</span>
			</span>
		</a>

		<a href="/pets/new" class="group flex min-w-0 flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent sm:p-5">
			<span class="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
				<PawPrint class="size-5" />
			</span>
			<span class="min-w-0">
				<span class="block text-base font-semibold">{t('new.petTitle')}</span>
				<span class="mt-1 block text-sm leading-6 text-muted-foreground">{t('new.petDescription')}</span>
			</span>
		</a>
	</div>
</section>