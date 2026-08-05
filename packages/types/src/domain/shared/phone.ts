export function digitsOnly(value: string | null | undefined): string {
	return value?.replace(/\D/g, '') ?? '';
}

const MAX_INTERNATIONAL_PHONE_DIGITS = 15;

export interface PhoneMask {
	mask: string;
	minLength: number;
	maxLength: number;
	leadingDigits?: readonly string[];
}

export interface PhoneCountryFormat {
	callingCode: string;
	phoneMasks?: readonly PhoneMask[];
}

export interface PhoneFormatContext {
	country?: PhoneCountryFormat | null;
	countries?: readonly (PhoneCountryFormat | null | undefined)[];
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

function normalizeCallingCode(value: string | null | undefined): string | null {
	const digits = digitsOnly(value);
	return digits.length > 0 ? digits : null;
}

function normalizePhoneCountryFormat(format: PhoneCountryFormat | null | undefined): PhoneCountryFormat | null {
	const callingCode = normalizeCallingCode(format?.callingCode);
	if (!callingCode) return null;

	return { callingCode, phoneMasks: format?.phoneMasks ?? [] };
}

function normalizePhoneCountryFormats(context: PhoneFormatContext = {}): PhoneCountryFormat[] {
	const countries = [...(context.countries ?? []), context.country]
		.map(normalizePhoneCountryFormat)
		.filter((format): format is PhoneCountryFormat => Boolean(format));

	return countries.sort((left, right) => right.callingCode.length - left.callingCode.length || left.callingCode.localeCompare(right.callingCode));
}

function normalizedCallingCodes(formats: readonly PhoneCountryFormat[]): string[] {
	return [...new Set(formats.map((format) => format.callingCode))].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function hasLongerCallingCodeCandidate(value: string, callingCodes: readonly string[]): boolean {
	return callingCodes.some((callingCode) => callingCode.length > value.length && callingCode.startsWith(value));
}

function matchingCallingCode(value: string, callingCodes: readonly string[]): string | null {
	return callingCodes.find((callingCode) => value.startsWith(callingCode)) ?? null;
}

function phoneFormatForCallingCode(callingCode: string, formats: readonly PhoneCountryFormat[]): PhoneCountryFormat {
	const matchingFormats = formats.filter((format) => format.callingCode === callingCode);
	return {
		callingCode,
		phoneMasks: matchingFormats.flatMap((format) => [...(format.phoneMasks ?? [])])
	};
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

function maxLocalPhoneDigits(format: PhoneCountryFormat | null | undefined): number {
	const maskLengths = format?.phoneMasks?.map((mask) => mask.maxLength).filter((length) => Number.isFinite(length) && length > 0) ?? [];
	if (maskLengths.length > 0) return Math.max(...maskLengths);

	const callingCodeLength = normalizeCallingCode(format?.callingCode)?.length ?? 0;
	return Math.max(0, MAX_INTERNATIONAL_PHONE_DIGITS - callingCodeLength);
}

function leadingDigitsMatch(leadingDigits: readonly string[] | undefined, digits: string): boolean {
	if (!leadingDigits || !digits) return false;

	return leadingDigits.some((pattern) => {
		try {
			return new RegExp(`^(?:${pattern})`).test(digits);
		} catch {
			return false;
		}
	});
}

function selectPhoneMask(digits: string, masks: readonly PhoneMask[] = []): PhoneMask | null {
	const availableMasks = masks.filter((mask) => mask.mask.includes('#') && mask.maxLength > 0).sort((left, right) => left.maxLength - right.maxLength || left.mask.localeCompare(right.mask));
	if (availableMasks.length === 0) return null;

	const matchingByLeadingDigits = availableMasks.filter((mask) => leadingDigitsMatch(mask.leadingDigits, digits));
	const leadingDigitFit = matchingByLeadingDigits.find((mask) => digits.length <= mask.maxLength);
	if (leadingDigitFit) return leadingDigitFit;
	if (matchingByLeadingDigits.length > 0) return matchingByLeadingDigits.at(-1) ?? null;

	return availableMasks.find((mask) => digits.length <= mask.maxLength) ?? availableMasks.at(-1) ?? null;
}

function applyPhoneMask(digits: string, mask: string): string {
	let digitIndex = 0;
	let formatted = '';

	for (const character of mask) {
		if (character === '#') {
			if (digitIndex >= digits.length) break;
			formatted += digits[digitIndex];
			digitIndex += 1;
			continue;
		}

		if (digitIndex < digits.length) formatted += character;
	}

	return formatted;
}

function formatLocalPhone(value: string, format: PhoneCountryFormat | null | undefined): string {
	const digits = digitsOnly(value).slice(0, maxLocalPhoneDigits(format));
	if (!digits) return '';

	const mask = selectPhoneMask(digits, format?.phoneMasks);
	return mask ? applyPhoneMask(digits.slice(0, mask.maxLength), mask.mask) : digits;
}

function formatInternationalPhone(callingCode: string, value: string, format: PhoneCountryFormat | null | undefined, preserveEmptyLocalSeparator = false): string {
	const localDigits = digitsOnly(value).slice(0, maxLocalPhoneDigits(format));
	const local = formatLocalPhone(localDigits, format);

	if (local) return `+${callingCode} ${local}`;
	return preserveEmptyLocalSeparator ? `+${callingCode} ` : `+${callingCode}`;
}

function formatExplicitPhoneForInput(value: string, formats: readonly PhoneCountryFormat[]): string {
	const callingCodes = normalizedCallingCodes(formats);
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
		return formatInternationalPhone(firstDigits, localDigits, phoneFormatForCallingCode(firstDigits, formats), localDigits.length === 0);
	}

	const digits = digitsOnly(trimmed).slice(0, MAX_INTERNATIONAL_PHONE_DIGITS);
	if (hasLongerCallingCodeCandidate(digits, callingCodes)) return `+${digits}`;

	const callingCode = matchingCallingCode(digits, callingCodes);
	if (callingCode && digits.length > callingCode.length) return formatInternationalPhone(callingCode, digits.slice(callingCode.length), phoneFormatForCallingCode(callingCode, formats));

	return `+${digits}`;
}

export function formatPhoneForInput(value: string | null | undefined, context: PhoneFormatContext = {}): string {
	const hasExplicitCountryCode = startsWithExplicitCountryCode(value);
	const formats = normalizePhoneCountryFormats(context);
	const countryFormat = normalizePhoneCountryFormat(context.country);
	const digits = digitsOnly(value).slice(0, hasExplicitCountryCode ? MAX_INTERNATIONAL_PHONE_DIGITS : maxLocalPhoneDigits(countryFormat));

	if (hasExplicitCountryCode && !digits) return '+';
	if (!digits) return '';

	if (hasExplicitCountryCode) return formatExplicitPhoneForInput(value ?? '', formats);

	return formatLocalPhone(digits, countryFormat);
}

export function formatPhoneForInputWithCaret(value: string, selectionStart: number | null | undefined, context: PhoneFormatContext = {}): { value: string; caret: number } {
	const formatted = formatPhoneForInput(value, context);
	return { value: formatted, caret: phoneInputCaretPosition(value, formatted, selectionStart) };
}

export function formatPhoneForStorage(value: string | null | undefined, countryFormat: PhoneCountryFormat | null | undefined, context: PhoneFormatContext = {}): string | null {
	const trimmed = value?.trim() ?? '';
	const digits = digitsOnly(trimmed);
	if (!digits) return null;

	if (startsWithExplicitCountryCode(trimmed)) return formatPhoneForInput(trimmed, context);

	const normalizedCountryFormat = normalizePhoneCountryFormat(countryFormat);
	if (!normalizedCountryFormat) return trimmed;

	return formatInternationalPhone(normalizedCountryFormat.callingCode, digits, normalizedCountryFormat);
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