<script lang="ts">
	import { t } from '$lib/i18n/index.js';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import UserPlus from '@lucide/svelte/icons/user-plus';
</script>

<svelte:head>
	<title>{t('new.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
	<header class="w-full max-w-xl border-b border-border pb-4">
		<h2 class="text-2xl font-semibold">{t('new.title')}</h2>
		<p class="mt-2 text-sm text-muted-foreground">{t('new.description')}</p>
	</header>

	<div class="flex flex-wrap justify-center gap-3">
		<a href="/owners/new" class="group flex size-36 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-4 text-center shadow-sm transition-colors hover:border-primary/50 hover:bg-accent sm:size-40">
			<span class="flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
				<UserPlus class="size-5" />
			</span>
			<span class="text-sm font-semibold leading-5 sm:text-base">{t('new.ownerTitle')}</span>
		</a>

		<a href="/pets/new" class="group flex size-36 flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-4 text-center shadow-sm transition-colors hover:border-primary/50 hover:bg-accent sm:size-40">
			<span class="flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
				<PawPrint class="size-5" />
			</span>
			<span class="text-sm font-semibold leading-5 sm:text-base">{t('new.petTitle')}</span>
		</a>
	</div>
</section>
