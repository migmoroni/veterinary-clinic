import type { OwnerContactInput, OwnerContactKind } from '$lib/domain/owner/owner.js';
import { formatEmailForInput } from '$lib/domain/shared/email.js';
import { FIELD_LIMITS, textLength } from '$lib/domain/shared/field-limits.js';
import { formatPhoneForInput, type PhoneFormatContext } from '$lib/domain/shared/phone.js';
import type { TranslationKey } from '$lib/i18n/index.js';

export type OwnerContactLike = {
	kind: OwnerContactKind;
	label?: string | null;
	value: string;
	responsibleId?: number | null;
	responsibleName?: string | null;
};

export const OWNER_CONTACT_KINDS = ['mobile', 'phone', 'email', 'other'] as const satisfies readonly OwnerContactKind[];

export function createEmptyOwnerContact(): OwnerContactInput {
	return { kind: 'mobile', label: '', value: '' };
}

export function normalizeOwnerContactKind(kind: string | null | undefined): OwnerContactKind {
	if (kind === 'other') return 'other';
	if (kind === 'phone') return 'phone';
	if (kind === 'email') return 'email';
	return 'mobile';
}

export function ownerContactKindLabelKey(kind: OwnerContactKind): TranslationKey {
	return `owner.contactKind.${kind}` as TranslationKey;
}

export function formatOwnerContactValue(kind: OwnerContactKind, value: string, phoneFormatContext: PhoneFormatContext): string {
	if (kind === 'other') return value;
	return kind === 'email' ? formatEmailForInput(value) : formatPhoneForInput(value, phoneFormatContext);
}

export function ownerContactValueLimit(kind: OwnerContactKind): number {
	if (kind === 'email') return FIELD_LIMITS.ownerContactEmailValue;
	if (kind === 'other') return FIELD_LIMITS.ownerContactOtherValue;
	return FIELD_LIMITS.ownerContactPhoneValue;
}

export function ownerContactShouldShowLimitHint(value: string | null | undefined, max: number): boolean {
	return max > 0 && textLength(value) >= Math.floor(max * 0.85);
}

export function ownerContactHasLimitHint(contact: OwnerContactLike): boolean {
	return (contact.kind === 'other' && ownerContactShouldShowLimitHint(contact.label, FIELD_LIMITS.ownerContactLabel)) || ownerContactShouldShowLimitHint(contact.value, ownerContactValueLimit(contact.kind));
}

export function isPhoneOwnerContact(kind: OwnerContactKind): boolean {
	return kind === 'phone' || kind === 'mobile';
}

export function isEmailOwnerContact(kind: OwnerContactKind): boolean {
	return kind === 'email';
}

export function canCallOwnerContact(kind: OwnerContactKind): boolean {
	return kind === 'phone' || kind === 'mobile';
}

export function canOpenOwnerContactWhatsApp(kind: OwnerContactKind): boolean {
	return kind === 'mobile';
}

export function ownerContactIsVisible(contact: OwnerContactLike): boolean {
	return contact.value.trim().length > 0 && (contact.kind !== 'other' || (contact.label ?? '').trim().length > 0);
}

export function ownerContactKindSubtitle(contact: OwnerContactLike, translate: (key: TranslationKey) => string): string {
	const label = (contact.label ?? '').trim();
	return contact.kind === 'other' && label.length > 0 ? label : translate(ownerContactKindLabelKey(contact.kind));
}

export function ownerContactSubtitle(contact: OwnerContactLike, translate: (key: TranslationKey) => string): string {
	const kindLabel = ownerContactKindSubtitle(contact, translate);
	const responsibleName = contact.responsibleName?.trim() ?? '';
	return responsibleName.length > 0 ? `${responsibleName} · ${kindLabel}` : kindLabel;
}