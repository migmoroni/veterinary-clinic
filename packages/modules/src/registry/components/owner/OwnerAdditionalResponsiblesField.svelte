<script lang="ts">
	import CharacterLimitHint from '@vet/ui/components/forms/CharacterLimitHint.svelte';
	import OwnerContactEditorList from './OwnerContactEditorList.svelte';
	import OwnerAvatar from './OwnerAvatar.svelte';
	import OwnerAvatarEditorDialog from './OwnerAvatarEditorDialog.svelte';
	import { createEmptyOwnerContact } from './owner-contact-utils.js';
	import type { OwnerAdditionalResponsibleInput, OwnerContactInput } from '@vet/types/domain/owner/owner.js';
	import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { responsibles = $bindable<OwnerAdditionalResponsibleInput[]>([]), country = 'BRA' }: { responsibles?: OwnerAdditionalResponsibleInput[]; country?: string | null } = $props();
	let avatarDialogIndex = $state<number | null>(null);

	const avatarDialogResponsible = $derived(avatarDialogIndex === null ? null : (responsibles[avatarDialogIndex] ?? null));

	function emptyResponsible(): OwnerAdditionalResponsibleInput {
		return { name: '', avatarBytes: null, contacts: [createEmptyOwnerContact()] };
	}

	function addResponsible() {
		responsibles = [...responsibles, emptyResponsible()];
	}

	function removeResponsible(index: number) {
		responsibles = responsibles.filter((_, responsibleIndex) => responsibleIndex !== index);
	}

	function updateResponsibleContacts(index: number, contacts: OwnerContactInput[]) {
		responsibles = responsibles.map((responsible, responsibleIndex) => (responsibleIndex === index ? { ...responsible, contacts } : responsible));
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

</script>

<div class="min-w-0 max-w-full pt-2 sm:col-span-5">
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

	<div class="mt-4 flex min-w-0 flex-col gap-3">
		{#each responsibles as responsible, responsibleIndex}
			<article class="min-w-0 max-w-full rounded-md border border-border bg-background/50 p-3">
				<div class="grid min-w-0 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_2.5rem] sm:items-end">
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

					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="flex min-w-0 items-baseline justify-between gap-2">
							<span>{t('owner.additionalResponsibleName')}</span>
							<CharacterLimitHint value={responsible.name} max={FIELD_LIMITS.ownerAdditionalResponsibleName} />
						</span>
						<input
							class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
							value={responsible.name}
							maxlength={FIELD_LIMITS.ownerAdditionalResponsibleName}
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

				<div class="mt-4 min-w-0">
					<OwnerContactEditorList
						contacts={responsible.contacts}
						country={country}
						titleKey="owner.additionalResponsibleContacts"
						headingTag="h5"
						listClass="mt-3 flex flex-col gap-2"
						itemClass="bg-background"
						onContactsChange={(contacts) => updateResponsibleContacts(responsibleIndex, contacts)}
					/>
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
