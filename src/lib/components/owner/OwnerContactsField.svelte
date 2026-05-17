<script lang="ts">
	import type { OwnerContactInput, OwnerContactKind } from '$lib/domain/owner/owner.js';
	import { countryPhoneFormat, countryPhoneFormats } from '$lib/domain/geo/location.js';
	import { formatEmailForInput } from '$lib/domain/shared/email.js';
	import { formatPhoneForInput, formatPhoneForInputWithCaret } from '$lib/domain/shared/phone.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Select from '$lib/components/ui/Select.svelte';
	import { tick } from 'svelte';

	let { contacts = $bindable<OwnerContactInput[]>([]), country = 'BRA' }: { contacts?: OwnerContactInput[]; country?: string | null } = $props();

	const contactKinds: OwnerContactKind[] = ['mobile', 'phone', 'email', 'other'];
	const phoneFormats = countryPhoneFormats();
	const phoneFormatContext = $derived({ country: countryPhoneFormat(country), countries: phoneFormats });

	function kindLabelKey(kind: OwnerContactKind): TranslationKey {
		return `owner.contactKind.${kind}` as TranslationKey;
	}

	function addContact() {
		contacts = [...contacts, { kind: 'mobile', label: '', value: '' }];
	}

	function normalizeContactKind(kind: string): OwnerContactKind {
		if (kind === 'other') return 'other';
		if (kind === 'phone') return 'phone';
		if (kind === 'email') return 'email';
		return 'mobile';
	}

	function formatContactValue(kind: OwnerContactKind, value: string): string {
		if (kind === 'other') return value;
		return kind === 'email' ? formatEmailForInput(value) : formatPhoneForInput(value, phoneFormatContext);
	}

	function isPhoneContact(kind: OwnerContactKind): boolean {
		return kind === 'phone' || kind === 'mobile';
	}

	function removeContact(index: number) {
		contacts = contacts.filter((_, contactIndex) => contactIndex !== index);
	}

	function updateContactKind(index: number, kind: string) {
		const nextKind = normalizeContactKind(kind);
		contacts = contacts.map((contact, contactIndex) =>
			contactIndex === index ? { ...contact, kind: nextKind, label: nextKind === 'other' ? (contact.label ?? '') : '', value: formatContactValue(nextKind, contact.value) } : contact
		);
	}

	function updateContactLabel(index: number, label: string) {
		contacts = contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, label } : contact));
	}

	function updateContactValue(index: number, value: string) {
		contacts = contacts.map((contact, contactIndex) => {
			if (contactIndex !== index) return contact;
			return { ...contact, value: formatContactValue(contact.kind, value) };
		});
	}

	async function updateContactValueFromInput(index: number, kind: OwnerContactKind, input: HTMLInputElement) {
		if (!isPhoneContact(kind)) {
			updateContactValue(index, input.value);
			return;
		}

		const result = formatPhoneForInputWithCaret(input.value, input.selectionStart, phoneFormatContext);
		contacts = contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, value: result.value } : contact));
		await tick();
		if (input === document.activeElement) input.setSelectionRange(result.caret, result.caret);
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
			<div class="grid gap-2 rounded-md border border-border bg-background/50 p-2 items-center {contact.kind === 'other' ? 'sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem]' : 'sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem]'}">
				<div class="flex flex-col gap-1 text-sm font-medium m-0">
					<span class="sr-only">{t('owner.contactType')}</span>
					<Select
						value={contact.kind}
						options={contactKinds.map(kind => ({ value: kind, label: t(kindLabelKey(kind)) }))}
						ariaLabel={t('owner.contactType')}
						onchange={(value) => updateContactKind(index, value)}
					/>
				</div>

				{#if contact.kind === 'other'}
					<label class="flex flex-col gap-1 text-sm font-medium m-0">
						<span class="sr-only">{t('owner.contactLabel')}</span>
						<input
							type="text"
							inputmode="text"
							autocomplete="off"
							class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={contact.label ?? ''}
							oninput={(event) => updateContactLabel(index, event.currentTarget.value)}
							placeholder={t('owner.contactLabel')}
							aria-label={t('owner.contactLabel')}
							required
						/>
					</label>

					<label class="flex flex-col gap-1 text-sm font-medium m-0">
						<span class="sr-only">{t('owner.contactOtherValue')}</span>
						<input
							type="text"
							inputmode="text"
							autocomplete="off"
							class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={contact.value}
							oninput={(event) => void updateContactValueFromInput(index, contact.kind, event.currentTarget)}
							placeholder={t('owner.contactOtherValue')}
							aria-label={t('owner.contactOtherValue')}
							required
						/>
					</label>
				{:else}
					<label class="flex flex-col gap-1 text-sm font-medium m-0">
						<span class="sr-only">{t('owner.contactValue')}</span>
						<input
							type={contact.kind === 'email' ? 'email' : 'tel'}
							inputmode={contact.kind === 'email' ? 'email' : 'tel'}
							autocomplete={contact.kind === 'email' ? 'email' : 'tel'}
							class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={contact.value}
							oninput={(event) => void updateContactValueFromInput(index, contact.kind, event.currentTarget)}
							placeholder={t('owner.contactValue')}
							aria-label={t('owner.contactValue')}
							required
						/>
					</label>
				{/if}

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
