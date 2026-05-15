import { describe, expect, it } from 'vitest';
import { findVaccinePreset, normalizeVaccineName, type VaccinePreset } from '../vaccine.js';

const presets: VaccinePreset[] = [
	{
		id: 1,
		name: 'V 10',
		normalizedName: normalizeVaccineName('V 10'),
		doses: [{ id: 1, vaccinePresetId: 1, label: '1ª dose', normalizedLabel: '1dose', validityValue: 21, validityUnit: 'days', sortOrder: 0, updatedAt: null }],
		updatedAt: null
	},
	{
		id: 2,
		name: 'Antirrábica',
		normalizedName: normalizeVaccineName('Antirrábica'),
		doses: [{ id: 2, vaccinePresetId: 2, label: 'Dose de reforço', normalizedLabel: 'dosedereforco', validityValue: 12, validityUnit: 'months', sortOrder: 0, updatedAt: null }],
		updatedAt: null
	}
];

describe('vaccine helpers', () => {
	it('normalizes accents and spacing from vaccine names', () => {
		expect(normalizeVaccineName('antirrabica')).toBe(normalizeVaccineName('Antirrábica'));
		expect(normalizeVaccineName('V 10')).toBe('v10');
		expect(normalizeVaccineName('v10')).toBe('v10');
		expect(normalizeVaccineName('v   - 10')).toBe('v10');
	});

	it('finds presets when spacing is added or removed', () => {
		expect(findVaccinePreset('v10', presets)?.name).toBe('V 10');
		expect(findVaccinePreset('v 10', presets)?.name).toBe('V 10');
		expect(findVaccinePreset('v   10', presets)?.name).toBe('V 10');
		expect(findVaccinePreset('antirrabica', presets)?.name).toBe('Antirrábica');
	});

	it('matches older spaced normalized keys', () => {
		expect(findVaccinePreset('v10', [{ ...presets[0], normalizedName: 'v 10' }])?.name).toBe('V 10');
	});
});