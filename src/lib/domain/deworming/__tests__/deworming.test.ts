import { describe, expect, it } from 'vitest';
import { computeDewormingDueAt, getDewormingDueStatus, normalizeDewormerName, type PetDeworming } from '../deworming.js';

function deworming(input: Partial<PetDeworming> = {}): PetDeworming {
	return {
		id: 1,
		petId: 1,
		appliedAt: '2026-05-08',
		dewormerName: 'Drontal',
		dewormerNormalizedName: 'drontal',
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

describe('deworming helpers', () => {
	it('normalizes accents and spacing from dewormer names', () => {
		expect(normalizeDewormerName('Vermifugo')).toBe(normalizeDewormerName('Vermífugo'));
		expect(normalizeDewormerName('NexGard Spectra')).toBe('nexgardspectra');
		expect(normalizeDewormerName(' <script>alert(1)</script> Drontal ')).toBe('scriptalert1scriptdrontal');
	});

	it('computes due dates across day and month boundaries', () => {
		expect(computeDewormingDueAt('2026-05-08', { validityValue: 30, validityUnit: 'days' })).toBe('2026-06-07');
		expect(computeDewormingDueAt('2024-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2024-02-29');
		expect(computeDewormingDueAt('2025-01-31', { validityValue: 1, validityUnit: 'months' })).toBe('2025-02-28');
	});

	it('returns null for invalid or non-positive due date inputs', () => {
		expect(computeDewormingDueAt('2026-05-08<script>', { validityValue: 30, validityUnit: 'days' })).toBeNull();
		expect(computeDewormingDueAt('2026-02-31', { validityValue: 30, validityUnit: 'days' })).toBeNull();
		expect(computeDewormingDueAt('2026-05-08', { validityValue: 0, validityUnit: 'days' })).toBeNull();
		expect(computeDewormingDueAt('2026-05-08', { validityValue: -1, validityUnit: 'months' })).toBeNull();
	});

	it('builds due status from the deworming validity snapshot', () => {
		const status = getDewormingDueStatus(deworming(), new Date(2026, 9, 20));
		expect(status.dueAt).toBe('2026-11-08');
		expect(status.daysUntilDue).toBe(19);
		expect(status.expired).toBe(false);
		expect(status.validityIgnored).toBe(false);
	});

	it('ignores due status when validity is disabled', () => {
		expect(getDewormingDueStatus(deworming({ validityIgnoredAt: '2026-05-09' }))).toEqual({ dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true });
	});
});