<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { BreedReferenceDetail } from '@vet/modules/knowledge/breeds';
	import type { BreedReferenceProfile } from '@vet/types/domain/pet/breed-reference.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import { loadBreedReferenceProfile } from '@vet/modules/knowledge/breeds';

	let profile = $state<BreedReferenceProfile | null>(null);
	let loading = $state(true);
	let loadFailed = $state(false);

	async function loadProfile() {
		loading = true;
		loadFailed = false;
		profile = null;
		const breedId = page.params.breedId;
		if (!breedId) {
			loadFailed = true;
			loading = false;
			return;
		}

		try {
			profile = await loadBreedReferenceProfile(breedId);
			if (!profile) loadFailed = true;
		} catch {
			loadFailed = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadProfile();
	});
</script>

<svelte:head>
	<title>{profile ? t(profile.labelKey) : t('breedReference.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		<p class="text-sm font-medium text-muted-foreground">{t('breedReference.kicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{profile ? t(profile.labelKey) : t('breedReference.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('breedReference.description')}</p>
	</header>

	{#if loading}
		<div class="h-96 animate-pulse rounded-md bg-muted"></div>
	{:else if loadFailed}
		<p class="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t('breedReference.detailNotFound')}</p>
	{:else if profile}
		<BreedReferenceDetail {profile} />
	{/if}
</section>
