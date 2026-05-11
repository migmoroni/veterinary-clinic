import type { TranslationKey } from '$lib/i18n/index.js';

const SYSTEM_FALLBACK_STACK =
	'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const bundledFontOptions = [
	{
		id: 'atkinson',
		labelKey: 'preferences.font.atkinson',
		family: `"Atkinson Hyperlegible", ${SYSTEM_FALLBACK_STACK}`,
		license: 'SIL Open Font License 1.1'
	},
	{
		id: 'notoSans',
		labelKey: 'preferences.font.notoSans',
		family: `"Noto Sans", ${SYSTEM_FALLBACK_STACK}`,
		license: 'SIL Open Font License 1.1'
	},
	{
		id: 'liberationSans',
		labelKey: 'preferences.font.liberationSans',
		family: `"Liberation Sans", ${SYSTEM_FALLBACK_STACK}`,
		license: 'SIL Open Font License 1.1'
	},
	{
		id: 'dejavuSans',
		labelKey: 'preferences.font.dejavuSans',
		family: `"DejaVu Sans", ${SYSTEM_FALLBACK_STACK}`,
		license: 'DejaVu Fonts License'
	}
] as const satisfies ReadonlyArray<{
	id: string;
	labelKey: TranslationKey;
	family: string;
	license: string;
}>;

export const fontSizeOptions = [
	{ id: 'small', labelKey: 'preferences.fontSize.small', rootSize: '15px' },
	{ id: 'default', labelKey: 'preferences.fontSize.default', rootSize: '16px' },
	{ id: 'comfortable', labelKey: 'preferences.fontSize.comfortable', rootSize: '17px' },
	{ id: 'large', labelKey: 'preferences.fontSize.large', rootSize: '18px' },
	{ id: 'extraLarge', labelKey: 'preferences.fontSize.extraLarge', rootSize: '20px' }
] as const satisfies ReadonlyArray<{
	id: string;
	labelKey: TranslationKey;
	rootSize: string;
}>;

export const CUSTOM_FONT_SIZE_ID = 'custom' as const;

export const CUSTOM_FONT_SIZE_MIN_PX = 12;
export const CUSTOM_FONT_SIZE_MAX_PX = 24;
export const CUSTOM_FONT_SIZE_STEP_PX = 1;
export const DEFAULT_CUSTOM_ROOT_SIZE_PX = 16;

export const fontSourceOptions = ['bundled', 'system'] as const;

export type BundledFontId = (typeof bundledFontOptions)[number]['id'];
export type PresetFontSizeId = (typeof fontSizeOptions)[number]['id'];
export type FontSizeId = PresetFontSizeId | typeof CUSTOM_FONT_SIZE_ID;
export type FontSource = (typeof fontSourceOptions)[number];

export interface TypographyPreferences {
	fontSize: FontSizeId;
	customRootSizePx: number;
	fontSource: FontSource;
	bundledFont: BundledFontId;
	systemFontFamily: string;
	systemFontDirectory: string;
}

export const DEFAULT_TYPOGRAPHY_PREFERENCES: TypographyPreferences = {
	fontSize: 'default',
	customRootSizePx: DEFAULT_CUSTOM_ROOT_SIZE_PX,
	fontSource: 'bundled',
	bundledFont: 'atkinson',
	systemFontFamily: '',
	systemFontDirectory: ''
};

export function isBundledFontId(value: unknown): value is BundledFontId {
	return typeof value === 'string' && bundledFontOptions.some((option) => option.id === value);
}

export function isFontSizeId(value: unknown): value is FontSizeId {
	if (value === CUSTOM_FONT_SIZE_ID) return true;

	return typeof value === 'string' && fontSizeOptions.some((option) => option.id === value);
}

export function isFontSource(value: unknown): value is FontSource {
	return typeof value === 'string' && fontSourceOptions.includes(value as FontSource);
}

export function sanitizeSystemFontFamily(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.replace(/[;{}\n\r]/g, '').trim().slice(0, 120);
}

export function sanitizeSystemFontDirectory(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.replace(/[\0\n\r]/g, '').trim().slice(0, 500);
}

export function normalizeCustomRootSizePx(value: unknown): number {
	const numericValue = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numericValue)) return DEFAULT_CUSTOM_ROOT_SIZE_PX;

	const clamped = Math.min(CUSTOM_FONT_SIZE_MAX_PX, Math.max(CUSTOM_FONT_SIZE_MIN_PX, numericValue));
	const stepped = Math.round(clamped / CUSTOM_FONT_SIZE_STEP_PX) * CUSTOM_FONT_SIZE_STEP_PX;

	return Number(stepped.toFixed(2));
}

export function stepCustomRootSizePx(value: number, step: number): number {
	const source = normalizeCustomRootSizePx(value);
	const normalizedStep = Number.isFinite(step) ? Math.trunc(step) : 0;
	if (normalizedStep === 0) return source;

	return normalizeCustomRootSizePx(source + normalizedStep);
}

export function normalizeTypographyPreferences(value: unknown): TypographyPreferences {
	const candidate = value && typeof value === 'object' ? (value as Partial<TypographyPreferences>) : {};

	return {
		fontSize: isFontSizeId(candidate.fontSize)
			? candidate.fontSize
			: DEFAULT_TYPOGRAPHY_PREFERENCES.fontSize,
		customRootSizePx: normalizeCustomRootSizePx(candidate.customRootSizePx),
		fontSource: isFontSource(candidate.fontSource)
			? candidate.fontSource
			: DEFAULT_TYPOGRAPHY_PREFERENCES.fontSource,
		bundledFont: isBundledFontId(candidate.bundledFont)
			? candidate.bundledFont
			: DEFAULT_TYPOGRAPHY_PREFERENCES.bundledFont,
		systemFontFamily: sanitizeSystemFontFamily(candidate.systemFontFamily),
		systemFontDirectory: sanitizeSystemFontDirectory(candidate.systemFontDirectory)
	};
}

export function getBundledFontOption(value: BundledFontId) {
	return bundledFontOptions.find((option) => option.id === value) ?? bundledFontOptions[0];
}

export function getFontSizeOption(value: FontSizeId) {
	return fontSizeOptions.find((option) => option.id === value) ?? fontSizeOptions[1];
}

export function stepFontSize(value: FontSizeId, step: number): FontSizeId {
	if (value === CUSTOM_FONT_SIZE_ID) return CUSTOM_FONT_SIZE_ID;

	const fallbackIndex = Math.max(
		fontSizeOptions.findIndex((option) => option.id === DEFAULT_TYPOGRAPHY_PREFERENCES.fontSize),
		0
	);
	const currentIndex = fontSizeOptions.findIndex((option) => option.id === value);
	const sourceIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
	const normalizedStep = Number.isFinite(step) ? Math.trunc(step) : 0;
	const targetIndex = Math.min(
		fontSizeOptions.length - 1,
		Math.max(0, sourceIndex + normalizedStep)
	);

	return fontSizeOptions[targetIndex].id;
}

export function getTypographyRootSize(preferences: TypographyPreferences): string {
	if (preferences.fontSize === CUSTOM_FONT_SIZE_ID) {
		return `${normalizeCustomRootSizePx(preferences.customRootSizePx)}px`;
	}

	return getFontSizeOption(preferences.fontSize).rootSize;
}

export function getTypographyFontFamily(preferences: TypographyPreferences): string {
	if (preferences.fontSource === 'system') {
		return preferences.systemFontFamily
			? `${quoteFontFamily(preferences.systemFontFamily)}, ${SYSTEM_FALLBACK_STACK}`
			: SYSTEM_FALLBACK_STACK;
	}

	return getBundledFontOption(preferences.bundledFont).family;
}

function quoteFontFamily(value: string): string {
	const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `"${escaped}"`;
}