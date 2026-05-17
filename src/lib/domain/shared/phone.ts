export function digitsOnly(value: string | null | undefined): string {
	return value?.replace(/\D/g, '') ?? '';
}

const MAX_INTERNATIONAL_PHONE_DIGITS = 15;

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

function normalizeCallingCode(value: string | null | undefined): string | null {
	const digits = digitsOnly(value);
	return digits.length > 0 ? digits : null;
}

function normalizeCallingCodes(values: readonly (string | null | undefined)[] = []): string[] {
	return [...new Set(values.map(normalizeCallingCode).filter((value): value is string => Boolean(value)))].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function hasLongerCallingCodeCandidate(value: string, callingCodes: readonly string[]): boolean {
	return callingCodes.some((callingCode) => callingCode.length > value.length && callingCode.startsWith(value));
}

function matchingCallingCode(value: string, callingCodes: readonly string[]): string | null {
	return callingCodes.find((callingCode) => value.startsWith(callingCode)) ?? null;
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

function formatLocalPhoneForCallingCode(callingCode: string, value: string): string {
	if (callingCode === '55') return formatBrazilPhoneLocal(value);
	return digitsOnly(value);
}

function formatInternationalPhone(callingCode: string, value: string, preserveEmptyLocalSeparator = false): string {
	const localDigits = digitsOnly(value).slice(0, Math.max(0, MAX_INTERNATIONAL_PHONE_DIGITS - callingCode.length));
	const local = formatLocalPhoneForCallingCode(callingCode, localDigits);

	if (local) return `+${callingCode} ${local}`;
	return preserveEmptyLocalSeparator ? `+${callingCode} ` : `+${callingCode}`;
}

function formatExplicitPhoneForInput(value: string, callingCodes: readonly string[]): string {
	const trimmed = value.trimStart();
	const rawAfterPlus = trimmed.slice(1);
	const firstDigitIndex = rawAfterPlus.search(/\d/);
	if (firstDigitIndex < 0) return '+';

	const digitStart = firstDigitIndex;
	let digitEnd = digitStart;
	while (digitEnd < rawAfterPlus.length && isDigit(rawAfterPlus[digitEnd])) digitEnd += 1;

	const firstDigits = rawAfterPlus.slice(digitStart, digitEnd).slice(0, MAX_INTERNATIONAL_PHONE_DIGITS);
	const rawAfterFirstDigits = rawAfterPlus.slice(digitEnd);
	const hasUserDefinedSeparator = rawAfterFirstDigits.length > 0;

	if (hasUserDefinedSeparator) {
		const localDigits = digitsOnly(rawAfterFirstDigits);
		return formatInternationalPhone(firstDigits, localDigits, localDigits.length === 0);
	}

	const digits = digitsOnly(trimmed).slice(0, MAX_INTERNATIONAL_PHONE_DIGITS);
	if (hasLongerCallingCodeCandidate(digits, callingCodes)) return `+${digits}`;

	const callingCode = matchingCallingCode(digits, callingCodes);
	if (callingCode && digits.length > callingCode.length) return formatInternationalPhone(callingCode, digits.slice(callingCode.length));

	return `+${digits}`;
}

export function formatPhoneForInput(value: string | null | undefined, callingCodes: readonly (string | null | undefined)[] = []): string {
	const hasExplicitCountryCode = startsWithExplicitCountryCode(value);
	const normalizedCallingCodes = normalizeCallingCodes(callingCodes);
	const digits = digitsOnly(value).slice(0, hasExplicitCountryCode ? MAX_INTERNATIONAL_PHONE_DIGITS : 13);

	if (hasExplicitCountryCode && !digits) return '+';
	if (!digits) return '';

	if (hasExplicitCountryCode) return formatExplicitPhoneForInput(value ?? '', normalizedCallingCodes);

	return formatBrazilPhoneLocal(digits);
}

export function formatPhoneForInputWithCaret(value: string, selectionStart: number | null | undefined, callingCodes: readonly (string | null | undefined)[] = []): { value: string; caret: number } {
	const formatted = formatPhoneForInput(value, callingCodes);
	return { value: formatted, caret: phoneInputCaretPosition(value, formatted, selectionStart) };
}

export function formatPhoneForStorage(value: string | null | undefined, callingCode: string | null | undefined, callingCodes: readonly (string | null | undefined)[] = []): string | null {
	const trimmed = value?.trim() ?? '';
	const digits = digitsOnly(trimmed);
	if (!digits) return null;

	if (startsWithExplicitCountryCode(trimmed)) return formatPhoneForInput(trimmed, callingCodes);

	const countryCallingCode = normalizeCallingCode(callingCode);
	if (!countryCallingCode) return trimmed;

	return formatInternationalPhone(countryCallingCode, digits);
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