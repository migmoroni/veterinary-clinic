<script lang="ts">
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	let {
		open = false,
		messageKey,
		confirming = false,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		messageKey: TranslationKey;
		confirming?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	function cancelIfIdle() {
		if (!confirming) onCancel();
	}

	function closeIfBackdrop(event: PointerEvent) {
		if (event.currentTarget === event.target) cancelIfIdle();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
		<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t('removal.confirmTitle')}>
			<header class="flex items-center justify-between gap-3 border-b border-border p-4">
				<div class="min-w-0">
					<h3 class="truncate text-base font-semibold">{t('removal.confirmTitle')}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{t(messageKey)}</p>
				</div>

				<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={t('actions.cancel')} title={t('actions.cancel')} disabled={confirming} onclick={cancelIfIdle}>
					<X class="size-4" />
				</button>
			</header>

			<div class="grid gap-3 p-4">
				<p class="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{t('removal.trashNotice')}</p>

				<div class="grid gap-2 sm:grid-cols-[1fr_auto] sm:justify-end">
					<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={confirming} onclick={onCancel}>
						<X class="size-4" />
						{t('actions.cancel')}
					</button>

					<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:opacity-95 disabled:opacity-50" disabled={confirming} onclick={onConfirm}>
						<Trash2 class="size-4" />
						{confirming ? t('removal.removing') : t('actions.removeToTrash')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}