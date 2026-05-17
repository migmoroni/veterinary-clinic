export function digitsOnly(value: string | null | undefined): string {
	return value?.replace(/\D/g, '') ?? '';
}

function startsWithExplicitCountryCode(value: string | null | undefined): boolean {
	return value?.trimStart().startsWith('+') ?? false;
}

function isDigit(value: string): boolean {
	return /\d/.test(value);
}

function trailingFormattingLength(value: string): number {
	let count = 0;
	for (let index = value.length - 1; index >= 0; index -= 1) {
		if (isDigit(value[index])) return count;
		count += 1;
	}

	return count;
}

function phoneInputCaretPosition(value: string, formattedValue: string, selectionStart: number | null | undefined): number {
	const rawCaret = Math.min(Math.max(selectionStart ?? value.length, 0), value.length);
	const beforeCaret = value.slice(0, rawCaret);
	const targetDigits = digitsOnly(beforeCaret).length;
	const targetFormatting = trailingFormattingLength(beforeCaret);
	let prefixDigits = 0;
	let bestPosition = formattedValue.length;
	let bestScore = Number.POSITIVE_INFINITY;

	for (let position = 0; position <= formattedValue.length; position += 1) {
		if (position > 0 && isDigit(formattedValue[position - 1])) prefixDigits += 1;
		if (prefixDigits !== targetDigits) continue;

		const formatting = trailingFormattingLength(formattedValue.slice(0, position));
		const score = Math.abs(formatting - targetFormatting);
		if (score < bestScore || (score === bestScore && formatting <= targetFormatting)) {
			bestPosition = position;
			bestScore = score;
		}
	}

	return bestPosition;
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
	const hasExplicitCountryCode = startsWithExplicitCountryCode(value);
	const digits = digitsOnly(value).slice(0, hasExplicitCountryCode ? 15 : 13);

	if (hasExplicitCountryCode && !digits) return '+';
	if (!digits) return '';

	if (hasExplicitCountryCode && digits.startsWith('55')) {
		const local = formatBrazilPhoneLocal(digits.slice(2));
		return local ? `+55 ${local}` : '+55';
	}

	if (hasExplicitCountryCode) return `+${digits}`;

	return formatBrazilPhoneLocal(digits);
}

export function formatPhoneForInputWithCaret(value: string, selectionStart: number | null | undefined): { value: string; caret: number } {
	const formatted = formatPhoneForInput(value);
	return { value: formatted, caret: phoneInputCaretPosition(value, formatted, selectionStart) };
}

export function formatPhoneForStorage(value: string | null | undefined, callingCode: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? '';
	const digits = digitsOnly(trimmed);
	if (!digits) return null;

	if (startsWithExplicitCountryCode(trimmed)) return formatPhoneForInput(trimmed);

	const countryCallingCode = digitsOnly(callingCode);
	if (!countryCallingCode) return trimmed;

	const localDigits = digits.slice(0, Math.max(0, 15 - countryCallingCode.length));
	if (countryCallingCode === '55') {
		const local = formatBrazilPhoneLocal(localDigits);
		return local ? `+55 ${local}` : '+55';
	}

	return `+${countryCallingCode}${localDigits}`;
}

export function formatPhoneForWhatsApp(value: string | null | undefined): string | null {
	const digits = digitsOnly(value);
	if (!digits) return null;

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

	return startsWithExplicitCountryCode(value) ? `tel:+${phone}` : `tel:${phone}`;
}