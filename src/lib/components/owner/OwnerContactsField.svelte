<script lang="ts">
	import type { OwnerContactInput, OwnerContactKind } from '$lib/domain/owner/owner.js';
	import { formatEmailForInput } from '$lib/domain/shared/email.js';
	import { formatPhoneForInput } from '$lib/domain/shared/phone.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Select from '$lib/components/ui/Select.svelte';

	let { contacts = $bindable<OwnerContactInput[]>([]) }: { contacts?: OwnerContactInput[] } = $props();

	const contactKinds: OwnerContactKind[] = ['mobile', 'phone', 'email'];

	function kindLabelKey(kind: OwnerContactKind): TranslationKey {
		return `owner.contactKind.${kind}` as TranslationKey;
	}

	function addContact() {
		contacts = [...contacts, { kind: 'mobile', value: '' }];
	}

	function normalizeContactKind(kind: string): OwnerContactKind {
		if (kind === 'phone') return 'phone';
		if (kind === 'email') return 'email';
		return 'mobile';
	}

	function formatContactValue(kind: OwnerContactKind, value: string): string {
		return kind === 'email' ? formatEmailForInput(value) : formatPhoneForInput(value);
	}

	function removeContact(index: number) {
		contacts = contacts.filter((_, contactIndex) => contactIndex !== index);
	}

	function updateContactKind(index: number, kind: string) {
		const nextKind = normalizeContactKind(kind);
		contacts = contacts.map((contact, contactIndex) =>
			contactIndex === index ? { ...contact, kind: nextKind, value: formatContactValue(nextKind, contact.value) } : contact
		);
	}

	function updateContactValue(index: number, value: string) {
		contacts = contacts.map((contact, contactIndex) => {
			if (contactIndex !== index) return contact;
			return { ...contact, value: formatContactValue(contact.kind, value) };
		});
	}
</script>

<div class="sm:col-span-5 pt-2">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h4 class="text-sm font-semibold">{t('owner.contacts')}</h4>
		<button
			type="button"
			class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
			aria-label={t('owner.addContact')}
			title={t('owner.addContact')}
			onclick={addContact}
		>
			<Plus class="size-4" />
			{t('owner.addContact')}
		</button>
	</div>

	<div class="mt-4 flex flex-col gap-3">
		{#each contacts as contact, index}
			<div class="grid gap-2 rounded-md border border-border bg-background/50 p-2 sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem] items-center">
				<div class="flex flex-col gap-1 text-sm font-medium m-0">
					<span class="sr-only">{t('owner.contactType')}</span>
					<Select
						value={contact.kind}
						options={contactKinds.map(kind => ({ value: kind, label: t(kindLabelKey(kind)) }))}
						ariaLabel={t('owner.contactType')}
						onchange={(value) => updateContactKind(index, value)}
					/>
				</div>

				<label class="flex flex-col gap-1 text-sm font-medium m-0">
					<span class="sr-only">{t('owner.contactValue')}</span>
					<input
						type={contact.kind === 'email' ? 'email' : 'tel'}
						inputmode={contact.kind === 'email' ? 'email' : 'tel'}
						autocomplete={contact.kind === 'email' ? 'email' : 'tel'}
						class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
						value={contact.value}
						oninput={(event) => updateContactValue(index, event.currentTarget.value)}
						placeholder={t('owner.contactValue')}
						aria-label={t('owner.contactValue')}
					/>
				</label>

				<button
					type="button"
					class="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring/30"
					aria-label={t('owner.removeContact')}
					title={t('owner.removeContact')}
					onclick={() => removeContact(index)}
				>
					<Trash2 class="size-4" />
				</button>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">{t('owner.noContacts')}</p>
		{/each}
	</div>
</div>
