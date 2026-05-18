import { describe, expect, it } from 'vitest';
import { computeVaccineDueAt, findVaccinePreset, normalizeVaccineDoseLabel, normalizeVaccineName, type VaccinePreset } from '../vaccine.js';

const presets: VaccinePreset[] = [
	{
		id: 1,
		name: 'V 10',
		normalizedName: normalizeVaccineName('V 10'),
		defaultProtocolId: 1,
		protocols: [
			{
				id: 1,
				vaccinePresetId: 1,
				name: 'Padrão',
				normalizedName: 'padrao',
				doses: [{ id: 1, vaccinePresetId: 1, vaccineProtocolId: 1, label: '1ª dose', normalizedLabel: '1dose', validityValue: 21, validityUnit: 'days', sortOrder: 0, updatedAt: null }],
				isDefault: true,
				sortOrder: 0,
				updatedAt: null
			}
		],
		doses: [{ id: 1, vaccinePresetId: 1, vaccineProtocolId: 1, label: '1ª dose', normalizedLabel: '1dose', validityValue: 21, validityUnit: 'days', sortOrder: 0, updatedAt: null }],
		hiddenAt: null,
		updatedAt: null
	},
	{
		id: 2,
		name: 'Antirrábica',
		normalizedName: normalizeVaccineName('Antirrábica'),
		defaultProtocolId: 2,
		protocols: [
			{
				id: 2,
				vaccinePresetId: 2,
				name: 'Padrão',
				normalizedName: 'padrao',
				doses: [{ id: 2, vaccinePresetId: 2, vaccineProtocolId: 2, label: 'Dose de reforço', normalizedLabel: 'dosedereforco', validityValue: 12, validityUnit: 'months', sortOrder: 0, updatedAt: null }],
				isDefault: true,
				sortOrder: 0,
				updatedAt: null
			}
		],
		doses: [{ id: 2, vaccinePresetId: 2, vaccineProtocolId: 2, label: 'Dose de reforço', normalizedLabel: 'dosedereforco', validityValue: 12, validityUnit: 'months', sortOrder: 0, updatedAt: null }],
		hiddenAt: null,
		updatedAt: null
	}
];

describe('vaccine helpers', () => {
	it('normalizes accents and spacing from vaccine names', () => {
		expect(normalizeVaccineName('antirrabica')).toBe(normalizeVaccineName('Antirrábica'));
		expect(normalizeVaccineName('V 10')).toBe('v10');
		expect(normalizeVaccineName('v10')).toBe('v10');
		expect(normalizeVaccineName('v   - 10')).toBe('v10');
		expect(normalizeVaccineName(' <script>alert(1)</script> V ÁÇ 10 ')).toBe('scriptalert1scriptvac10');
		expect(normalizeVaccineName('A'.repeat(10_000))).toHaveLength(10_000);
		expect(normalizeVaccineDoseLabel(' 1ª dose !!! ')).toBe('1dose');
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

	it('computes due dates across day and month boundaries', () => {
		expect(computeVaccineDueAt('2026-05-08', { validityValue: 21, validityUnit: 'days' })).toBe('2026-05-29');
		expect(computeVaccineDueAt('2024-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2024-02-29');
		expect(computeVaccineDueAt('2025-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2025-02-28');
	});

	it('returns null for invalid, trailing, or non-positive due date inputs', () => {
		expect(computeVaccineDueAt('2026-05-08<script>', { validityValue: 21, validityUnit: 'days' })).toBeNull();
		expect(computeVaccineDueAt('2026-02-31', { validityValue: 21, validityUnit: 'days' })).toBeNull();
		expect(computeVaccineDueAt('2026-05-08', { validityValue: 0, validityUnit: 'days' })).toBeNull();
		expect(computeVaccineDueAt('2026-05-08', { validityValue: -1, validityUnit: 'months' })).toBeNull();
	});
});