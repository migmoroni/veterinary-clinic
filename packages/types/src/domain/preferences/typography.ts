import type { TranslationKey } from '@vet/types/i18n/index.js';

const SYSTEM_FALLBACK_STACK =
	'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const BASE_ROOT_FONT_SIZE_PX = 16;

export const UI_ZOOM_MIN = 0.8;
export const UI_ZOOM_MAX = 1.4;
export const UI_ZOOM_STEP = 0.05;
export const UI_ZOOM_KEYBOARD_STEP = 0.1;
export const DEFAULT_UI_ZOOM = 1;

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

export const uiZoomOptions = [
	{ id: 'compact', labelKey: 'preferences.uiZoom.compact', zoom: 0.9 },
	{ id: 'standard', labelKey: 'preferences.uiZoom.standard', zoom: 1 },
	{ id: 'comfortable', labelKey: 'preferences.uiZoom.comfortable', zoom: 1.1 },
	{ id: 'large', labelKey: 'preferences.uiZoom.large', zoom: 1.2 }
] as const satisfies ReadonlyArray<{
	id: string;
	labelKey: TranslationKey;
	zoom: number;
}>;

export const fontSourceOptions = ['bundled', 'system'] as const;

export type BundledFontId = (typeof bundledFontOptions)[number]['id'];
export type UiZoomPresetId = (typeof uiZoomOptions)[number]['id'];
export type FontSource = (typeof fontSourceOptions)[number];

export interface TypographyPreferences {
	uiZoom: number;
	uppercaseText: boolean;
	highContrast: boolean;
	enhancedFocus: boolean;
	reduceMotion: boolean;
	fontSource: FontSource;
	bundledFont: BundledFontId;
	systemFontFamily: string;
	systemFontDirectory: string;
}

export const DEFAULT_TYPOGRAPHY_PREFERENCES: TypographyPreferences = {
	uiZoom: DEFAULT_UI_ZOOM,
	uppercaseText: false,
	highContrast: false,
	enhancedFocus: false,
	reduceMotion: false,
	fontSource: 'bundled',
	bundledFont: 'atkinson',
	systemFontFamily: '',
	systemFontDirectory: ''
};

export function isBundledFontId(value: unknown): value is BundledFontId {
	return typeof value === 'string' && bundledFontOptions.some((option) => option.id === value);
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

export function normalizeUiZoom(value: unknown): number {
	const numericValue = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numericValue)) return DEFAULT_UI_ZOOM;

	const clamped = Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, numericValue));
	const stepped = Math.round(clamped / UI_ZOOM_STEP) * UI_ZOOM_STEP;

	return Number(stepped.toFixed(2));
}

export function stepUiZoom(value: unknown, step: number): number {
	const source = normalizeUiZoom(value);
	const normalizedStep = Number.isFinite(step) ? Math.trunc(step) : 0;
	if (normalizedStep === 0) return source;

	return normalizeUiZoom(source + normalizedStep * UI_ZOOM_KEYBOARD_STEP);
}

export function normalizeTypographyPreferences(value: unknown): TypographyPreferences {
	const candidate =
		value && typeof value === 'object' ? (value as Partial<TypographyPreferences>) : {};

	return {
		uiZoom: normalizeUiZoom(candidate.uiZoom),
		uppercaseText: candidate.uppercaseText === true,
		highContrast: candidate.highContrast === true,
		enhancedFocus: candidate.enhancedFocus === true,
		reduceMotion: candidate.reduceMotion === true,
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

export function getUiZoomOption(value: UiZoomPresetId) {
	return uiZoomOptions.find((option) => option.id === value) ?? uiZoomOptions[1];
}

export function getTypographyRootSize(
	preferences: Pick<TypographyPreferences, 'uiZoom'> = DEFAULT_TYPOGRAPHY_PREFERENCES
): string {
	return `${Number((BASE_ROOT_FONT_SIZE_PX * normalizeUiZoom(preferences.uiZoom)).toFixed(2))}px`;
}

export function getTypographyUiZoom(preferences: TypographyPreferences): number {
	return normalizeUiZoom(preferences.uiZoom);
}

export function getTypographyTextTransform(preferences: TypographyPreferences): 'uppercase' | 'none' {
	return preferences.uppercaseText ? 'uppercase' : 'none';
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
