<!--
@component
Compact collection overview used before opening `ImageCollectionOrganizer`.
Shows at most four thumbnails, the primary marker, total/limit information, and
a single management action so large collections do not expand the parent form.
-->
<script lang="ts">
	import BinaryImage from '$lib/components/shared/BinaryImage.svelte';
	import type { ImageCollectionItemInput } from '$lib/domain/image-collection/image-collection.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Images from '@lucide/svelte/icons/images';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Star from '@lucide/svelte/icons/star';

	let {
		images = [],
		maxItems = null,
		primaryRequired = false,
		disabled = false,
		titleKey = 'practiceProfile.images',
		imageAltKey = 'practiceProfile.imageAlt',
		onManage
	}: {
		images?: ImageCollectionItemInput[];
		maxItems?: number | null;
		primaryRequired?: boolean;
		disabled?: boolean;
		titleKey?: TranslationKey;
		imageAltKey?: TranslationKey;
		onManage: () => void;
	} = $props();

	const visibleImages = $derived(images.slice(0, 4));
</script>

<section class="rounded-md border border-border bg-background">
	<header class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
		<div class="min-w-0">
			<h3 class="text-sm font-semibold">{t(titleKey)}</h3>
			<p class="mt-1 text-xs text-muted-foreground">
				{images.length}{maxItems !== null ? `/${maxItems}` : ''} · {primaryRequired ? t('practiceProfile.primaryRequired') : t('practiceProfile.primaryOptional')}
			</p>
		</div>
		<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={disabled} onclick={onManage}>
			<Settings2 class="size-4" />
			{t('practiceProfile.manageImages')}
		</button>
	</header>

	{#if images.length > 0}
		<div class="flex min-h-28 items-center gap-3 overflow-hidden p-4">
			{#each visibleImages as image (image.clientId)}
				<div class="relative shrink-0">
					<BinaryImage imageBytes={image.imageBytes} alt={t(imageAltKey)} className="h-20 w-28 sm:h-24 sm:w-32" imageClass="h-full w-full object-contain" />
					{#if image.isPrimary}
						<span class="absolute right-1 top-1 flex size-7 items-center justify-center rounded-md bg-background/95 text-primary shadow-sm" title={t('practiceProfile.primaryImage')} aria-label={t('practiceProfile.primaryImage')}>
							<Star class="size-4 fill-current" />
						</span>
					{/if}
				</div>
			{/each}

			{#if images.length > visibleImages.length}
				<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-muted-foreground sm:h-24 sm:w-24">
					+{images.length - visibleImages.length}
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex min-h-24 items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
			<Images class="size-5 shrink-0" />
			{t('practiceProfile.noImages')}
		</div>
	{/if}
</section>
