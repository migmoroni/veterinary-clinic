<script lang="ts" module>
	import type { TranslationKey } from '@vet/core-local/i18n/index.js';

	export type FormularyDetailLoader<TItem> = (id: string) => Promise<TItem | null>;
</script>

<script lang="ts" generics="TItem extends { name: string }">
	import { page } from '$app/state';
	import { isUuidV4 } from '@vet/types/domain/shared/uuid.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let {
		fallbackTitleKey,
		notFoundKey,
		load,
		descriptionKey = null,
		kickerKey = null,
		children
	}: {
		fallbackTitleKey: TranslationKey;
		notFoundKey: TranslationKey;
		load: FormularyDetailLoader<TItem>;
		descriptionKey?: TranslationKey | null;
		kickerKey?: TranslationKey | null;
		children: Snippet<[TItem]>;
	} = $props();

	let item = $state<TItem | null>(null);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);

	async function loadItem() {
		loading = true;
		errorKey = null;
		item = null;

		const id = page.params.id ?? '';

		if (!isUuidV4(id)) {
			errorKey = notFoundKey;
			loading = false;
			return;
		}

		try {
			item = await load(id);
			if (!item) errorKey = notFoundKey;
		} catch {
			errorKey = 'formulary.loadFailed';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadItem();
	});
</script>

<svelte:head>
	<title>{item?.name ?? t(fallbackTitleKey)} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		{#if kickerKey}
			<p class="text-sm font-medium text-muted-foreground">{t(kickerKey)}</p>
		{/if}
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{item?.name ?? t(fallbackTitleKey)}</h2>
		{#if descriptionKey}
			<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t(descriptionKey)}</p>
		{/if}
	</header>

	{#if loading}
		<div class="h-96 animate-pulse rounded-md bg-muted"></div>
	{:else if errorKey}
		<p class="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t(errorKey)}</p>
	{:else if item}
		{@render children(item)}
	{/if}
</section>
