<script lang="ts">
	import type { OwnerContactInput, OwnerContactKind } from '$lib/domain/owner/owner.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { contacts = $bindable<OwnerContactInput[]>([]) }: { contacts?: OwnerContactInput[] } = $props();

	const contactKinds: OwnerContactKind[] = ['mobile', 'phone'];

	function kindLabelKey(kind: OwnerContactKind): TranslationKey {
		return `owner.contactKind.${kind}` as TranslationKey;
	}

	function addContact() {
		contacts = [...contacts, { kind: 'mobile', value: '' }];
	}

	function removeContact(index: number) {
		contacts = contacts.filter((_, contactIndex) => contactIndex !== index);
	}

	function updateContactKind(index: number, kind: string) {
		const nextKind: OwnerContactKind = kind === 'phone' ? 'phone' : 'mobile';
		contacts = contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, kind: nextKind } : contact));
	}

	function updateContactValue(index: number, value: string) {
		contacts = contacts.map((contact, contactIndex) => (contactIndex === index ? { ...contact, value } : contact));
	}
</script>

<div class="sm:col-span-2 rounded-md border border-border bg-background p-3">
	<div class="flex items-center justify-between gap-3">
		<h4 class="text-sm font-semibold">{t('owner.contacts')}</h4>
		<button
			type="button"
			class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
			aria-label={t('owner.addContact')}
			title={t('owner.addContact')}
			onclick={addContact}
		>
			<Plus class="size-4" />
			{t('owner.addContact')}
		</button>
	</div>

	<div class="mt-3 flex flex-col gap-2">
		{#each contacts as contact, index}
			<div class="grid gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem]">
				<label class="flex flex-col gap-1 text-sm font-medium">
					<span class="sr-only">{t('owner.contactType')}</span>
					<select
						class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
						value={contact.kind}
						onchange={(event) => updateContactKind(index, event.currentTarget.value)}
						aria-label={t('owner.contactType')}
					>
						{#each contactKinds as kind}
							<option value={kind}>{t(kindLabelKey(kind))}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1 text-sm font-medium">
					<span class="sr-only">{t('owner.contactValue')}</span>
					<input
						class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
						value={contact.value}
						oninput={(event) => updateContactValue(index, event.currentTarget.value)}
						placeholder={t('owner.contactValue')}
						aria-label={t('owner.contactValue')}
					/>
				</label>

				<button
					type="button"
					class="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					aria-label={t('owner.removeContact')}
					title={t('owner.removeContact')}
					onclick={() => removeContact(index)}
				>
					<Trash2 class="size-4" />
				</button>
			</div>
		{:else}
			<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('owner.noContacts')}</p>
		{/each}
	</div>
</div>
