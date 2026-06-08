import { describe, expect, it } from 'vitest';
import { computeAntiparasiticTreatmentDueAt, getAntiparasiticTreatmentDueStatus, normalizeAntiparasiticName, type PetAntiparasiticTreatment } from '../antiparasitic.js';

function antiparasiticTreatment(input: Partial<PetAntiparasiticTreatment> = {}): PetAntiparasiticTreatment {
	return {
		id: 1,
		petId: 1,
		appliedAt: '2026-05-08',
		antiparasiticName: 'Drontal',
		antiparasiticNormalizedName: 'drontal',
		dose: '1 comprimido',
		validityValue: 6,
		validityUnit: 'months',
		observation: null,
		validityIgnoredAt: null,
		updatedAt: null,
		deletedAt: null,
		purgeAfter: null,
		...input
	};
}

describe('antiparasitic treatment helpers', () => {
	it('normalizes accents and spacing from antiparasitic names', () => {
		expect(normalizeAntiparasiticName('Antiparasitico')).toBe(normalizeAntiparasiticName('Antiparasítico'));
		expect(normalizeAntiparasiticName('NexGard Spectra')).toBe('nexgardspectra');
		expect(normalizeAntiparasiticName(' <script>alert(1)</script> Drontal ')).toBe('scriptalert1scriptdrontal');
	});

	it('computes due dates across day and month boundaries', () => {
		expect(computeAntiparasiticTreatmentDueAt('2026-05-08', { validityValue: 30, validityUnit: 'days' })).toBe('2026-06-07');
		expect(computeAntiparasiticTreatmentDueAt('2024-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2024-02-29');
		expect(computeAntiparasiticTreatmentDueAt('2025-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2025-02-28');
		expect(computeAntiparasiticTreatmentDueAt('2024-02-29', { validityValue: 1, validityUnit: 'years' })).toBe('2025-02-28');
	});

	it('returns null for invalid or non-positive due date inputs', () => {
		expect(computeAntiparasiticTreatmentDueAt('2026-05-08<script>', { validityValue: 30, validityUnit: 'days' })).toBeNull();
		expect(computeAntiparasiticTreatmentDueAt('2026-02-31', { validityValue: 30, validityUnit: 'days' })).toBeNull();
		expect(computeAntiparasiticTreatmentDueAt('2026-05-08', { validityValue: 0, validityUnit: 'days' })).toBeNull();
		expect(computeAntiparasiticTreatmentDueAt('2026-05-08', { validityValue: -1, validityUnit: 'months' })).toBeNull();
	});

	it('builds due status from the antiparasiticTreatment validity snapshot', () => {
		const status = getAntiparasiticTreatmentDueStatus(antiparasiticTreatment(), new Date(2026, 9, 20));
		expect(status.dueAt).toBe('2026-11-08');
		expect(status.daysUntilDue).toBe(19);
		expect(status.expired).toBe(false);
		expect(status.validityIgnored).toBe(false);
	});

	it('ignores due status when validity is disabled', () => {
		expect(getAntiparasiticTreatmentDueStatus(antiparasiticTreatment({ validityIgnoredAt: '2026-05-09' }))).toEqual({ dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true });
	});
});
