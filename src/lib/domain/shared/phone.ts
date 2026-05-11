export function digitsOnly(value: string | null | undefined): string {
	return value?.replace(/\D/g, '') ?? '';
}

export function formatPhoneForWhatsApp(value: string | null | undefined): string | null {
	const digits = digitsOnly(value);
	if (!digits) return null;

	if (digits.startsWith('55')) return digits;
	if (digits.length === 10 || digits.length === 11) return `55${digits}`;

	return digits;
}

export function getWhatsAppUrl(value: string | null | undefined, mobile: boolean): string | null {
	const phone = formatPhoneForWhatsApp(value);
	if (!phone) return null;

	return mobile ? `whatsapp://send?phone=${phone}` : `https://web.whatsapp.com/send?phone=${phone}`;
}

export function getPhoneCallUrl(value: string | null | undefined): string | null {
	const phone = digitsOnly(value);
	if (!phone) return null;

	return `tel:${phone}`;
}