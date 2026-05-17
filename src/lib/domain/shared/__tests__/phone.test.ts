import { describe, expect, it } from 'vitest';
import { formatPhoneForInput, formatPhoneForInputWithCaret, formatPhoneForStorage, formatPhoneForWhatsApp, getPhoneCallUrl, getWhatsAppUrl } from '../phone.js';

describe('phone input mask', () => {
	it('formats brazilian numbers without country code', () => {
		expect(formatPhoneForInput('16999998888')).toBe('(16) 99999-8888');
		expect(formatPhoneForInput('1633334444')).toBe('(16) 3333-4444');
	});

	it('formats brazilian numbers with explicit country code', () => {
		expect(formatPhoneForInput('+55 16 99999-8888')).toBe('+55 (16) 99999-8888');
		expect(formatPhoneForInput('55')).toBe('(55');
	});

	it('keeps non-Brazil international numbers when typed with plus', () => {
		expect(formatPhoneForInput('+')).toBe('+');
		expect(formatPhoneForInput('+1 202 555 0181')).toBe('+12025550181');
		expect(formatPhoneForInput('+351 912 345 678')).toBe('+351912345678');
	});

	it('preserves the caret around generated formatting characters', () => {
		expect(formatPhoneForInputWithCaret('(16) 99999-8888', 5)).toEqual({ value: '(16) 99999-8888', caret: 5 });
		expect(formatPhoneForInputWithCaret('16999998888', 4)).toEqual({ value: '(16) 99999-8888', caret: 7 });
		expect(formatPhoneForInputWithCaret('+', 1)).toEqual({ value: '+', caret: 1 });
	});
});

describe('phone storage normalization', () => {
	it('adds the address country calling code when no plus sign was typed', () => {
		expect(formatPhoneForStorage('(16) 99999-8888', '55')).toBe('+55 (16) 99999-8888');
		expect(formatPhoneForStorage('912345678', '351')).toBe('+351912345678');
	});

	it('keeps explicit international numbers as entered with plus', () => {
		expect(formatPhoneForStorage('+1 202 555 0181', '55')).toBe('+12025550181');
		expect(formatPhoneForStorage('+55 16 99999-8888', '351')).toBe('+55 (16) 99999-8888');
	});

	it('does not treat bare 55 as a country code', () => {
		expect(formatPhoneForStorage('5516999998888', '55')).toBe('+55 (55) 16999-9988');
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
		expect(getPhoneCallUrl('')).toBeNull();
	});
});
