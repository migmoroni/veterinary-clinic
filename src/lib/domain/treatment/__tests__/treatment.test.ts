import { describe, expect, it } from 'vitest';
import { computeTreatmentDueAt, getTreatmentDueStatus, normalizeTreatmentName, type PetTreatment } from '../treatment.js';

function treatment(input: Partial<PetTreatment> = {}): PetTreatment {
	return {
		id: '019f9689-0000-7000-8000-000000000001',
		petId: '019f9689-0000-7000-8000-000000000002',
		kind: 'vaccine',
		appliedAt: '2026-05-08',
		name: 'V 10',
		normalizedName: 'v10',
		dose: '1a dose',
		validityValue: 21,
		validityUnit: 'days',
		observation: null,
		validityIgnoredAt: null,
		createdAt: null,
		updatedAt: null,
		removedAt: null,
		...input
	};
}

describe('treatment helpers', () => {
	it('normalizes accents and spacing from treatment names', () => {
		expect(normalizeTreatmentName('antirrabica')).toBe(normalizeTreatmentName('Antirrábica'));
		expect(normalizeTreatmentName('Antiparasitico')).toBe(normalizeTreatmentName('Antiparasítico'));
		expect(normalizeTreatmentName('V 10')).toBe('v10');
		expect(normalizeTreatmentName('v   - 10')).toBe('v10');
		expect(normalizeTreatmentName('NexGard Spectra')).toBe('nexgardspectra');
		expect(normalizeTreatmentName(' <script>alert(1)</script> V ÁÇ 10 ')).toBe('scriptalert1scriptvac10');
		expect(normalizeTreatmentName('A'.repeat(10_000))).toHaveLength(10_000);
	});

	it('computes due dates across day and month boundaries', () => {
		expect(computeTreatmentDueAt('2026-05-08', { validityValue: 21, validityUnit: 'days' })).toBe('2026-05-29');
		expect(computeTreatmentDueAt('2026-05-08', { validityValue: 30, validityUnit: 'days' })).toBe('2026-06-07');
		expect(computeTreatmentDueAt('2024-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2024-02-29');
		expect(computeTreatmentDueAt('2025-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2025-02-28');
		expect(computeTreatmentDueAt('2024-02-29', { validityValue: 1, validityUnit: 'years' })).toBe('2025-02-28');
	});

	it('returns null for invalid, trailing, or non-positive due date inputs', () => {
		expect(computeTreatmentDueAt('2026-05-08<script>', { validityValue: 21, validityUnit: 'days' })).toBeNull();
		expect(computeTreatmentDueAt('2026-02-31', { validityValue: 21, validityUnit: 'days' })).toBeNull();
		expect(computeTreatmentDueAt('2026-05-08', { validityValue: 0, validityUnit: 'days' })).toBeNull();
		expect(computeTreatmentDueAt('2026-05-08', { validityValue: -1, validityUnit: 'months' })).toBeNull();
	});

	it('builds due status from the treatment validity snapshot', () => {
		const status = getTreatmentDueStatus(treatment(), new Date(2026, 4, 20));
		expect(status.dueAt).toBe('2026-05-29');
		expect(status.daysUntilDue).toBe(9);
		expect(status.expired).toBe(false);
		expect(status.validityIgnored).toBe(false);
	});

	it('keeps the same due rules for antiparasitic treatments', () => {
		const status = getTreatmentDueStatus(treatment({ kind: 'antiparasitic', name: 'Drontal', normalizedName: 'drontal', validityValue: 6, validityUnit: 'months' }), new Date(2026, 9, 20));
		expect(status.dueAt).toBe('2026-11-08');
		expect(status.daysUntilDue).toBe(19);
		expect(status.expired).toBe(false);
		expect(status.validityIgnored).toBe(false);
	});

	it('ignores due status when validity is disabled', () => {
		expect(getTreatmentDueStatus(treatment({ validityIgnoredAt: '2026-05-09' }))).toEqual({ dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true });
	});
});
