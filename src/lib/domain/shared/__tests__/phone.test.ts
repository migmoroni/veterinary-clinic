import { describe, expect, it } from 'vitest';
import { formatPhoneForInput, formatPhoneForWhatsApp, getPhoneCallUrl, getWhatsAppUrl } from '../phone.js';

describe('phone input mask', () => {
	it('formats brazilian numbers without country code', () => {
		expect(formatPhoneForInput('16999998888')).toBe('(16) 99999-8888');
		expect(formatPhoneForInput('1633334444')).toBe('(16) 3333-4444');
	});

	it('formats brazilian numbers with explicit country code', () => {
		expect(formatPhoneForInput('+55 16 99999-8888')).toBe('+55 (16) 99999-8888');
		expect(formatPhoneForInput('55')).toBe('+55');
	});
});

describe('phone helpers', () => {
	it('normalizes Brazilian mobile numbers with the country code', () => {
		expect(formatPhoneForWhatsApp('(16) 99999-8888')).toBe('5516999998888');
	});

	it('keeps an explicit Brazil country code', () => {
		expect(formatPhoneForWhatsApp('+55 16 99999-8888')).toBe('5516999998888');
	});

	it('builds desktop and mobile WhatsApp URLs', () => {
		expect(getWhatsAppUrl('(16) 99999-8888', false)).toBe('https://web.whatsapp.com/send?phone=5516999998888');
		expect(getWhatsAppUrl('(16) 99999-8888', true)).toBe('whatsapp://send?phone=5516999998888');
	});

	it('builds phone call URLs', () => {
		expect(getPhoneCallUrl('(16) 3333-4444')).toBe('tel:1633334444');
		expect(getPhoneCallUrl('')).toBeNull();
	});
});