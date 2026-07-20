import {
	catalogType,
	catalogTypeCategory,
	catalogTypeDetail,
	catalogTypeDetailOptions,
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
 * Árvore hierárquica de Condições Clínicas (Doenças, Síndromes, Distúrbios e Lesões).
 * - Nível 1: Condição Clínica (Entidade)
 * - Nível 2: Pilar Clínico (Chave principal)
 * - Nível 3: Sistema Fisiológico ou Causa (Propriedade)
 * - Nível 4: Categoria Patológica (Valores do Array)
 */

export const CONDITION_TYPE_TREE = {
	condition: {
		/** Doenças: Processos patológicos ativos com causas e mecanismos definidos */
		disease: {
			/** Agentes Biológicos de infecção ou infestação */
			infectiousAndParasitic: [
				'viral',                // Vírus (Cinomose, Parvovirose, FIV/FeLV)
				'bacterial',            // Bactérias (Leptospirose, Erliquiose)
				'fungal',               // Fungos (Esporotricose, Dermatofitose)
				'parasitic',            // Vermes, ácaros, pulgas e carrapatos
				'prionic'               // Encefalopatias espongiformes e príons
			],
			/** Crescimento e proliferação celular anormal */
			neoplastic: [
				'benign',               // Neoplasias benignas (não invasivas)
				'malignant'             // Neoplasias malignas (câncer infiltrativo/metastático)
			],
			/** Respostas aberrantes ou excessivas do sistema de defesa */
			immuneAndInflammatory: [
				'allergic',             // Reações de hipersensibilidade e atopia
				'autoimmune',            // Ataque do sistema imune ao próprio corpo
				'immunodeficiency',     // Falhas congênitas ou adquiridas de imunidade
				'sterileInflammatory'   // Inflamações sistêmicas sem agente infeccioso ativo
			],
			/** Desgastes, falhas crônicas e desequilíbrios metabólicos */
			systemicAndMetabolic: [
				'metabolicAndEndocrine',      // Falhas hormonais ou de síntese energética
				'degenerativeAndInsufficiency',// Perda crônica de função tecidual (insuficiências de órgãos)
				'hemodynamicAndCirculatory'   // Distúrbios de fluxo, pressão e fluidos sistêmicos
			],
			/** Problemas originados no desenvolvimento ou código genético */
			geneticAndDevelopmental: [
				'congenitalMalformation',     // Defeitos estruturais de nascimento
				'hereditaryDisorder'          // Anomalias funcionais transmitidas pelos pais
			]
		},

		/** Síndromes: Complexos de sinais clínicos com múltiplas etiologias possíveis */
		syndrome: {
			/** Emergências agudas de colapso sistêmico ou circulatório */
			acuteEmergency: [
				'circulatoryShock',           // Choques (hipovolêmico, séptico, anafilático)
				'acuteRespiratoryDistress',   // Síndrome de desconforto respiratório agudo
				'systemicInflammatoryResponse'// Síndrome da Resposta Inflamatória Sistêmica (SIRS / Sepse)
			],
			/** Falhas mecânicas súbitas que impedem o fluxo natural de fluidos ou gases */
			obstructiveAndMechanical: [
				'cavityObstruction',          // Obstruções de tratos (gato obstruído, corpo estranho)
				'torsionAndDilation'          // Torções e vólvulos viscerais (torção gástrica)
			],
			/** Desregulações complexas de eixos funcionais do corpo */
			neuroEndocrine: [
				'hormonalDysregulation',      // Eixos hormonais descompensados (Cushing, Addison)
				'vestibularAndNeuromuscular'  // Síndromes de perda de equilíbrio ou coordenação
			]
		},

		/** Distúrbios e Transtornos: Disfunções funcionais crônicas sem patogenia destrutiva ativa */
		disorder: {
			/** Desvios de comportamento, estresse e declínio cognitivo */
			behavioralAndCognitive: [
				'anxietyAndPhobia',           // Transtorno de ansiedade de separação, fobias de barulho
				'cognitiveDecay',             // Síndrome da Disfunção Cognitiva (SDC / demência senil)
				'stereotypyAndCompulsion',     // Comportamentos obsessivos-compulsivos
				'behavioralDisorder'          // Transtornos de comportamento e estresse
			],
			/** Perda crônica de funções sensoriais ou elétricas do sistema nervoso */
			sensoryAndNeurological: [
				'functionalEpilepsy',         // Epilepsia crônica essencial/idiopática
				'sensoryLoss',                // Perda progressiva de audição ou visão
				'sleepDisorder'               // Distúrbios do ciclo do sono
			],
			/** Alterações crônicas de sustentação e locomoção */
			structuralAndDegenerative: [
				'jointDegeneration',          // Desgaste articular crônico (artroses)
				'growthDisplacement',         // Desvios e deformidades de crescimento ósseo
				'muscleDegeneration',          // Atrofia ou degeneração muscular crônica
				'neuromuscularDisorder'       // Distúrbios de coordenação e locomoção
			]
		},

		/** Lesões e Traumatismos: Danos agudos causados por forças externas ou acidentes */
		injury: {
			/** Impactos físicos diretos contra o corpo do animal */
			mechanicalAndTraumatic: [
				'boneAndJointTrauma',         // Fraturas e luxações traumáticas
				'softTissueTrauma',           // Cortes, lacerações e mordeduras na pele/músculos
				'visceralAndInternalTrauma'   // Contusões pulmonares ou hemorragias internas
			],
			/** Exposições extremas ao ambiente ou elementos físicos */
			environmentalAndPhysical: [
				'thermalInjury',              // Queimaduras, intermação ou hipotermia severa
				'radiationAndElectric'        // Choques elétricos ou danos por radiação
			],
			/** Danos induzidos por agentes químicos ou venenos biológicos */
			toxicAndEnvenomation: [
				'chemicalPoisoning',          // Ingestão de toxinas, plantas ou medicamentos humanos
				'animalEnvenomation'          // Picadas de cobras, aranhas ou abelhas
			],
			/** Complicações diretas de procedimentos médicos ou cirúrgicos */
			iatrogenicAndSurgical: [
				'woundDehiscence',            // Abertura de pontos de sutura
				'postOperativeComplication'   // Seromas, hematomas ou infecções pós-cirúrgicas
			]
		}
	}
} as const;

export const CONDITION_CLASSIFICATION_AXES = [
	{
        id: 'zoonoticRisk',
        values: [
            /** Sem risco conhecido de transmissão humana */
            'none',
            /** Risco baixo/exceções (ex: sarna de ouvido transitória) */
            'low',
            /** Transmissível, mas geralmente autolimitada (ex: sarna sarcóptica, dermatofitose) */
            'moderate',
            /** Alto risco, potencialmente fatal ou sistêmica (ex: raiva, leishmaniose, leptospirose) */
            'high'
        ]
    },
    {
        id: 'notificationRequirement',
        values: [
            /** Não exige notificação às autoridades agrícolas ou de saúde pública */
            'none',
            /** Notificação Mensal ou Semestral (monitoramento estatístico) */
            'periodic',
            /** Notificação Compulsória de Vigilância (ex: Leishmaniose) */
            'compulsory',
            /** Alerta Imediato / Emergência Sanitária (ex: Febre Aftosa, Raiva) */
            'immediate'
        ]
    }
] as const;

export type ConditionTypeTree = typeof CONDITION_TYPE_TREE;
export type ConditionTypeMain = keyof ConditionTypeTree['condition'] & string;
export type ConditionTypeSubtype<TMain extends ConditionTypeMain> = keyof ConditionTypeTree['condition'][TMain] & string;
export type ConditionTypeDetail<TMain extends ConditionTypeMain, TSubtype extends ConditionTypeSubtype<TMain>> =
	ConditionTypeTree['condition'][TMain][TSubtype] extends readonly string[] ? ConditionTypeTree['condition'][TMain][TSubtype][number] : never;
export type ConditionType = CatalogTypeTuple<ConditionTypeTree>;
export type ConditionClassification = CatalogClassification;

export const CONDITION_TYPES = catalogTypesFromTree(CONDITION_TYPE_TREE);

export const conditionProfileSectionIds = ['about', 'clinicalSigns', 'diagnosis', 'management', 'prevention', 'references'] as const;
export type ConditionProfileSectionId = (typeof conditionProfileSectionIds)[number];
export type ConditionProfileSections = Partial<Record<ConditionProfileSectionId, string>>;

export interface ConditionCatalogExtension {
	classification: ConditionClassification;
	sections: ConditionProfileSections;
}

export interface ConditionCatalogItem extends CatalogEntityBase<ConditionType, ConditionCatalogExtension> {}

export const emptyConditionCatalogExtension: ConditionCatalogExtension = {
	classification: emptyCatalogClassification,
	sections: {}
};

export function conditionType<TMain extends ConditionTypeMain, TSubtype extends ConditionTypeSubtype<TMain>>(
	main: TMain,
	subtype: TSubtype,
	detail: ConditionTypeDetail<TMain, TSubtype> | null = null
): ConditionType {
	return catalogType(CONDITION_TYPE_TREE, 'condition', main, subtype, detail) as ConditionType;
}

export function conditionTypeOptions<TMain extends ConditionTypeMain>(main: TMain): readonly ConditionTypeSubtype<TMain>[] {
	return catalogTypeSubcategoryOptions(CONDITION_TYPE_TREE, 'condition', main) as readonly ConditionTypeSubtype<TMain>[];
}

export function conditionTypeDetailOptions<TMain extends ConditionTypeMain, TSubtype extends ConditionTypeSubtype<TMain>>(main: TMain, subtype: TSubtype): readonly ConditionTypeDetail<TMain, TSubtype>[] {
	return catalogTypeDetailOptions(CONDITION_TYPE_TREE, 'condition', main, subtype) as readonly ConditionTypeDetail<TMain, TSubtype>[];
}

export function conditionTypeMain(type: ConditionType): ConditionTypeMain {
	return catalogTypeCategory(type) as ConditionTypeMain;
}

export function conditionTypeSubtype<TMain extends ConditionTypeMain>(type: ConditionType): ConditionTypeSubtype<TMain> | null {
	return catalogTypeSubcategory(type) as ConditionTypeSubtype<TMain> | null;
}

export function conditionTypeDetail(type: ConditionType): ConditionType[3] | null {
	return catalogTypeDetail(type);
}

export function parseConditionType(value: string): ConditionType {
	return parseCatalogType(value, CONDITION_TYPE_TREE) as ConditionType;
}

export function stringifyConditionType(type: ConditionType): string {
	return stringifyCatalogType(type);
}

export function parseConditionAliases(value: string | null | undefined, canonicalNormalizedName = ''): string[] {
	return parseCatalogAliases(value, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export function stringifyConditionAliases(values: readonly string[] | null | undefined, canonicalNormalizedName = ''): string {
	return stringifyCatalogAliases(values, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export const parseConditionRegions = parseCatalogRegions;
export const stringifyConditionRegions = stringifyCatalogRegions;

export function normalizeConditionCatalogExtension(value: unknown): ConditionCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyConditionCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizeCatalogClassification(source.classification, CONDITION_CLASSIFICATION_AXES),
		sections: normalizedSectionTexts(source.sections, conditionProfileSectionIds)
	};
}

export function parseConditionCatalogExtension(value: string | null | undefined): ConditionCatalogExtension {
	if (!value) return { ...emptyConditionCatalogExtension, sections: {} };

	try {
		return normalizeConditionCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyConditionCatalogExtension, sections: {} };
	}
}

export function stringifyConditionCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeConditionCatalogExtension(value));
}
