import { describe, expect, it } from 'vitest';
import {
	CUSTOM_FONT_SIZE_MAX_PX,
	CUSTOM_FONT_SIZE_MIN_PX,
	DEFAULT_CUSTOM_ROOT_SIZE_PX,
	DEFAULT_TYPOGRAPHY_PREFERENCES,
	getTypographyRootSize,
	normalizeCustomRootSizePx,
	stepCustomRootSizePx,
	stepFontSize
} from '../typography.js';

describe('typography font size step', () => {
	it('moves font size up and down', () => {
		expect(stepFontSize('default', 1)).toBe('comfortable');
		expect(stepFontSize('default', -1)).toBe('small');
	});

	it('clamps to configured boundaries', () => {
		expect(stepFontSize('small', -1)).toBe('small');
		expect(stepFontSize('extraLarge', 1)).toBe('extraLarge');
		expect(stepFontSize('custom', 1)).toBe('custom');
	});

	it('normalizes step values before applying', () => {
		expect(stepFontSize('default', 2.9)).toBe('large');
		expect(stepFontSize('large', Number.POSITIVE_INFINITY)).toBe('large');
	});
});

describe('custom typography root size', () => {
	it('normalizes and clamps custom slider values', () => {
		expect(normalizeCustomRootSizePx('invalid')).toBe(DEFAULT_CUSTOM_ROOT_SIZE_PX);
		expect(normalizeCustomRootSizePx(CUSTOM_FONT_SIZE_MIN_PX - 10)).toBe(CUSTOM_FONT_SIZE_MIN_PX);
		expect(normalizeCustomRootSizePx(CUSTOM_FONT_SIZE_MAX_PX + 10)).toBe(CUSTOM_FONT_SIZE_MAX_PX);
	});

	it('steps custom size while respecting configured limits', () => {
		expect(stepCustomRootSizePx(CUSTOM_FONT_SIZE_MIN_PX, -1)).toBe(CUSTOM_FONT_SIZE_MIN_PX);
		expect(stepCustomRootSizePx(CUSTOM_FONT_SIZE_MAX_PX, 1)).toBe(CUSTOM_FONT_SIZE_MAX_PX);
		expect(stepCustomRootSizePx(DEFAULT_CUSTOM_ROOT_SIZE_PX, 1)).toBe(DEFAULT_CUSTOM_ROOT_SIZE_PX + 1);
	});

	it('returns the custom root size when custom option is selected', () => {
		expect(
			getTypographyRootSize({
				...DEFAULT_TYPOGRAPHY_PREFERENCES,
				fontSize: 'custom',
				customRootSizePx: CUSTOM_FONT_SIZE_MAX_PX + 6
			})
		).toBe(`${CUSTOM_FONT_SIZE_MAX_PX}px`);
	});
});
