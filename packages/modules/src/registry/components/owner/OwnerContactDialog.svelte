<script lang="ts">
	import { t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import { openEmailForEmail, openPhoneCallForPhone, openWhatsAppForPhone } from '../../services/contact.service.js';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import PhoneCall from '@lucide/svelte/icons/phone-call';
	import X from '@lucide/svelte/icons/x';
	import {
		canCallOwnerContact as canCallContact,
		canOpenOwnerContactWhatsApp as canOpenWhatsApp,
		isEmailOwnerContact as isEmailContact,
		type OwnerContactLike,
		ownerContactIsVisible,
		ownerContactKindSubtitle
	} from './owner-contact-utils.js';

	type ContactGroup = {
		key: string;
		name: string;
		roleKey: TranslationKey;
		contacts: OwnerContactLike[];
	};

	let {
		open = $bindable(false),
		ownerName = '',
		contacts = []
	}: {
		open?: boolean;
		ownerName?: string;
		contacts?: OwnerContactLike[];
	} = $props();

	const availableContacts = $derived(contacts.filter(ownerContactIsVisible));
	const contactGroups = $derived(groupContacts(availableContacts));

	function groupContacts(source: OwnerContactLike[]): ContactGroup[] {
		const groups = new Map<string, ContactGroup>();

		for (const contact of source) {
			const responsibleName = contact.responsibleName?.trim() ?? '';
			const key = responsibleName.length > 0 ? `responsible:${contact.responsibleId ?? responsibleName}` : 'owner';
			const group = groups.get(key) ?? {
				key,
				name: responsibleName.length > 0 ? responsibleName : ownerName,
				roleKey: responsibleName.length > 0 ? 'owner.additionalResponsibleLabel' : 'owner.contextLabel',
				contacts: []
			};

			group.contacts.push(contact);
			groups.set(key, group);
		}

		return [...groups.values()];
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

	async function emailContact(value: string) {
		await openEmailForEmail(value);
		closeDialog();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onpointerdown={closeIfBackdrop}>
		<div class="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-md border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-label={t('owner.contactDialogTitle')}>
			<header class="flex items-center justify-between gap-3 border-b border-border p-4">
				<div class="min-w-0">
					<h3 class="truncate text-base font-semibold">{t('owner.contactDialogTitle')}</h3>
				</div>

				<button type="button" class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t('owner.closeContactDialog')} title={t('owner.closeContactDialog')} onclick={closeDialog}>
					<X class="size-4" />
				</button>
			</header>

			<div class="overflow-y-auto p-4">
				{#if contactGroups.length > 0}
					<div class="space-y-3">
						{#each contactGroups as group (group.key)}
							<section class="overflow-hidden rounded-md border border-border">
								<header class="border-b border-border bg-muted/40 px-3 py-2">
									<p class="truncate text-sm font-semibold">{group.name || t(group.roleKey)}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">{t(group.roleKey)}</p>
								</header>

								<div class="divide-y divide-border">
									{#each group.contacts as contact}
										<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
											<div class="min-w-0">
												<p class="truncate text-sm font-semibold">{contact.value}</p>
												<p class="mt-1 text-xs text-muted-foreground">{ownerContactKindSubtitle(contact, t)}</p>
											</div>

											{#if isEmailContact(contact.kind) || canCallContact(contact.kind) || canOpenWhatsApp(contact.kind)}
												<div class="grid gap-2 sm:flex sm:justify-end {canOpenWhatsApp(contact.kind) ? 'grid-cols-2' : 'grid-cols-1'}">
													{#if isEmailContact(contact.kind)}
														<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.email')}: ${contact.value}`} onclick={() => void emailContact(contact.value)}>
															<Mail class="size-4" />
															{t('owner.email')}
														</button>
													{:else if canCallContact(contact.kind)}
														<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.call')}: ${contact.value}`} onclick={() => void callContact(contact.value)}>
															<PhoneCall class="size-4" />
															{t('owner.call')}
														</button>
													{/if}
													{#if canOpenWhatsApp(contact.kind)}
														<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={`${t('owner.messageWhatsApp')}: ${contact.value}`} onclick={() => void messageContact(contact.value)}>
															<MessageCircle class="size-4" />
															{t('owner.messageWhatsApp')}
														</button>
													{/if}
												</div>
											{/if}
										</article>
									{/each}
								</div>
							</section>
						{/each}
					</div>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.noContacts')}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
