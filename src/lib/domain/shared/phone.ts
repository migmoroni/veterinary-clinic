export function digitsOnly(value: string | null | undefined): string {
	return value?.replace(/\D/g, '') ?? '';
}

function formatBrazilPhoneLocal(value: string): string {
	const digits = digitsOnly(value).slice(0, 11);
	if (!digits) return '';

	if (digits.length <= 2) return `(${digits}`;

	const areaCode = digits.slice(0, 2);
	const number = digits.slice(2);

	if (number.length <= 4) return `(${areaCode}) ${number}`;
	if (number.length <= 8) return `(${areaCode}) ${number.slice(0, 4)}-${number.slice(4)}`;

	return `(${areaCode}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function formatPhoneForInput(value: string | null | undefined): string {
	const digits = digitsOnly(value).slice(0, 13);
	if (!digits) return '';

	if (digits.startsWith('55')) {
		const local = formatBrazilPhoneLocal(digits.slice(2));
		return local ? `+55 ${local}` : '+55';
	}

	return formatBrazilPhoneLocal(digits);
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