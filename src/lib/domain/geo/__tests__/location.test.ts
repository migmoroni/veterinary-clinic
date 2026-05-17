import { describe, expect, it } from 'vitest';
import { brazilCityOptions, countryCallingCode, countryOptions, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '../location.js';

describe('offline location catalog', () => {
	it('normalizes country codes from the offline catalog', () => {
		expect(countryOptions().some((option) => option.value === 'BRA')).toBe(true);
		expect(countryOptions().some((option) => option.value === 'PRT')).toBe(true);
		expect(countryOptions('gn-PY').find((option) => option.value === 'PRY')?.label).toBe('Paraguái');
		expect(countryOptions('gn-PY').find((option) => option.value === 'DEU')?.label).toBe('Alemania');
		expect(countryOptions('es-MX').find((option) => option.value === 'DEU')?.label).toBe('Alemania');
		expect(countryOptions('fr-CA').find((option) => option.value === 'DEU')?.label).toBe('Allemagne');
		expect(countryOptions('it-CH').find((option) => option.value === 'DEU')?.label).toBe('Germania');
		expect(countryOptions('de-AT').find((option) => option.value === 'DEU')?.label).toBe('Deutschland');
		expect(normalizeOwnerCountry('BRA')).toBe('BRA');
		expect(normalizeOwnerCountry('PRT')).toBe('PRT');
		expect(normalizeOwnerCountry('BR')).toBeNull();
		expect(normalizeOwnerCountry('Brazil')).toBeNull();
	});

	it('returns country calling codes from the offline catalog', () => {
		expect(countryCallingCode('BRA')).toBe('55');
		expect(countryCallingCode('PRT')).toBe('351');
		expect(countryCallingCode('USA')).toBe('1');
		expect(countryCallingCode('BR')).toBeNull();
	});

	it('normalizes state and city from the offline Brazilian catalog', () => {
		expect(normalizeOwnerState('SP')).toBe('SP');
		expect(normalizeOwnerCity('Araraquara', 'BRA', 'SP')).toBe('Araraquara');
		expect(normalizeOwnerCity('Araraquara', 'BRA', 'RJ')).toBeNull();
	});

	it('keeps state and city free for countries without offline subdivision data', () => {
		expect(normalizeOwnerState('California', 'USA')).toBe('California');
		expect(normalizeOwnerCity('San Diego', 'USA', 'California')).toBe('San Diego');
	});

	it('infers state from a known city when legacy data has no state', () => {
		expect(normalizeOwnerState('', 'BRA', 'Américo Brasiliense')).toBe('SP');
		expect(normalizeOwnerCity('Alcinópolis - MS', 'BRA')).toBe('Alcinópolis');
		expect(normalizeOwnerState('', 'BRA', 'Alcinópolis - MS')).toBe('MS');
	});

	it('lists cities only after a state is selected', () => {
		expect(brazilCityOptions('').length).toBe(0);
		expect(brazilCityOptions('SP').some((option) => option.value === 'Américo Brasiliense')).toBe(true);
	});
});
