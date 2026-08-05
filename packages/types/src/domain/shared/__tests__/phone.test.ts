import { describe, expect, it } from 'vitest';
import { countryPhoneFormat, countryPhoneFormats } from '../../geo/location.js';
import { formatPhoneForInput, formatPhoneForInputWithCaret, formatPhoneForStorage, formatPhoneForWhatsApp, getPhoneCallUrl, getWhatsAppUrl } from '../phone.js';

const phoneFormats = countryPhoneFormats();
const brazilFormat = countryPhoneFormat('BRA');
const portugalFormat = countryPhoneFormat('PRT');
const caymanFormat = countryPhoneFormat('CYM');
const context = { country: brazilFormat, countries: phoneFormats };

describe('phone input mask', () => {
	it('formats brazilian numbers without country code', () => {
		expect(formatPhoneForInput('16999998888', context)).toBe('(16) 99999-8888');
		expect(formatPhoneForInput('1633334444', context)).toBe('(16) 3333-4444');
	});

	it('formats brazilian numbers with explicit country code', () => {
		expect(formatPhoneForInput('+55 16 99999-8888', context)).toBe('+55 (16) 99999-8888');
		expect(formatPhoneForInput('55', context)).toBe('(55');
	});

	it('uses geo masks for international local numbers', () => {
		expect(formatPhoneForInput('+', context)).toBe('+');
		expect(formatPhoneForInput('+1 202 555 0181', context)).toBe('+1 (202) 555-0181');
		expect(formatPhoneForInput('+351 912 345 678', context)).toBe('+351 912 345 678');
		expect(formatPhoneForInput('+1345 555 1234', context)).toBe('+1345 555-1234');
	});

	it('waits for a separator before committing ambiguous NANP country codes', () => {
		expect(formatPhoneForInput('+1', context)).toBe('+1');
		expect(formatPhoneForInput('+13', context)).toBe('+13');
		expect(formatPhoneForInput('+134', context)).toBe('+134');
		expect(formatPhoneForInput('+1345', context)).toBe('+1345');
		expect(formatPhoneForInput('+1345 ', context)).toBe('+1345 ');
		expect(formatPhoneForInput('+13455', context)).toBe('+1345 5');
	});

	it('strips non-digits and caps long typed phone values', () => {
		expect(formatPhoneForInput('abc (16) 99999-8888 ramal 999', context)).toBe('(16) 99999-8888');
		expect(formatPhoneForInput('+12345678901234567890', context)).toBe('+1 (234) 567-8901');
		expect(formatPhoneForInput('12345678901234567890', context)).toBe('(12) 34567-8901');
	});

	it('preserves the caret around generated formatting characters', () => {
		expect(formatPhoneForInputWithCaret('(16) 99999-8888', 5, context)).toEqual({ value: '(16) 99999-8888', caret: 5 });
		expect(formatPhoneForInputWithCaret('16999998888', 4, context)).toEqual({ value: '(16) 99999-8888', caret: 7 });
		expect(formatPhoneForInputWithCaret('+', 1, context)).toEqual({ value: '+', caret: 1 });
	});
});

describe('phone storage normalization', () => {
	it('adds the address country calling code when no plus sign was typed', () => {
		expect(formatPhoneForStorage('(16) 99999-8888', brazilFormat, context)).toBe('+55 (16) 99999-8888');
		expect(formatPhoneForStorage('912345678', portugalFormat, { country: portugalFormat, countries: phoneFormats })).toBe('+351 912 345 678');
		expect(formatPhoneForStorage('5551234', caymanFormat, { country: caymanFormat, countries: phoneFormats })).toBe('+1345 555-1234');
	});

	it('keeps explicit international numbers as entered with plus', () => {
		expect(formatPhoneForStorage('+1 202 555 0181', brazilFormat, context)).toBe('+1 (202) 555-0181');
		expect(formatPhoneForStorage('+55 16 99999-8888', portugalFormat, { country: portugalFormat, countries: phoneFormats })).toBe('+55 (16) 99999-8888');
		expect(formatPhoneForStorage('+1345 555 1234', countryPhoneFormat('USA'), { country: countryPhoneFormat('USA'), countries: phoneFormats })).toBe('+1345 555-1234');
	});

	it('does not treat bare 55 as a country code', () => {
		expect(formatPhoneForStorage('5516999998888', brazilFormat, context)).toBe('+55 (55) 16999-9988');
	});

	it('characterizes storage behavior without a known country calling code', () => {
		expect(formatPhoneForStorage('  abc 123  ', null, { countries: phoneFormats })).toBe('abc 123');
		expect(formatPhoneForStorage('9'.repeat(200), portugalFormat, { country: portugalFormat, countries: phoneFormats })).toBe('+351 999 999 999');
	});
});

describe('phone helpers', () => {
	it('uses the stored phone number without guessing a missing country code', () => {
		expect(formatPhoneForWhatsApp('(16) 99999-8888')).toBe('16999998888');
	});

	it('keeps an explicit Brazil country code', () => {
		expect(formatPhoneForWhatsApp('+55 16 99999-8888')).toBe('5516999998888');
	});

	it('builds desktop and mobile WhatsApp URLs', () => {
		expect(getWhatsAppUrl('+55 (16) 99999-8888', false)).toBe('https://web.whatsapp.com/send?phone=5516999998888');
		expect(getWhatsAppUrl('+55 (16) 99999-8888', true)).toBe('whatsapp://send?phone=5516999998888');
	});

	it('builds phone call URLs', () => {
		expect(getPhoneCallUrl('(16) 3333-4444')).toBe('tel:1633334444');
		expect(getPhoneCallUrl('+1 202 555 0181')).toBe('tel:+12025550181');
		expect(getPhoneCallUrl('+abc')).toBeNull();
		expect(getPhoneCallUrl('')).toBeNull();
	});
});
