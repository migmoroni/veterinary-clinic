import { countryOptions } from '@vet/types/domain/geo/location.js';
import { i18n, t } from '@vet/core-local/i18n/index.js';

export function catalogRegionLabel(region: string): string {
	return countryOptions(i18n.locale).find((country) => country.value === region)?.label ?? region;
}

export function catalogRegionSummary(regions: readonly string[]): string {
	if (regions.length === 0) return t('common.notInformed');
	return regions.map(catalogRegionLabel).join(', ');
}

export function catalogSectionTexts<TSectionId extends string>(
	sectionIds: readonly TSectionId[],
	sections: Partial<Record<TSectionId, string>> | null | undefined
): Record<TSectionId, string> {
	return Object.fromEntries(sectionIds.map((sectionId) => [sectionId, sections?.[sectionId] ?? ''])) as Record<TSectionId, string>;
}
