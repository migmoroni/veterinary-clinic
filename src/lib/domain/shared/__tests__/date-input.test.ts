import { describe, expect, it } from 'vitest';
import { formatDateForDisplay, formatDateForInput, normalizeDateInput } from '../date-input.js';

describe('date input helpers', () => {
	it('formats dates for native date inputs', () => {
		expect(formatDateForInput('2026-05-08')).toBe('2026-05-08');
		expect(formatDateForInput('2026-05-08 14:30:00')).toBe('2026-05-08');
		expect(formatDateForInput('08/05/2026')).toBe('2026-05-08');
	});

	it('formats dates for pt-BR display', () => {
		expect(formatDateForDisplay('2026-05-08')).toBe('08/05/2026');
		expect(formatDateForDisplay('2026-05-08 14:30:00')).toBe('08/05/2026');
	});

	it('formats dates for localized display', () => {
		expect(formatDateForDisplay('2026-05-08', 'en-US')).toBe('05/08/2026');
		expect(formatDateForDisplay('2026-05-08', 'es-ES')).toBe('08/05/2026');
	});

	it('normalizes date values for storage', () => {
		expect(normalizeDateInput('2026-05-08')).toBe('2026-05-08');
		expect(normalizeDateInput('08/05/2026')).toBe('2026-05-08');
	});

	it('characterizes current ISO prefix parsing with trailing text', () => {
		expect(formatDateForInput('2026-05-08<script>')).toBe('2026-05-08');
		expect(formatDateForDisplay('2026-05-08<script>')).toBe('08/05/2026');
		expect(normalizeDateInput('2026-05-08<script>')).toBe('2026-05-08');
	});

	it('keeps unknown display text trimmed and leaves invalid native input empty', () => {
		const largeText = ` ${'x'.repeat(10_000)} `;

		expect(formatDateForInput(largeText)).toBe('');
		expect(formatDateForDisplay('  <script>alert(1)</script>  ')).toBe('<script>alert(1)</script>');
		expect(formatDateForDisplay(largeText)).toBe('x'.repeat(10_000));
	});

	it('rejects incomplete or invalid dates', () => {
		expect(() => normalizeDateInput('08/05/26')).toThrow('date_invalid');
		expect(() => normalizeDateInput('31/02/2026')).toThrow('date_invalid');
		expect(() => normalizeDateInput('2026-02-31')).toThrow('date_invalid');
		expect(() => normalizeDateInput('1899-12-31')).toThrow('date_invalid');
		expect(() => normalizeDateInput('2101-01-01')).toThrow('date_invalid');
	});
});