import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	openExternalUrl: vi.fn()
}));

vi.mock('@vet/core-local/native/external-link.js', () => ({
	openExternalUrl: mocks.openExternalUrl
}));

import { openEmailForEmail, openPhoneCallForPhone, openWhatsAppForPhone } from '../contact.service.js';

describe('contact service', () => {
	beforeEach(() => {
		mocks.openExternalUrl.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('does not open external URLs for empty or invalid-looking email values', async () => {
		await openEmailForEmail('sem-arroba');
		await openEmailForEmail('   ');

		expect(mocks.openExternalUrl).not.toHaveBeenCalled();
	});

	it('opens normalized mailto URLs for email contacts', async () => {
		await openEmailForEmail(' Tutor @ Example.COM ');

		expect(mocks.openExternalUrl).toHaveBeenCalledWith('mailto:tutor@example.com');
	});

	it('opens web WhatsApp URLs on desktop-like runtimes', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 X11 Linux x86_64' });

		await openWhatsAppForPhone('+55 (16) 99999-8888');

		expect(mocks.openExternalUrl).toHaveBeenCalledWith('https://web.whatsapp.com/send?phone=5516999998888');
	});

	it('opens mobile WhatsApp URLs for mobile user agents', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 iPhone' });

		await openWhatsAppForPhone('+55 (16) 99999-8888');

		expect(mocks.openExternalUrl).toHaveBeenCalledWith('whatsapp://send?phone=5516999998888');
	});

	it('does not guess a missing DDI when opening WhatsApp from local digits', async () => {
		await openWhatsAppForPhone('(16) 99999-8888');

		expect(mocks.openExternalUrl).toHaveBeenCalledWith('https://web.whatsapp.com/send?phone=16999998888');
	});

	it('opens phone URLs while preserving explicit country codes', async () => {
		await openPhoneCallForPhone('+1 202 555 0181');

		expect(mocks.openExternalUrl).toHaveBeenCalledWith('tel:+12025550181');
	});

	it('does not open phone URLs without digits', async () => {
		await openPhoneCallForPhone('abc');

		expect(mocks.openExternalUrl).not.toHaveBeenCalled();
	});
});
