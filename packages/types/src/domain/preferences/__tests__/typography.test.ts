import { describe, expect, it } from 'vitest';
import {
	DEFAULT_TYPOGRAPHY_PREFERENCES,
	DEFAULT_UI_ZOOM,
	UI_ZOOM_MAX,
	UI_ZOOM_MIN,
	getTypographyFontFamily,
	getTypographyRootSize,
	getTypographyUiZoom,
	normalizeTypographyPreferences,
	normalizeUiZoom,
	sanitizeSystemFontDirectory,
	sanitizeSystemFontFamily,
	stepUiZoom
} from '../typography.js';

describe('typography interface zoom', () => {
	it('normalizes and clamps zoom values', () => {
		expect(normalizeUiZoom('invalid')).toBe(DEFAULT_UI_ZOOM);
		expect(normalizeUiZoom(UI_ZOOM_MIN - 1)).toBe(UI_ZOOM_MIN);
		expect(normalizeUiZoom(UI_ZOOM_MAX + 1)).toBe(UI_ZOOM_MAX);
		expect(normalizeUiZoom(1.13)).toBe(1.15);
	});

	it('steps zoom while respecting configured limits', () => {
		expect(stepUiZoom(UI_ZOOM_MIN, -1)).toBe(UI_ZOOM_MIN);
		expect(stepUiZoom(UI_ZOOM_MAX, 1)).toBe(UI_ZOOM_MAX);
		expect(stepUiZoom(DEFAULT_UI_ZOOM, 1)).toBe(1.1);
		expect(stepUiZoom(DEFAULT_UI_ZOOM, -1)).toBe(0.9);
	});

	it('scales root font size so text is rendered sharply at the final size', () => {
		expect(getTypographyRootSize()).toBe('16px');
		expect(getTypographyRootSize({ uiZoom: 0.8 })).toBe('12.8px');
		expect(getTypographyRootSize({ uiZoom: 1.2 })).toBe('19.2px');
	});

	it('returns normalized zoom from full typography preferences', () => {
		expect(
			getTypographyUiZoom({
				...DEFAULT_TYPOGRAPHY_PREFERENCES,
				uiZoom: UI_ZOOM_MAX + 1
			})
		).toBe(UI_ZOOM_MAX);
	});
});

describe('typography input sanitization', () => {
	it('removes CSS-breaking characters from system font family input', () => {
		const sanitized = sanitizeSystemFontFamily(' "Inter";\nbody{display:none}\r ');

		expect(sanitized).toBe('"Inter"bodydisplay:none');
		expect(sanitizeSystemFontFamily(123)).toBe('');
		expect(sanitizeSystemFontFamily('A'.repeat(200))).toHaveLength(120);
	});

	it('removes control characters from system font directories', () => {
		expect(sanitizeSystemFontDirectory(' /tmp/fonts\0\n../../x\r ')).toBe('/tmp/fonts../../x');
		expect(sanitizeSystemFontDirectory(null)).toBe('');
		expect(sanitizeSystemFontDirectory('A'.repeat(600))).toHaveLength(500);
	});

	it('normalizes full typography preference objects from untrusted shapes', () => {
		expect(
			normalizeTypographyPreferences({
				uiZoom: 10_000,
				uppercaseText: true,
				highContrast: true,
				enhancedFocus: true,
				reduceMotion: true,
				fontSource: 'system',
				bundledFont: 'unknown',
				systemFontFamily: 'Bad;\nFont{}',
				systemFontDirectory: ' /fonts\0bad\n '
			})
		).toEqual({
			...DEFAULT_TYPOGRAPHY_PREFERENCES,
			uiZoom: UI_ZOOM_MAX,
			uppercaseText: true,
			highContrast: true,
			enhancedFocus: true,
			reduceMotion: true,
			fontSource: 'system',
			systemFontFamily: 'BadFont',
			systemFontDirectory: '/fontsbad'
		});
	});

	it('does not normalize removed legacy font-size fields', () => {
		expect(
			normalizeTypographyPreferences({
				fontSize: 'extraLarge',
				customRootSizePx: 20,
				interfaceScale: 'large',
				customInterfaceScale: 1.2
			})
		).toEqual(DEFAULT_TYPOGRAPHY_PREFERENCES);
	});

	it('quotes and escapes custom system font families for CSS use', () => {
		expect(
			getTypographyFontFamily({
				...DEFAULT_TYPOGRAPHY_PREFERENCES,
				fontSource: 'system',
				systemFontFamily: 'A "Quoted" \\ Font'
			})
		).toContain('"A \\"Quoted\\" \\\\ Font"');
	});
});
