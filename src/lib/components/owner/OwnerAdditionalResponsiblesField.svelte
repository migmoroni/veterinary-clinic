<script lang="ts">
	import OwnerAvatar from '$lib/components/owner/OwnerAvatar.svelte';
	import OwnerAvatarEditorDialog from '$lib/components/owner/OwnerAvatarEditorDialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import type { OwnerAdditionalResponsibleInput, OwnerContactInput, OwnerContactKind } from '$lib/domain/owner/owner.js';
	import { formatEmailForInput } from '$lib/domain/shared/email.js';
	import { formatPhoneForInput } from '$lib/domain/shared/phone.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { responsibles = $bindable<OwnerAdditionalResponsibleInput[]>([]) }: { responsibles?: OwnerAdditionalResponsibleInput[] } = $props();
	let avatarDialogIndex = $state<number | null>(null);

	const contactKinds: OwnerContactKind[] = ['mobile', 'phone', 'email', 'other'];
	const avatarDialogResponsible = $derived(avatarDialogIndex === null ? null : (responsibles[avatarDialogIndex] ?? null));

	function kindLabelKey(kind: OwnerContactKind): TranslationKey {
		return `owner.contactKind.${kind}` as TranslationKey;
	}

	function emptyContact(): OwnerContactInput {
		return { kind: 'mobile', label: '', value: '' };
	}

	function emptyResponsible(): OwnerAdditionalResponsibleInput {
		return { name: '', avatarBytes: null, contacts: [emptyContact()] };
	}

	function normalizeContactKind(kind: string): OwnerContactKind {
		if (kind === 'other') return 'other';
		if (kind === 'phone') return 'phone';
		if (kind === 'email') return 'email';
		return 'mobile';
	}

	function formatContactValue(kind: OwnerContactKind, value: string): string {
		if (kind === 'other') return value;
		return kind === 'email' ? formatEmailForInput(value) : formatPhoneForInput(value);
	}

	function addResponsible() {
		responsibles = [...responsibles, emptyResponsible()];
	}

	function removeResponsible(index: number) {
		responsibles = responsibles.filter((_, responsibleIndex) => responsibleIndex !== index);
	}

	function updateResponsibleName(index: number, name: string) {
		responsibles = responsibles.map((responsible, responsibleIndex) => (responsibleIndex === index ? { ...responsible, name } : responsible));
	}

	function openResponsibleAvatarDialog(index: number) {
		avatarDialogIndex = index;
	}

	function closeResponsibleAvatarDialog() {
		avatarDialogIndex = null;
	}

	function updateResponsibleAvatar(index: number, avatarBytes: Uint8Array | null) {
		responsibles = responsibles.map((responsible, responsibleIndex) => (responsibleIndex === index ? { ...responsible, avatarBytes } : responsible));
	}

	function applyResponsibleAvatar(bytes: Uint8Array) {
		if (avatarDialogIndex === null) return;

		updateResponsibleAvatar(avatarDialogIndex, bytes);
		avatarDialogIndex = null;
	}

	function removeResponsibleAvatar() {
		if (avatarDialogIndex === null) return;

		updateResponsibleAvatar(avatarDialogIndex, null);
		avatarDialogIndex = null;
	}

	function addContact(responsibleIndex: number) {
		responsibles = responsibles.map((responsible, index) => (index === responsibleIndex ? { ...responsible, contacts: [...responsible.contacts, emptyContact()] } : responsible));
	}

	function removeContact(responsibleIndex: number, contactIndex: number) {
		responsibles = responsibles.map((responsible, index) =>
			index === responsibleIndex ? { ...responsible, contacts: responsible.contacts.filter((_, currentContactIndex) => currentContactIndex !== contactIndex) } : responsible
		);
	}

	function updateContactKind(responsibleIndex: number, contactIndex: number, kind: string) {
		const nextKind = normalizeContactKind(kind);
		responsibles = responsibles.map((responsible, index) => {
			if (index !== responsibleIndex) return responsible;

			return {
				...responsible,
				contacts: responsible.contacts.map((contact, currentContactIndex) =>
					currentContactIndex === contactIndex ? { ...contact, kind: nextKind, label: nextKind === 'other' ? (contact.label ?? '') : '', value: formatContactValue(nextKind, contact.value) } : contact
				)
			};
		});
	}

	function updateContactLabel(responsibleIndex: number, contactIndex: number, label: string) {
		responsibles = responsibles.map((responsible, index) => {
			if (index !== responsibleIndex) return responsible;

			return {
				...responsible,
				contacts: responsible.contacts.map((contact, currentContactIndex) => (currentContactIndex === contactIndex ? { ...contact, label } : contact))
			};
		});
	}

	function updateContactValue(responsibleIndex: number, contactIndex: number, value: string) {
		responsibles = responsibles.map((responsible, index) => {
			if (index !== responsibleIndex) return responsible;

			return {
				...responsible,
				contacts: responsible.contacts.map((contact, currentContactIndex) =>
					currentContactIndex === contactIndex ? { ...contact, value: formatContactValue(contact.kind, value) } : contact
				)
			};
		});
	}
</script>

<div class="sm:col-span-5 pt-2">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h4 class="text-sm font-semibold">{t('owner.additionalResponsibles')}</h4>
		<button
			type="button"
			class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
			aria-label={t('owner.addAdditionalResponsible')}
			title={t('owner.addAdditionalResponsible')}
			onclick={addResponsible}
		>
			<Plus class="size-4" />
			{t('owner.addAdditionalResponsible')}
		</button>
	</div>

	<div class="mt-4 flex flex-col gap-3">
		{#each responsibles as responsible, responsibleIndex}
			<article class="rounded-md border border-border bg-background/50 p-3">
				<div class="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_2.5rem] sm:items-end">
					<div class="flex min-w-0 items-center gap-3">
						<OwnerAvatar
							avatarBytes={responsible.avatarBytes ?? null}
							ownerName={responsible.name}
							avatarAltKey="owner.additionalResponsibleAvatarAlt"
							avatarPlaceholderAltKey="owner.additionalResponsibleAvatarPlaceholderAlt"
							className="size-14"
							iconClass="size-6 text-muted-foreground"
						/>
						<div class="min-w-0">
							<p class="text-sm font-semibold">{t('owner.additionalResponsibleAvatarLabel')}</p>
							<div class="mt-2 flex flex-wrap gap-2">
								<button type="button" class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30" aria-label={`${t('owner.avatarEdit')}: ${responsible.name || t('owner.additionalResponsibleLabel')}`} title={t('owner.avatarEdit')} onclick={() => openResponsibleAvatarDialog(responsibleIndex)}>
									{t('owner.avatarEdit')}
								</button>
							</div>
						</div>
					</div>

					<label class="flex flex-col gap-1 text-sm font-medium">
						<span>{t('owner.additionalResponsibleName')}</span>
						<input
							class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={responsible.name}
							oninput={(event) => updateResponsibleName(responsibleIndex, event.currentTarget.value)}
							placeholder={t('owner.additionalResponsibleName')}
							autocomplete="name"
							required
						/>
					</label>

					<button
						type="button"
						class="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring/30"
						aria-label={t('owner.removeAdditionalResponsible')}
						title={t('owner.removeAdditionalResponsible')}
						onclick={() => removeResponsible(responsibleIndex)}
					>
						<Trash2 class="size-4" />
					</button>
				</div>

				<div class="mt-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h5 class="text-sm font-semibold">{t('owner.additionalResponsibleContacts')}</h5>
						<button
							type="button"
							class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
							aria-label={t('owner.addContact')}
							title={t('owner.addContact')}
							onclick={() => addContact(responsibleIndex)}
						>
							<Plus class="size-4" />
							{t('owner.addContact')}
						</button>
					</div>

					<div class="mt-3 flex flex-col gap-2">
						{#each responsible.contacts as contact, contactIndex}
							<div class="grid gap-2 rounded-md border border-border bg-background p-2 sm:items-center {contact.kind === 'other' ? 'sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem]' : 'sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem]'}">
								<div class="flex flex-col gap-1 text-sm font-medium">
									<span class="sr-only">{t('owner.contactType')}</span>
									<Select
										value={contact.kind}
										options={contactKinds.map((kind) => ({ value: kind, label: t(kindLabelKey(kind)) }))}
										ariaLabel={t('owner.contactType')}
										onchange={(value) => updateContactKind(responsibleIndex, contactIndex, value)}
									/>
								</div>

								{#if contact.kind === 'other'}
									<label class="flex flex-col gap-1 text-sm font-medium">
										<span class="sr-only">{t('owner.contactLabel')}</span>
										<input
											type="text"
											inputmode="text"
											autocomplete="off"
											class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
											value={contact.label ?? ''}
											oninput={(event) => updateContactLabel(responsibleIndex, contactIndex, event.currentTarget.value)}
											placeholder={t('owner.contactLabel')}
											aria-label={t('owner.contactLabel')}
											required
										/>
									</label>

									<label class="flex flex-col gap-1 text-sm font-medium">
										<span class="sr-only">{t('owner.contactOtherValue')}</span>
										<input
											type="text"
											inputmode="text"
											autocomplete="off"
											class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
											value={contact.value}
											oninput={(event) => updateContactValue(responsibleIndex, contactIndex, event.currentTarget.value)}
											placeholder={t('owner.contactOtherValue')}
											aria-label={t('owner.contactOtherValue')}
											required
										/>
									</label>
								{:else}
									<label class="flex flex-col gap-1 text-sm font-medium">
										<span class="sr-only">{t('owner.contactValue')}</span>
										<input
											type={contact.kind === 'email' ? 'email' : 'tel'}
											inputmode={contact.kind === 'email' ? 'email' : 'tel'}
											autocomplete={contact.kind === 'email' ? 'email' : 'tel'}
											class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
											value={contact.value}
											oninput={(event) => updateContactValue(responsibleIndex, contactIndex, event.currentTarget.value)}
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
									onclick={() => removeContact(responsibleIndex, contactIndex)}
								>
									<Trash2 class="size-4" />
								</button>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">{t('owner.noContacts')}</p>
						{/each}
					</div>
				</div>
			</article>
		{:else}
			<p class="text-sm text-muted-foreground">{t('owner.noAdditionalResponsibles')}</p>
		{/each}
	</div>
</div>

{#if avatarDialogResponsible}
	<OwnerAvatarEditorDialog
		initialAvatarBytes={avatarDialogResponsible.avatarBytes ?? null}
		titleKey="owner.additionalResponsibleAvatarDialogTitle"
		descriptionKey="owner.additionalResponsibleAvatarDialogDescription"
		onApply={applyResponsibleAvatar}
		onRemove={removeResponsibleAvatar}
		onClose={closeResponsibleAvatarDialog}
	/>
{/if}
