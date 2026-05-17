import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isCountrySupportedForCepLookup, lookupCep, normalizeCep } from '../cep.service.js';

describe('cep service', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('supports only countries treated as Brazil by the location layer', () => {
		expect(isCountrySupportedForCepLookup('BRA')).toBe(true);
		expect(isCountrySupportedForCepLookup('')).toBe(true);
		expect(isCountrySupportedForCepLookup('USA')).toBe(false);
		expect(isCountrySupportedForCepLookup('BR')).toBe(false);
	});

	it('strips every non-digit character without applying a length limit', () => {
		expect(normalizeCep(' 12.345-678 abc 999 ')).toBe('12345678999');
	});

	it('rejects unsupported countries before making network requests', async () => {
		await expect(lookupCep('12345-678', 'USA')).rejects.toThrow('cep_country_unsupported');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects normalized CEP values that are not exactly eight digits', async () => {
		await expect(lookupCep('12.345-678 abc 999', 'BRA')).rejects.toThrow('cep_invalid');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('maps ViaCEP responses and preserves empty fields as empty strings', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ cep: '14801-000', localidade: 'Araraquara', uf: 'SP' })
		});

		await expect(lookupCep('14.801-000', 'BRA')).resolves.toEqual({
			postalCode: '14801-000',
			street: '',
			neighborhood: '',
			city: 'Araraquara',
			state: 'SP'
		});
		expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/14801000/json/');
	});

	it('returns null when ViaCEP reports an unknown CEP', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ erro: true }) });

		await expect(lookupCep('00000-000', 'BRA')).resolves.toBeNull();
	});

	it('throws a service error when ViaCEP is unavailable', async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

		await expect(lookupCep('14801-000', 'BRA')).rejects.toThrow('cep_unavailable');
	});
});