<script lang="ts">
	import { t, type TranslationKey } from '$lib/i18n/index.js';

	let {
		titleKey,
		descriptionKey
	}: {
		titleKey: TranslationKey;
		descriptionKey: TranslationKey;
	} = $props();
</script>

<section class="mx-auto flex min-h-full w-full max-w-4xl items-center px-4 py-8 sm:px-6 lg:px-8">
	<div class="w-full rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
		<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
		<h2 class="mt-2 text-2xl font-semibold">{t(titleKey)}</h2>
		<p class="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t(descriptionKey)}</p>
	</div>
</section>