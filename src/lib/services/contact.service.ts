import { getEmailUrl } from '$lib/domain/shared/email.js';
import { getPhoneCallUrl, getWhatsAppUrl } from '$lib/domain/shared/phone.js';
import { openExternalUrl } from '$lib/native/external-link.js';

export async function openEmailForEmail(email: string | null | undefined): Promise<void> {
	const url = getEmailUrl(email);
	if (!url) return;

	await openExternalUrl(url);
}

export async function openWhatsAppForPhone(phone: string | null | undefined): Promise<void> {
	const mobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
	const url = getWhatsAppUrl(phone, mobile);
	if (!url) return;

	await openExternalUrl(url);
}

export async function openPhoneCallForPhone(phone: string | null | undefined): Promise<void> {
	const url = getPhoneCallUrl(phone);
	if (!url) return;

	await openExternalUrl(url);
}