<script lang="ts">
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	let {
		open = false,
		saving = false,
		titleKey = 'record.unsavedDialogTitle',
		descriptionKey = 'record.unsavedDialogDescription',
		onSave,
		onDiscard,
		onCancel
	}: {
		open?: boolean;
		saving?: boolean;
		titleKey?: TranslationKey;
		descriptionKey?: TranslationKey;
		onSave: () => void;
		onDiscard: () => void;
		onCancel: () => void;
	} = $props();

	function cancelIfIdle() {
		if (!saving) onCancel();
	}

	function closeIfBackdrop(event: PointerEvent) {
		if (event.currentTarget === event.target) cancelIfIdle();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
		<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t(titleKey)}>
			<header class="flex items-center justify-between gap-3 border-b border-border p-4">
				<div class="min-w-0">
					<h3 class="truncate text-base font-semibold">{t(titleKey)}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{t(descriptionKey)}</p>
				</div>

				<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={t('actions.cancel')} title={t('actions.cancel')} disabled={saving} onclick={cancelIfIdle}>
					<X class="size-4" />
				</button>
			</header>

			<div class="grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:justify-end">
				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={onCancel}>
					<X class="size-4" />
					{t('actions.cancel')}
				</button>

				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={onDiscard}>
					<Trash2 class="size-4" />
					{t('actions.discard')}
				</button>

				<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving} onclick={onSave}>
					<Save class="size-4" />
					{saving ? t('record.saving') : t('actions.save')}
				</button>
			</div>
		</div>
	</div>
{/if}