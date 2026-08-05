<!--
@component
Reusable modal organizer for an image collection. It edits the bindable list in
memory, including order, descriptions, primary selection, replacement, and
removal; persistence remains the parent component's responsibility.

`primaryRequired` controls whether removing the current primary automatically
promotes the first remaining image. `maxItems = null` represents an unlimited
collection, which is suitable for future clinical records and examinations.
-->
<script lang="ts">
	import CharacterLimitHint from '@vet/ui/components/forms/CharacterLimitHint.svelte';
	import BinaryImage from '@vet/ui/components/shared/BinaryImage.svelte';
	import type { ImageCollectionItemInput } from '@vet/types/domain/image-collection/image-collection.js';
	import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
	import { t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	let {
		images = $bindable<ImageCollectionItemInput[]>([]),
		maxItems = null,
		primaryRequired = false,
		disabled = false,
		titleKey = 'practiceProfile.imageManagerTitle',
		descriptionKey = 'practiceProfile.imageManagerDescription',
		imageAltKey = 'practiceProfile.imageAlt',
		radioGroupName = 'primary-image',
		onAdd,
		onEdit,
		onClose
	}: {
		images?: ImageCollectionItemInput[];
		maxItems?: number | null;
		primaryRequired?: boolean;
		disabled?: boolean;
		titleKey?: TranslationKey;
		descriptionKey?: TranslationKey;
		imageAltKey?: TranslationKey;
		radioGroupName?: string;
		onAdd: () => void;
		onEdit: (index: number) => void;
		onClose: () => void;
	} = $props();

	const canAdd = $derived(maxItems === null || images.length < maxItems);

	function setDescription(index: number, description: string) {
		images = images.map((image, imageIndex) => (imageIndex === index ? { ...image, description } : image));
	}

	function setPrimary(index: number) {
		images = images.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === index }));
	}

	function removeImage(index: number) {
		const removedPrimary = images[index]?.isPrimary;
		const nextImages = images.filter((_, imageIndex) => imageIndex !== index);
		if (removedPrimary && nextImages.length > 0 && primaryRequired) nextImages[0] = { ...nextImages[0], isPrimary: true };
		images = nextImages;
	}

	function moveImage(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= images.length) return;
		const nextImages = [...images];
		[nextImages[index], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[index]];
		images = nextImages;
	}

	function closeIfBackdrop(event: PointerEvent) {
		if (event.currentTarget === event.target && !disabled) onClose();
	}

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape' && !disabled) onClose();
	}
</script>

<svelte:window onkeydown={closeOnEscape} />

<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
	<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t(titleKey)}>
		<header class="flex items-start justify-between gap-3 border-b border-border p-4">
			<div class="min-w-0">
				<h3 class="text-base font-semibold">{t(titleKey)}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{t(descriptionKey)}</p>
			</div>
			<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={t('actions.cancel')} title={t('actions.cancel')} disabled={disabled} onclick={onClose}>
				<X class="size-4" />
			</button>
		</header>

		<div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
			<p class="text-xs text-muted-foreground">
				{images.length}{maxItems !== null ? `/${maxItems}` : ''} · {primaryRequired ? t('practiceProfile.primaryRequired') : t('practiceProfile.primaryOptional')}
			</p>
			<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={disabled || !canAdd} onclick={onAdd}>
				<ImagePlus class="size-4" />
				{t('practiceProfile.addImage')}
			</button>
		</div>

		<div class="min-h-0 flex-1 overflow-auto">
			{#if images.length > 0}
				<table class="w-full min-w-3xl table-fixed border-collapse text-left text-sm">
					<thead class="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
						<tr>
							<th class="w-36 px-4 py-3 font-medium">{t('practiceProfile.image')}</th>
							<th class="px-4 py-3 font-medium">{t('practiceProfile.imageDescription')}</th>
							<th class="w-24 px-4 py-3 text-center font-medium">{t('practiceProfile.primaryImage')}</th>
							<th class="w-48 px-4 py-3 text-right font-medium">{t('practiceProfile.imageActions')}</th>
						</tr>
					</thead>
					<tbody>
						{#each images as image, index (image.clientId)}
							<tr class="border-t border-border align-top">
								<td class="px-4 py-3">
									<BinaryImage imageBytes={image.imageBytes} alt={t(imageAltKey)} className="h-24 w-32" imageClass="h-full w-full object-contain" />
								</td>
								<td class="px-4 py-3">
									<label class="block">
										<span class="sr-only">{t('practiceProfile.imageDescription')}</span>
										<textarea
											class="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
											value={image.description}
											maxlength={FIELD_LIMITS.imageDescription}
											disabled={disabled}
											placeholder={t('practiceProfile.imageDescriptionPlaceholder')}
											oninput={(event) => setDescription(index, event.currentTarget.value)}
										></textarea>
									</label>
									<div class="mt-1 flex justify-end">
										<CharacterLimitHint value={image.description} max={FIELD_LIMITS.imageDescription} />
									</div>
								</td>
								<td class="px-4 py-3 text-center">
									<input type="radio" name={radioGroupName} class="mt-8 size-4 accent-primary" checked={image.isPrimary} disabled={disabled} aria-label={t('practiceProfile.setPrimaryImage')} onchange={() => setPrimary(index)} />
								</td>
								<td class="px-4 py-3">
									<div class="mt-6 flex justify-end gap-1">
										<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={disabled || index === 0} aria-label={t('practiceProfile.moveImageUp')} title={t('practiceProfile.moveImageUp')} onclick={() => moveImage(index, -1)}>
											<ArrowUp class="size-4" />
										</button>
										<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={disabled || index === images.length - 1} aria-label={t('practiceProfile.moveImageDown')} title={t('practiceProfile.moveImageDown')} onclick={() => moveImage(index, 1)}>
											<ArrowDown class="size-4" />
										</button>
										<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={disabled} aria-label={t('practiceProfile.replaceImage')} title={t('practiceProfile.replaceImage')} onclick={() => onEdit(index)}>
											<Pencil class="size-4" />
										</button>
										<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" disabled={disabled} aria-label={t('practiceProfile.removeImage')} title={t('practiceProfile.removeImage')} onclick={() => removeImage(index)}>
											<Trash2 class="size-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="flex min-h-48 items-center justify-center p-6 text-sm text-muted-foreground">{t('practiceProfile.noImages')}</div>
			{/if}
		</div>

		<footer class="flex justify-end border-t border-border p-4">
			<button type="button" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={disabled} onclick={onClose}>
				{t('practiceProfile.finishManagingImages')}
			</button>
		</footer>
	</div>
</div>
