import { DEFAULT_LOCALE, type Locale } from '$lib/i18n/locales.js';
import {
	activeIngredientLocalizedLabel,
	activeIngredientLocalizedTermLabel,
	activeIngredientLocalizedValues,
	normalizeActiveIngredientLocalizedText,
	normalizeActiveIngredientLocalizedTerm,
	normalizeActiveIngredientText,
	type ActiveIngredientLocalizedTerm,
	type ActiveIngredientLocalizedText
} from './localized-text.js';

export const ACTIVE_INGREDIENT_NOMENCLATURE_STANDARDS = ['scientificName', 'inn', 'dcb'] as const;
export const ACTIVE_INGREDIENT_DENOMINATION_STANDARDS = ['inn', 'dcb'] as const;

export const ACTIVE_INGREDIENT_BRAZIL_REGULATORY_CONTROLS = [
	'notControlled',
	'controlledSpecialPrescription',
	'controlledNotification',
	'antimicrobialPrescriptionRetention',
	'mapaAnvisaControlled',
	'prescriptionOnly',
	'notInformed'
] as const;

export const ACTIVE_INGREDIENT_UNITED_STATES_REGULATORY_CONTROLS = [
	'notControlled',
	'scheduleI',
	'scheduleII',
	'scheduleIII',
	'scheduleIV',
	'scheduleV',
	'prescriptionOnly',
	'otc',
	'notInformed'
] as const;

export const ACTIVE_INGREDIENT_EUROPE_REGULATORY_CONTROLS = ['notControlled', 'controlledSubstance', 'prescriptionOnly', 'veterinaryPrescriptionOnly', 'notInformed'] as const;

export const ACTIVE_INGREDIENT_VETERINARY_RESTRICTIONS = ['none', 'prescriptionOnly', 'clinicalUseOnly', 'hospitalUseOnly', 'productionAnimalRestricted', 'prohibitedDirectTutorSale', 'notInformed'] as const;
const ACTIVE_INGREDIENT_MECHANISM_BEHAVIOR_TARGET_PATTERN_KEY = 'catalog.activeIngredient.classification.mechanism.behaviorTargetPattern' as const;

export type ActiveIngredientNomenclatureStandard = (typeof ACTIVE_INGREDIENT_NOMENCLATURE_STANDARDS)[number];
export type ActiveIngredientDenominationStandard = (typeof ACTIVE_INGREDIENT_DENOMINATION_STANDARDS)[number];
export type ActiveIngredientBrazilRegulatoryControl = (typeof ACTIVE_INGREDIENT_BRAZIL_REGULATORY_CONTROLS)[number];
export type ActiveIngredientUnitedStatesRegulatoryControl = (typeof ACTIVE_INGREDIENT_UNITED_STATES_REGULATORY_CONTROLS)[number];
export type ActiveIngredientEuropeRegulatoryControl = (typeof ACTIVE_INGREDIENT_EUROPE_REGULATORY_CONTROLS)[number];
export type ActiveIngredientVeterinaryRestriction = (typeof ACTIVE_INGREDIENT_VETERINARY_RESTRICTIONS)[number];

export interface ActiveIngredientNomenclatureDenomination {
	standard: ActiveIngredientDenominationStandard;
	label: ActiveIngredientLocalizedText;
}

export interface ActiveIngredientNomenclature {
	scientificName: string | null;
	denominations: ActiveIngredientNomenclatureDenomination[];
	casNumber: string | null;
}

export interface ActiveIngredientAtcVetClassification {
	code: string | null;
	system: ActiveIngredientLocalizedTerm | null;
}

export interface ActiveIngredientRegulatoryClassification {
	brazil: ActiveIngredientBrazilRegulatoryControl | null;
	unitedStates: ActiveIngredientUnitedStatesRegulatoryControl | null;
	europe: ActiveIngredientEuropeRegulatoryControl | null;
}

export type ActiveIngredientMechanismTerm = ActiveIngredientLocalizedTerm;

export interface ActiveIngredientMechanismTarget {
	label: ActiveIngredientLocalizedText;
	family: ActiveIngredientMechanismTerm | null;
}

export interface ActiveIngredientChemicalActionMechanism {
	label: ActiveIngredientLocalizedText;
	behavior: ActiveIngredientMechanismTerm | null;
	target: ActiveIngredientMechanismTarget;
	note: ActiveIngredientLocalizedText;
}

export const emptyActiveIngredientMechanismTarget: ActiveIngredientMechanismTarget = {
	label: {},
	family: null
};

export const emptyActiveIngredientChemicalActionMechanism: ActiveIngredientChemicalActionMechanism = {
	label: {},
	behavior: null,
	target: emptyActiveIngredientMechanismTarget,
	note: {}
};

export interface ActiveIngredientClassification {
	nomenclature: ActiveIngredientNomenclature;
	atcVet: ActiveIngredientAtcVetClassification;
	chemicalActionMechanism: ActiveIngredientChemicalActionMechanism;
	regulatoryControl: ActiveIngredientRegulatoryClassification;
	veterinaryRestriction: ActiveIngredientVeterinaryRestriction | null;
}

function emptyClassification(): ActiveIngredientClassification {
	return {
		nomenclature: {
			scientificName: null,
			denominations: [],
			casNumber: null
		},
		atcVet: {
			code: null,
			system: null
		},
		chemicalActionMechanism: {
			...emptyActiveIngredientChemicalActionMechanism,
			target: { ...emptyActiveIngredientChemicalActionMechanism.target }
		},
		regulatoryControl: {
			brazil: null,
			unitedStates: null,
			europe: null
		},
		veterinaryRestriction: null
	};
}

export const emptyActiveIngredientClassification: ActiveIngredientClassification = emptyClassification();

function emptyNomenclature(): ActiveIngredientNomenclature {
	return {
		scientificName: null,
		denominations: [],
		casNumber: null
	};
}

function emptyAtcVet(): ActiveIngredientAtcVetClassification {
	return {
		code: null,
		system: null
	};
}

function emptyRegulatoryControl(): ActiveIngredientRegulatoryClassification {
	return {
		brazil: null,
		unitedStates: null,
		europe: null
	};
}

const brazilRegulatoryControlLabelKeys = {
	notControlled: 'catalog.activeIngredient.classification.regulatory.brazil.notControlled',
	controlledSpecialPrescription: 'catalog.activeIngredient.classification.regulatory.brazil.controlledSpecialPrescription',
	controlledNotification: 'catalog.activeIngredient.classification.regulatory.brazil.controlledNotification',
	antimicrobialPrescriptionRetention: 'catalog.activeIngredient.classification.regulatory.brazil.antimicrobialPrescriptionRetention',
	mapaAnvisaControlled: 'catalog.activeIngredient.classification.regulatory.brazil.mapaAnvisaControlled',
	prescriptionOnly: 'catalog.activeIngredient.classification.regulatory.brazil.prescriptionOnly',
	notInformed: 'catalog.activeIngredient.classification.regulatory.notInformed'
} as const satisfies Record<ActiveIngredientBrazilRegulatoryControl, string>;

const unitedStatesRegulatoryControlLabelKeys = {
	notControlled: 'catalog.activeIngredient.classification.regulatory.unitedStates.notControlled',
	scheduleI: 'catalog.activeIngredient.classification.regulatory.unitedStates.scheduleI',
	scheduleII: 'catalog.activeIngredient.classification.regulatory.unitedStates.scheduleII',
	scheduleIII: 'catalog.activeIngredient.classification.regulatory.unitedStates.scheduleIII',
	scheduleIV: 'catalog.activeIngredient.classification.regulatory.unitedStates.scheduleIV',
	scheduleV: 'catalog.activeIngredient.classification.regulatory.unitedStates.scheduleV',
	prescriptionOnly: 'catalog.activeIngredient.classification.regulatory.unitedStates.prescriptionOnly',
	otc: 'catalog.activeIngredient.classification.regulatory.unitedStates.otc',
	notInformed: 'catalog.activeIngredient.classification.regulatory.notInformed'
} as const satisfies Record<ActiveIngredientUnitedStatesRegulatoryControl, string>;

const europeRegulatoryControlLabelKeys = {
	notControlled: 'catalog.activeIngredient.classification.regulatory.europe.notControlled',
	controlledSubstance: 'catalog.activeIngredient.classification.regulatory.europe.controlledSubstance',
	prescriptionOnly: 'catalog.activeIngredient.classification.regulatory.europe.prescriptionOnly',
	veterinaryPrescriptionOnly: 'catalog.activeIngredient.classification.regulatory.europe.veterinaryPrescriptionOnly',
	notInformed: 'catalog.activeIngredient.classification.regulatory.notInformed'
} as const satisfies Record<ActiveIngredientEuropeRegulatoryControl, string>;

const veterinaryRestrictionLabelKeys = {
	none: 'catalog.activeIngredient.classification.veterinaryRestriction.none',
	prescriptionOnly: 'catalog.activeIngredient.classification.veterinaryRestriction.prescriptionOnly',
	clinicalUseOnly: 'catalog.activeIngredient.classification.veterinaryRestriction.clinicalUseOnly',
	hospitalUseOnly: 'catalog.activeIngredient.classification.veterinaryRestriction.hospitalUseOnly',
	productionAnimalRestricted: 'catalog.activeIngredient.classification.veterinaryRestriction.productionAnimalRestricted',
	prohibitedDirectTutorSale: 'catalog.activeIngredient.classification.veterinaryRestriction.prohibitedDirectTutorSale',
	notInformed: 'catalog.activeIngredient.classification.regulatory.notInformed'
} as const satisfies Record<ActiveIngredientVeterinaryRestriction, string>;

const nomenclatureStandardLabelKeys = {
	scientificName: 'catalog.activeIngredient.classification.scientificName',
	inn: 'catalog.activeIngredient.classification.inn',
	dcb: 'catalog.activeIngredient.classification.dcb'
} as const satisfies Record<ActiveIngredientNomenclatureStandard, string>;

const nomenclatureStandardDescriptionKeys = {
	inn: 'catalog.activeIngredient.classification.innDescription',
	dcb: 'catalog.activeIngredient.classification.dcbDescription'
} as const satisfies Record<ActiveIngredientDenominationStandard, string>;

type ActiveIngredientClassificationLabelKey =
	| (typeof nomenclatureStandardLabelKeys)[keyof typeof nomenclatureStandardLabelKeys]
	| (typeof nomenclatureStandardDescriptionKeys)[keyof typeof nomenclatureStandardDescriptionKeys]
	| (typeof brazilRegulatoryControlLabelKeys)[keyof typeof brazilRegulatoryControlLabelKeys]
	| (typeof unitedStatesRegulatoryControlLabelKeys)[keyof typeof unitedStatesRegulatoryControlLabelKeys]
	| (typeof europeRegulatoryControlLabelKeys)[keyof typeof europeRegulatoryControlLabelKeys]
	| (typeof veterinaryRestrictionLabelKeys)[keyof typeof veterinaryRestrictionLabelKeys]
	| typeof ACTIVE_INGREDIENT_MECHANISM_BEHAVIOR_TARGET_PATTERN_KEY;

type Translate = (key: ActiveIngredientClassificationLabelKey) => string;

function comparableText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase()
		.trim()
		.replace(/\s+/g, ' ');
}

function formattedBehaviorTargetLabel(behaviorLabel: string | null, targetLabel: string | null, translate: Translate): string | null {
	if (!behaviorLabel || !targetLabel) return null;
	return translate(ACTIVE_INGREDIENT_MECHANISM_BEHAVIOR_TARGET_PATTERN_KEY).replace('{behavior}', behaviorLabel).replace('{target}', targetLabel);
}

const warnedRedundantMechanismLabels = new Set<string>();

function warnRedundantMechanismLabel(locale: Locale, label: string) {
	const key = `${locale}:${label}`;
	if (warnedRedundantMechanismLabels.has(key) || typeof console === 'undefined') return;
	warnedRedundantMechanismLabels.add(key);
	console.warn('chemicalActionMechanism.label duplicates behavior + target; remove the label and use the i18n behaviorTargetPattern instead.', { locale, label });
}

function normalizedCode(value: unknown): string | null {
	const text = normalizeActiveIngredientText(value, 32);
	return text ? text.toUpperCase() : null;
}

function normalizedDenominationStandard(value: unknown): ActiveIngredientDenominationStandard | null {
	return typeof value === 'string' && ACTIVE_INGREDIENT_DENOMINATION_STANDARDS.includes(value as ActiveIngredientDenominationStandard) ? (value as ActiveIngredientDenominationStandard) : null;
}

function normalizedOption<T extends string>(value: unknown, options: readonly T[]): T | null {
	return typeof value === 'string' && options.includes(value as T) ? (value as T) : null;
}

function normalizeDenomination(value: unknown): ActiveIngredientNomenclatureDenomination | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const source = value as Record<string, unknown>;
	const standard = normalizedDenominationStandard(source.standard);
	if (!standard) return null;
	const denomination: ActiveIngredientNomenclatureDenomination = {
		standard,
		label: normalizeActiveIngredientLocalizedText(source.label, 180)
	};
	return activeIngredientLocalizedValues(denomination.label).length > 0 ? denomination : null;
}

function normalizeNomenclature(value: unknown): ActiveIngredientNomenclature {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyNomenclature();
	const source = value as Record<string, unknown>;
	return {
		scientificName: normalizeActiveIngredientText(source.scientificName, 180),
		denominations: Array.isArray(source.denominations) ? source.denominations.map(normalizeDenomination).filter((denomination): denomination is ActiveIngredientNomenclatureDenomination => Boolean(denomination)) : [],
		casNumber: normalizeActiveIngredientText(source.casNumber, 48)
	};
}

function normalizeAtcVet(value: unknown): ActiveIngredientAtcVetClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyAtcVet();
	const source = value as Record<string, unknown>;
	return {
		code: normalizedCode(source.code),
		system: normalizeActiveIngredientLocalizedTerm(source.system)
	};
}

function normalizeMechanismTarget(value: unknown): ActiveIngredientMechanismTarget {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyActiveIngredientMechanismTarget };
	const source = value as Record<string, unknown>;
	return {
		label: normalizeActiveIngredientLocalizedText(source.label),
		family: normalizeActiveIngredientLocalizedTerm(source.family)
	};
}

export function normalizeActiveIngredientChemicalActionMechanism(value: unknown): ActiveIngredientChemicalActionMechanism {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { ...emptyActiveIngredientChemicalActionMechanism, target: { ...emptyActiveIngredientMechanismTarget } };
	}
	const source = value as Record<string, unknown>;
	return {
		label: normalizeActiveIngredientLocalizedText(source.label),
		behavior: normalizeActiveIngredientLocalizedTerm(source.behavior),
		target: normalizeMechanismTarget(source.target),
		note: normalizeActiveIngredientLocalizedText(source.note, 500)
	};
}

function normalizeRegulatoryControl(value: unknown): ActiveIngredientRegulatoryClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyRegulatoryControl();
	const source = value as Record<string, unknown>;
	return {
		brazil: normalizedOption(source.brazil, ACTIVE_INGREDIENT_BRAZIL_REGULATORY_CONTROLS),
		unitedStates: normalizedOption(source.unitedStates, ACTIVE_INGREDIENT_UNITED_STATES_REGULATORY_CONTROLS),
		europe: normalizedOption(source.europe, ACTIVE_INGREDIENT_EUROPE_REGULATORY_CONTROLS)
	};
}

export function normalizeActiveIngredientClassification(value: unknown): ActiveIngredientClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return emptyClassification();
	}

	const source = value as Record<string, unknown>;
	return {
		nomenclature: normalizeNomenclature(source.nomenclature),
		atcVet: normalizeAtcVet(source.atcVet),
		chemicalActionMechanism: normalizeActiveIngredientChemicalActionMechanism(source.chemicalActionMechanism),
		regulatoryControl: normalizeRegulatoryControl(source.regulatoryControl),
		veterinaryRestriction: normalizedOption(source.veterinaryRestriction, ACTIVE_INGREDIENT_VETERINARY_RESTRICTIONS)
	};
}

export function activeIngredientNomenclatureDenomination(classification: ActiveIngredientClassification, standard: ActiveIngredientDenominationStandard): ActiveIngredientNomenclatureDenomination | null {
	return classification.nomenclature.denominations.find((entry) => entry.standard === standard) ?? null;
}

export function activeIngredientNomenclatureEntryStandardLabel(standard: ActiveIngredientNomenclatureStandard, translate: Translate): string {
	return translate(nomenclatureStandardLabelKeys[standard]);
}

export function activeIngredientNomenclatureEntryStandardDescription(standard: ActiveIngredientNomenclatureStandard, translate: Translate): string | null {
	if (standard === 'scientificName') return null;
	return translate(nomenclatureStandardDescriptionKeys[standard]);
}

export function activeIngredientNomenclatureEntryValue(classification: ActiveIngredientClassification, standard: ActiveIngredientNomenclatureStandard, locale: Locale = DEFAULT_LOCALE): string | null {
	if (standard === 'scientificName') return classification.nomenclature.scientificName;
	return activeIngredientLocalizedLabel(activeIngredientNomenclatureDenomination(classification, standard)?.label ?? {}, locale);
}

function activeIngredientNomenclatureEntrySummary(classification: ActiveIngredientClassification, standard: ActiveIngredientNomenclatureStandard, translate: Translate, locale: Locale): string | null {
	const value = activeIngredientNomenclatureEntryValue(classification, standard, locale);
	if (!value) return null;
	return `${activeIngredientNomenclatureEntryStandardLabel(standard, translate)}: ${value}`;
}

export function activeIngredientNomenclatureLabel(classification: ActiveIngredientClassification, translate: Translate, locale: Locale = DEFAULT_LOCALE): string | null {
	const inn = activeIngredientNomenclatureEntrySummary(classification, 'inn', translate, locale);
	const dcb = locale === 'pt-BR' ? activeIngredientNomenclatureEntrySummary(classification, 'dcb', translate, locale) : null;
	if (inn && dcb) return `${inn} / ${dcb}`;
	return inn ?? dcb ?? activeIngredientNomenclatureEntrySummary(classification, 'scientificName', translate, locale);
}

export function activeIngredientNomenclaturePreferredStandards(locale: Locale = DEFAULT_LOCALE): ActiveIngredientNomenclatureStandard[] {
	if (locale === 'pt-BR') return ['inn', 'dcb'];
	return ['inn'];
}

export function activeIngredientAtcVetSystemLabel(system: ActiveIngredientLocalizedTerm | null, locale: Locale = DEFAULT_LOCALE): string | null {
	return activeIngredientLocalizedTermLabel(system, locale);
}

export function activeIngredientAtcVetLabel(classification: ActiveIngredientClassification, locale: Locale = DEFAULT_LOCALE): string | null {
	const { code, system } = classification.atcVet;
	const systemLabel = activeIngredientAtcVetSystemLabel(system, locale);
	if (code && systemLabel) return `${code} (${systemLabel})`;
	return code ?? systemLabel;
}

function activeIngredientMechanismTermLabel(term: ActiveIngredientMechanismTerm | null, locale: Locale): string | null {
	return activeIngredientLocalizedTermLabel(term, locale);
}

function activeIngredientMechanismTargetNameLabel(target: ActiveIngredientMechanismTarget, locale: Locale): string | null {
	return activeIngredientLocalizedLabel(target.label, locale);
}

export function activeIngredientChemicalActionMechanismLabel(mechanism: ActiveIngredientChemicalActionMechanism, locale: Locale, translate: Translate): string | null {
	const label = activeIngredientLocalizedLabel(mechanism.label, locale);
	const behaviorLabel = activeIngredientMechanismTermLabel(mechanism.behavior, locale);
	const targetLabel = activeIngredientMechanismTargetNameLabel(mechanism.target, locale);
	const composedLabel = formattedBehaviorTargetLabel(behaviorLabel, targetLabel, translate);

	if (label) {
		if (composedLabel && comparableText(label) === comparableText(composedLabel)) {
			warnRedundantMechanismLabel(locale, label);
			return composedLabel;
		}
		return label;
	}

	if (composedLabel) return composedLabel;
	return behaviorLabel ?? targetLabel;
}

function activeIngredientChemicalActionMechanismSearchText(mechanism: ActiveIngredientChemicalActionMechanism, locale: Locale, translate: Translate): string {
	const behaviorLabel = activeIngredientMechanismTermLabel(mechanism.behavior, locale);
	const targetLabel = activeIngredientMechanismTargetNameLabel(mechanism.target, locale);
	return [
		activeIngredientChemicalActionMechanismLabel(mechanism, locale, translate),
		...activeIngredientLocalizedValues(mechanism.label),
		behaviorLabel,
		...activeIngredientLocalizedValues(mechanism.behavior?.label ?? {}),
		targetLabel,
		...activeIngredientLocalizedValues(mechanism.target.label),
		activeIngredientMechanismTermLabel(mechanism.target.family, locale),
		...activeIngredientLocalizedValues(mechanism.target.family?.label ?? {}),
		...activeIngredientLocalizedValues(mechanism.note)
	]
		.filter(Boolean)
		.join(' ');
}

export function activeIngredientBrazilRegulatoryControlLabel(value: ActiveIngredientBrazilRegulatoryControl | null, translate: Translate): string | null {
	return value ? translate(brazilRegulatoryControlLabelKeys[value]) : null;
}

export function activeIngredientUnitedStatesRegulatoryControlLabel(value: ActiveIngredientUnitedStatesRegulatoryControl | null, translate: Translate): string | null {
	return value ? translate(unitedStatesRegulatoryControlLabelKeys[value]) : null;
}

export function activeIngredientEuropeRegulatoryControlLabel(value: ActiveIngredientEuropeRegulatoryControl | null, translate: Translate): string | null {
	return value ? translate(europeRegulatoryControlLabelKeys[value]) : null;
}

export function activeIngredientVeterinaryRestrictionLabel(value: ActiveIngredientVeterinaryRestriction | null, translate: Translate): string | null {
	return value ? translate(veterinaryRestrictionLabelKeys[value]) : null;
}

export function activeIngredientClassificationLabel(classification: ActiveIngredientClassification, translate: Translate, locale: Locale = DEFAULT_LOCALE): string | null {
	const parts = [
		activeIngredientAtcVetLabel(classification, locale),
		activeIngredientChemicalActionMechanismLabel(classification.chemicalActionMechanism, locale, translate),
		activeIngredientBrazilRegulatoryControlLabel(classification.regulatoryControl.brazil, translate)
	].filter((value): value is string => Boolean(value));

	return parts.length > 0 ? parts.join('; ') : null;
}

export function activeIngredientClassificationSearchText(classification: ActiveIngredientClassification, translate: Translate, locale: Locale = DEFAULT_LOCALE): string {
	return [
		activeIngredientNomenclatureLabel(classification, translate, locale),
		classification.nomenclature.scientificName,
		...classification.nomenclature.denominations.flatMap((entry) => [activeIngredientNomenclatureEntryStandardLabel(entry.standard, translate), ...activeIngredientLocalizedValues(entry.label)]),
		classification.nomenclature.casNumber,
		activeIngredientAtcVetLabel(classification, locale),
		...activeIngredientLocalizedValues(classification.atcVet.system?.label ?? {}),
		activeIngredientChemicalActionMechanismSearchText(classification.chemicalActionMechanism, locale, translate),
		activeIngredientBrazilRegulatoryControlLabel(classification.regulatoryControl.brazil, translate),
		activeIngredientUnitedStatesRegulatoryControlLabel(classification.regulatoryControl.unitedStates, translate),
		activeIngredientEuropeRegulatoryControlLabel(classification.regulatoryControl.europe, translate),
		activeIngredientVeterinaryRestrictionLabel(classification.veterinaryRestriction, translate)
	]
		.filter(Boolean)
		.join(' ');
}
