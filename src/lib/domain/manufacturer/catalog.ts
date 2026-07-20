import {
	catalogType,
	catalogTypeCategory,
	catalogTypeSubcategory,
	catalogTypeSubcategoryOptions,
	catalogTypesFromTree,
	normalizedNullableText,
	normalizedSectionTexts,
	parseCatalogAliases,
	parseCatalogRegions,
	parseCatalogType,
	stringifyCatalogAliases,
	stringifyCatalogRegions,
	stringifyCatalogType,
	type CatalogEntityBase,
	type CatalogTypeTuple
} from '$lib/domain/catalog/catalog-entity.js';
import { emptyCatalogClassification, normalizeCatalogClassification, type CatalogClassification } from '$lib/domain/catalog/classification.js';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';

/**
 * Árvore de organização de Fabricantes/Produtores (2 Níveis).
 * - Nível 1: Fabricante (Entidade)
 * - Nível 2: Segmento Principal da Indústria (Chave)
 * - Nível 3: Tipo de Produção / Natureza do Estabelecimento (Valores do Array)
 */

export const MANUFACTURER_TYPE_TREE = {
	manufacturer: {
		/** Indústria Humana: Fabricantes de medicamentos e produtos regulados */
		humanIndustrial: [
			'humanIndustrialLaboratory',  // Laboratório Industrial: Produção em larga escala de medicamentos comerciais
			'humanCompoundingPharmacy'    // Farmácia de Manipulação: Produção personalizada sob fórmula magistral veterinária
		],
		/** Indústria Veterinária: Fabricantes de medicamentos e produtos regulados */
		veterinaryIndustrial: [
			'veterinaryIndustrialLaboratory',  // Laboratório Industrial: Produção em larga escala de medicamentos comerciais
			'veterinaryCompoundingPharmacy'    // Farmácia de Manipulação: Produção personalizada sob fórmula magistral veterinária
		],
		/** Registro Simplificado: Fabricantes de ração, cosméticos e insumos secos */
		simplifiedRegister: [
			'nutritionIndustry',      // Nutrição: Fabricantes de rações, dietas terapêuticas e petiscos
			'hygieneIndustry',        // Higiene: Fabricantes de cosméticos, shampoos e saneantes de ambiente
			'medicalDevicesIndustry'  // Dispositivos Médicos: Fabricantes de agulhas, seringas, cateteres e ligaduras
		]
	}
} as const;

/**
 * Eixos de classificação regulatória, logística e de qualidade para os Fabricantes/Laboratórios.
 * Essencial para guiar o fluxo de compras, receitas e conformidade jurídica do sistema.
 */
export const MANUFACTURER_CLASSIFICATION_AXES = [
    { 
        id: 'regulatoryStatus', 
        values: [
            /** Regulado pelo órgão agrícola (MAPA/DGAV). Produtos exclusivos para uso animal */
            'veterinaryIndustrial', 
            /** Regulado pelo órgão de saúde humana (ANVISA/Infarmed). Uso off-label na veterinária */
            'humanIndustrial', 
            /** Farmácia de manipulação autorizada a produzir fórmulas magistrais sob medida */
            'licensedCompounding', 
            /** Registro simplificado ou isento (fabricantes de ração, cosméticos ou insumos secos) */
            'simplifiedRegister'
        ] 
    },
    { 
        id: 'commercialFlow', 
        values: [
            /** Faturamento e envio direto da fábrica para o médico veterinário ou clínica */
            'directSales', 
            /** Aquisição exclusiva através de distribuidoras veterinárias autorizadas */
            'distributorNetwork', 
            /** O produto não é estocado; é prescrito para o tutor manipular na farmácia parceira */
            'magistralPrescription', 
            /** Exige importação direta autorizada por receita e trâmites alfandegários especiais */
            'specialImport'
        ] 
    },
    { 
        id: 'qualityStandard', 
        values: [
            /** Possui certificação ativa de Boas Práticas de Fabricação (GMP/BPF) */
            'gmpCertified', 
            /** Segue o padrão regulatório industrial básico do país de origem */
            'standardIndustrial', 
            /** Controle de qualidade magistral regulado por conselhos de classe (CRF/CRMV) */
            'magistralQuality', 
            /** Não aplicável (insumos descartáveis comuns, papelaria, acessórios) */
            'nonApplicable'
        ] 
    }
] as const;

export type ManufacturerTypeTree = typeof MANUFACTURER_TYPE_TREE;
export type ManufacturerTypeMain = keyof ManufacturerTypeTree['manufacturer'] & string;
export type ManufacturerTypeSubtype<TMain extends ManufacturerTypeMain> = ManufacturerTypeTree['manufacturer'][TMain][number];
export type ManufacturerType = CatalogTypeTuple<ManufacturerTypeTree>;
export type ManufacturerClassification = CatalogClassification;

export const MANUFACTURER_TYPES = catalogTypesFromTree(MANUFACTURER_TYPE_TREE);

export const manufacturerProfileSectionIds = ['about', 'portfolio', 'support', 'references'] as const;
export type ManufacturerProfileSectionId = (typeof manufacturerProfileSectionIds)[number];
export type ManufacturerProfileSections = Partial<Record<ManufacturerProfileSectionId, string>>;

export interface ManufacturerCatalogExtension {
	classification: ManufacturerClassification;
	website: string | null;
	sections: ManufacturerProfileSections;
}

export interface ManufacturerCatalogItem extends CatalogEntityBase<ManufacturerType, ManufacturerCatalogExtension> {}

export const emptyManufacturerCatalogExtension: ManufacturerCatalogExtension = {
	classification: emptyCatalogClassification,
	website: null,
	sections: {}
};

export function manufacturerType<TMain extends ManufacturerTypeMain>(main: TMain, subtype: ManufacturerTypeSubtype<TMain> | null = null): ManufacturerType {
	return catalogType(MANUFACTURER_TYPE_TREE, 'manufacturer', main, subtype) as ManufacturerType;
}

export function manufacturerTypeOptions<TMain extends ManufacturerTypeMain>(main: TMain): readonly ManufacturerTypeSubtype<TMain>[] {
	return catalogTypeSubcategoryOptions(MANUFACTURER_TYPE_TREE, 'manufacturer', main) as readonly ManufacturerTypeSubtype<TMain>[];
}

export function manufacturerTypeMain(type: ManufacturerType): ManufacturerTypeMain {
	return catalogTypeCategory(type) as ManufacturerTypeMain;
}

export function manufacturerTypeSubtype<TMain extends ManufacturerTypeMain>(type: ManufacturerType): ManufacturerTypeSubtype<TMain> | null {
	return catalogTypeSubcategory(type) as ManufacturerTypeSubtype<TMain> | null;
}

export function parseManufacturerType(value: string): ManufacturerType {
	return parseCatalogType(value, MANUFACTURER_TYPE_TREE) as ManufacturerType;
}

export function stringifyManufacturerType(type: ManufacturerType): string {
	return stringifyCatalogType(type);
}

export function parseManufacturerAliases(value: string | null | undefined, canonicalNormalizedName = ''): string[] {
	return parseCatalogAliases(value, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export function stringifyManufacturerAliases(values: readonly string[] | null | undefined, canonicalNormalizedName = ''): string {
	return stringifyCatalogAliases(values, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export const parseManufacturerRegions = parseCatalogRegions;
export const stringifyManufacturerRegions = stringifyCatalogRegions;

export function normalizeManufacturerCatalogExtension(value: unknown): ManufacturerCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyManufacturerCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizeCatalogClassification(source.classification, MANUFACTURER_CLASSIFICATION_AXES),
		website: normalizedNullableText(source.website),
		sections: normalizedSectionTexts(source.sections, manufacturerProfileSectionIds)
	};
}

export function parseManufacturerCatalogExtension(value: string | null | undefined): ManufacturerCatalogExtension {
	if (!value) return { ...emptyManufacturerCatalogExtension, sections: {} };

	try {
		return normalizeManufacturerCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyManufacturerCatalogExtension, sections: {} };
	}
}

export function stringifyManufacturerCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeManufacturerCatalogExtension(value));
}
