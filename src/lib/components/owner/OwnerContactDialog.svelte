<script lang="ts">
	import type { OwnerContact, OwnerContactKind } from '$lib/domain/owner/owner.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { openPhoneCallForPhone, openWhatsAppForPhone } from '$lib/services/contact.service.js';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import PhoneCall from '@lucide/svelte/icons/phone-call';
	import X from '@lucide/svelte/icons/x';

	let {
		open = $bindable(false),
		ownerName = '',
		contacts = []
	}: {
		open?: boolean;
		ownerName?: string;
		contacts?: OwnerContact[];
	} = $props();

	const availableContacts = $derived(contacts.filter((contact) => contact.value.trim().length > 0));

	function kindLabelKey(kind: OwnerContactKind): TranslationKey {
		return `owner.contactKind.${kind}` as TranslationKey;
	}

	function canOpenWhatsApp(kind: OwnerContactKind): boolean {
		return kind == 'mobile';
	}

	function closeDialog() {
		open = false;
	}

	function closeIfBackdrop(event: PointerEvent) {
		if (event.target === event.currentTarget) closeDialog();
	}

	async function callContact(value: string) {
		await openPhoneCallForPhone(value);
		closeDialog();
	}

	async function messageContact(value: string) {
		await openWhatsAppForPhone(value);
		closeDialog();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
		<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t('owner.contactDialogTitle')}>
			<header class="flex items-center justify-between gap-3 border-b border-border p-4">
				<div class="min-w-0">
					<h3 class="truncate text-base font-semibold">{t('owner.contactDialogTitle')}</h3>
					{#if ownerName}
						<p class="mt-1 truncate text-sm text-muted-foreground">{ownerName}</p>
					{/if}
				</div>

				<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t('owner.closeContactDialog')} title={t('owner.closeContactDialog')} onclick={closeDialog}>
					<X class="size-4" />
				</button>
			</header>

			<div class="overflow-y-auto p-4">
				{#if availableContacts.length > 0}
					<div class="divide-y divide-border rounded-md border border-border">
						{#each availableContacts as contact}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold">{contact.value}</p>
									<p class="mt-1 text-xs text-muted-foreground">{t(kindLabelKey(contact.kind))}</p>
								</div>

								<div class="grid gap-2 sm:flex sm:justify-end {canOpenWhatsApp(contact.kind) ? 'grid-cols-2' : 'grid-cols-1'}">
									<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.call')}: ${contact.value}`} onclick={() => void callContact(contact.value)}>
										<PhoneCall class="size-4" />
										{t('owner.call')}
									</button>
									{#if canOpenWhatsApp(contact.kind)}
										<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.messageWhatsApp')}: ${contact.value}`} onclick={() => void messageContact(contact.value)}>
											<MessageCircle class="size-4" />
											{t('owner.messageWhatsApp')}
										</button>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.noContacts')}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
