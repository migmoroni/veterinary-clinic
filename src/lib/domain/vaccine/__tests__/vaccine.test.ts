import { describe, expect, it } from 'vitest';
import { computeVaccineDueAt, getVaccineDueStatus, normalizeVaccineName, type PetVaccination } from '../vaccine.js';

function vaccination(input: Partial<PetVaccination> = {}): PetVaccination {
	return {
		id: 1,
		petId: 1,
		appliedAt: '2026-05-08',
		vaccineName: 'V 10',
		vaccineNormalizedName: 'v10',
		dose: '1a dose',
		validityValue: 21,
		validityUnit: 'days',
		observation: null,
		validityIgnoredAt: null,
		updatedAt: null,
		deletedAt: null,
		purgeAfter: null,
		...input
	};
}

describe('vaccine helpers', () => {
	it('normalizes accents and spacing from vaccine names', () => {
		expect(normalizeVaccineName('antirrabica')).toBe(normalizeVaccineName('Antirrábica'));
		expect(normalizeVaccineName('V 10')).toBe('v10');
		expect(normalizeVaccineName('v10')).toBe('v10');
		expect(normalizeVaccineName('v   - 10')).toBe('v10');
		expect(normalizeVaccineName(' <script>alert(1)</script> V ÁÇ 10 ')).toBe('scriptalert1scriptvac10');
		expect(normalizeVaccineName('A'.repeat(10_000))).toHaveLength(10_000);
	});

	it('computes due dates across day and month boundaries', () => {
		expect(computeVaccineDueAt('2026-05-08', { validityValue: 21, validityUnit: 'days' })).toBe('2026-05-29');
		expect(computeVaccineDueAt('2024-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2024-02-29');
		expect(computeVaccineDueAt('2025-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2025-02-28');
		expect(computeVaccineDueAt('2024-02-29', { validityValue: 1, validityUnit: 'years' })).toBe('2025-02-28');
	});

	it('returns null for invalid, trailing, or non-positive due date inputs', () => {
		expect(computeVaccineDueAt('2026-05-08<script>', { validityValue: 21, validityUnit: 'days' })).toBeNull();
		expect(computeVaccineDueAt('2026-02-31', { validityValue: 21, validityUnit: 'days' })).toBeNull();
		expect(computeVaccineDueAt('2026-05-08', { validityValue: 0, validityUnit: 'days' })).toBeNull();
		expect(computeVaccineDueAt('2026-05-08', { validityValue: -1, validityUnit: 'months' })).toBeNull();
	});

	it('builds due status from the vaccination validity snapshot', () => {
		const status = getVaccineDueStatus(vaccination(), new Date(2026, 4, 20));
		expect(status.dueAt).toBe('2026-05-29');
		expect(status.daysUntilDue).toBe(9);
		expect(status.expired).toBe(false);
		expect(status.validityIgnored).toBe(false);
	});

	it('ignores due status when validity is disabled', () => {
		expect(getVaccineDueStatus(vaccination({ validityIgnoredAt: '2026-05-09' }))).toEqual({ dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true });
	});
});