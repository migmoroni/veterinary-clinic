<script lang="ts">
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { countryPhoneFormat, countryPhoneFormats } from '$lib/domain/geo/location.js';
	import type { OwnerContactInput, OwnerContactKind } from '$lib/domain/owner/owner.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { formatPhoneForInputWithCaret } from '$lib/domain/shared/phone.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { cn } from '$lib/utils.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { tick } from 'svelte';
	import {
		createEmptyOwnerContact,
		formatOwnerContactValue,
		isPhoneOwnerContact,
		normalizeOwnerContactKind,
		OWNER_CONTACT_KINDS,
		ownerContactHasLimitHint,
		ownerContactKindLabelKey,
		ownerContactValueLimit
	} from './owner-contact-utils.js';

	type HeadingTag = 'h4' | 'h5';

	let {
		contacts = $bindable<OwnerContactInput[]>([]),
		country = 'BRA',
		titleKey,
		headingTag = 'h4',
		listClass = 'mt-4 flex flex-col gap-3',
		itemClass = 'bg-background/50',
		onContactsChange
	}: {
		contacts?: OwnerContactInput[];
		country?: string | null;
		titleKey: TranslationKey;
		headingTag?: HeadingTag;
		listClass?: string;
		itemClass?: string;
		onContactsChange?: (contacts: OwnerContactInput[]) => void;
	} = $props();

	const phoneFormats = countryPhoneFormats();
	const phoneFormatContext = $derived({ country: countryPhoneFormat(country), countries: phoneFormats });

	function setContacts(nextContacts: OwnerContactInput[]) {
		contacts = nextContacts;
		onContactsChange?.(nextContacts);
	}

	function addContact() {
		setContacts([...contacts, createEmptyOwnerContact()]);
	}

	function removeContact(index: number) {
		setContacts(contacts.filter((_, contactIndex) => contactIndex !== index));
	}

	function updateContactKind(index: number, kind: string) {
		const nextKind = normalizeOwnerContactKind(kind);
		setContacts(
			contacts.map((contact, contactIndex) =>
				contactIndex === index
					? { ...contact, kind: nextKind, label: nextKind === 'other' ? (contact.label ?? '') : '', value: formatOwnerContactValue(nextKind, contact.value, phoneFormatContext) }
					: contact
			)
		);
	}

	function updateContactLabel(index: number, label: string) {
		setContacts(contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, label } : contact)));
	}

	function updateContactValue(index: number, value: string) {
		setContacts(
			contacts.map((contact, contactIndex) => {
				if (contactIndex !== index) return contact;
				return { ...contact, value: formatOwnerContactValue(contact.kind, value, phoneFormatContext) };
			})
		);
	}

	async function updateContactValueFromInput(index: number, kind: OwnerContactKind, input: HTMLInputElement) {
		if (!isPhoneOwnerContact(kind)) {
			updateContactValue(index, input.value);
			return;
		}

		const result = formatPhoneForInputWithCaret(input.value, input.selectionStart, phoneFormatContext);
		setContacts(contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, value: result.value } : contact)));
		await tick();
		if (input === document.activeElement) input.setSelectionRange(result.caret, result.caret);
	}
</script>

<div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
	<svelte:element this={headingTag} class="text-sm font-semibold">{t(titleKey)}</svelte:element>
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

<div class={cn('min-w-0 max-w-full', listClass)}>
	{#each contacts as contact, index}
		<div class={cn('min-w-0 max-w-full rounded-md border border-border p-2', itemClass)}>
			{#if ownerContactHasLimitHint(contact)}
				<div class="mb-2 flex flex-wrap items-center justify-end gap-2 px-1">
					{#if contact.kind === 'other'}
						<CharacterLimitHint value={contact.label ?? ''} max={FIELD_LIMITS.ownerContactLabel} />
					{/if}
					<CharacterLimitHint value={contact.value} max={ownerContactValueLimit(contact.kind)} />
				</div>
			{/if}

			<div class={cn('grid min-w-0 gap-2 items-center', contact.kind === 'other' ? 'sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem]' : 'sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem]')}>
				<div class="m-0 flex min-w-0 flex-col gap-1 text-sm font-medium">
					<span class="sr-only">{t('owner.contactType')}</span>
					<Select
						value={contact.kind}
						options={OWNER_CONTACT_KINDS.map((kind) => ({ value: kind, label: t(ownerContactKindLabelKey(kind)) }))}
						ariaLabel={t('owner.contactType')}
						onchange={(value) => updateContactKind(index, value)}
					/>
				</div>

				{#if contact.kind === 'other'}
					<label class="m-0 flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="sr-only">{t('owner.contactLabel')}</span>
						<input
							type="text"
							inputmode="text"
							autocomplete="off"
							class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={contact.label ?? ''}
							maxlength={FIELD_LIMITS.ownerContactLabel}
							oninput={(event) => updateContactLabel(index, event.currentTarget.value)}
							placeholder={t('owner.contactLabel')}
							aria-label={t('owner.contactLabel')}
							required
						/>
					</label>

					<label class="m-0 flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="sr-only">{t('owner.contactOtherValue')}</span>
						<input
							type="text"
							inputmode="text"
							autocomplete="off"
							class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={contact.value}
							maxlength={ownerContactValueLimit(contact.kind)}
							oninput={(event) => void updateContactValueFromInput(index, contact.kind, event.currentTarget)}
							placeholder={t('owner.contactOtherValue')}
							aria-label={t('owner.contactOtherValue')}
							required
						/>
					</label>
				{:else}
					<label class="m-0 flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="sr-only">{t('owner.contactValue')}</span>
						<input
							type={contact.kind === 'email' ? 'email' : 'tel'}
							inputmode={contact.kind === 'email' ? 'email' : 'tel'}
							autocomplete={contact.kind === 'email' ? 'email' : 'tel'}
							class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={contact.value}
							maxlength={ownerContactValueLimit(contact.kind)}
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
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">{t('owner.noContacts')}</p>
	{/each}
</div>
