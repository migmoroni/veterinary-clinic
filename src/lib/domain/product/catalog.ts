import {
	catalogTypeCategory,
	catalogTypeDetail,
	catalogTypeDetailOptions,
	catalogTypeSubcategory,
	catalogTypeSubcategoryOptions,
	catalogTypesFromTree,
	isCatalogType,
	normalizeCatalogAliases as normalizeBaseCatalogAliases,
	normalizeCatalogRegions,
	normalizedNullableText,
	normalizedSectionTexts,
	parseCatalogAliases as parseBaseCatalogAliases,
	parseCatalogRegions,
	parseCatalogType,
	stringifyCatalogAliases as stringifyBaseCatalogAliases,
	stringifyCatalogRegions,
	stringifyCatalogType,
	type CatalogEntityBase,
	type CatalogEntityOrigin,
	type CatalogTypeTree,
	type CatalogTypeTuple
} from '$lib/domain/catalog/catalog-entity.js';
import type { ActiveIngredientCatalogItem } from '$lib/domain/active-ingredient/catalog.js';
import { defaultTreatmentSpecies, isTreatmentSpecies, normalizeTreatmentSpecies, parseTreatmentSpecies, stringifyTreatmentSpecies, type TreatmentSpecies } from '$lib/domain/treatment/species.js';

/**
 * Árvore hierárquica de organização de produtos veterinários (4 Níveis).
 * - Nível 1: Tipo de Entidade (Produto)
 * - Nível 2: Categoria Principal (Chave do objeto)
 * - Nível 3: Subcategoria (Propriedade do objeto)
 * - Nível 4: Tipo/Especialidade (Valores do Array)
 */

export const PRODUCT_TYPE_TREE = {
    product: {
        
        /** 1. FARMÁCIA: Medicamentos e Biológicos (A prateleira da clínica) */
        medication: {
            biologicalAndImmunological: [
                'vaccine',              // Vacinas preventivas
                'hyperimmuneSerum',     // Soros hiperimunes (Antiofídico, Antitetânico)
                'monoclonalAntibody',   // Terapias biológicas (Cytopoint, Librela)
                'allergenExtract'       // Imunoterapia para alergias
            ],
            antimicrobial: [
                'antibiotic',           // Antibacterianos orais e injetáveis
                'antifungal',           // Antifúngicos sistêmicos
                'antiviral'             // Antivirais
            ],
            antiparasitic: [
                'endoparasiticide',     // Vermífugos internos
                'ectoparasiticide',     // Antipulgas, carrapatos, sarnicidas (Coleiras, pipetas, comprimidos)
                'endectocide'           // Ação conjunta interna e externa
            ],
            anestheticAndControlled: [
                'generalAnesthetic',    // Anestésicos inalatórios e injetáveis
                'localAnesthetic',      // Anestésicos locais
                'sedativeAndTranquilizer',// Sedativos e tranquilizantes (Controle especial)
                'euthanasiaSolution'    // Fármacos exclusivos para eutanásia
            ],
            painAndInflammation: [
                'antiInflammatory',     // AINEs e Corticoides
                'analgesic'             // Analgésicos comuns e opioides
            ],
            internalMedicine: [         // Prateleira de medicamentos gerais
                'cardiorespiratory',    // Fármacos para coração e pulmão
                'gastrointestinal',     // Antieméticos, protetores gástricos
                'endocrinological',     // Insulinas, reguladores de tireoide
                'neurological',         // Anticonvulsivantes
                'ophthalmic',           // Colírios e pomadas oftalmológicas
                'otic'                  // Gotas e tratamentos para otite
            ],
            oncological: [
                'chemotherapy',         // Quimioterápicos citotóxicos
                'targetedTherapy'       // Inibidores de quinase e antineoplásicos modernos
            ],
            fluidTherapy: [
                'crystalloidSolution',  // Soro Fisiológico, Ringer Lactato
                'colloidSolution',      // Dextrana, Hetastarch
                'bloodBag'              // Bolsas de Sangue, Plasma, Hemácias
            ]
        },

        /** 2. NUTRIÇÃO: Alimentos, Dietas e Suplementos (O salão do Pet Shop e UTI) */
        nutrition: {
            completeDiet: [
                'dryFood',              // Ração seca de manutenção
                'wetFood',              // Ração úmida comum (sachês, latas)
                'naturalDiet'           // Alimentação natural (AN) comercial
            ],
            prescriptionDiet: [
                'therapeuticDry',       // Ração seca coadjuvante (Renal, Hipoalergênica, Urinária)
                'therapeuticWet',       // Ração úmida coadjuvante
                'enteralAndParenteral'  // Alimentação líquida para sondas e nutrição IV
            ],
            supplementAndNutraceutical: [
                'vitaminAndMineral',    // Complexos vitamínicos puros
                'probioticAndPrebiotic',// Repositores de flora intestinal
                'jointSupport',         // Condroprotetores (Glucosamina, Condroitina)
                'omegaFattyAcids'       // Suplementos de Ômega 3/6/9
            ],
            treatAndSnack: [
                'biscuitAndCookie',     // Biscoitos comuns
                'chewAndBone',          // Ossos e mastigáveis (nylon, couro, cascos)
                'functionalTreat'       // Petiscos com funções (tártaro, relaxamento)
            ],
            milkReplacer: [
                'puppyAndKittenFormula' // Leite em pó/sucedâneos para órfãos
            ]
        },

        /** 3. HIGIENE E ESTÉTICA: Banho, Tosa e Limpeza Pessoal */
        hygieneAndAesthetics: {
            coatAndSkin: [
                'shampooAndConditioner',// Cosmética de manutenção
                'medicatedShampoo',     // Shampoos de tratamento (Clorexidina, Cetoconazol)
                'perfumeAndCologne',    // Fragrâncias
                'detanglerAndFinisher'  // Desembaraçadores e finalizadores
            ],
            specificCare: [
                'earCleanser',          // Limpadores auriculares (ceruminolíticos)
                'eyeCleanser',          // Limpa-lágrimas
                'pawBalm',              // Hidratantes de coxins e focinhos
                'dentalCare'            // Pastas de dente, escovas, enxaguantes bucais vet
            ]
        },

        /** 4. INSUMOS CLÍNICOS E DESCARTÁVEIS (O Almoxarifado / Estoque Interno) */
        clinicalConsumable: {
            injectionAndInfusion: [
                'syringeAndNeedle',     // Seringas e Agulhas
                'catheterAndScalp',     // Cateteres IV, Scalps
                'ivTubingAndStopcock'   // Equipos de soro, torneirinhas de 3 vias
            ],
            woundAndSurgicalCare: [
                'sutureMaterial',       // Fios de sutura (Nylon, Catgut, absorvíveis)
                'surgicalBlade',        // Lâminas de bisturi
                'surgicalDrape',        // Campos cirúrgicos e compressas estéreis
                'bandageAndGauze'       // Ataduras, gazes, esparadrapos, Vetrap
            ],
            diagnosticConsumable: [
                'rapidTest',            // Testes rápidos / Snap tests (FIV/FeLV, Leishmaniose)
                'collectionTube',       // Tubos de coleta de sangue (EDTA, Heparina)
                'urineStrip',           // Fitas reativas de urina
                'microscopeSlide'       // Lâminas e lamínulas de microscopia
            ],
            ppeAndSafety: [
                'glove',                // Luvas de procedimento e cirúrgicas
                'maskAndCap',           // Máscaras, toucas
                'surgicalGown'          // Aventais estéreis e não estéreis
            ]
        },

        /** 5. ACESSÓRIOS, REABILITAÇÃO E ENRIQUECIMENTO (O mundo do Pet Shop e Fisioterapia) */
        accessoryAndEnrichment: {
            postSurgicalAndRehab: [
                'elizabethanCollar',    // Colares elizabetanos (Cone) e infláveis
                'recoverySuit',         // Roupas cirúrgicas
                'diaperAndPad',         // Fraldas pet
                'wheelchairAndHarness'  // Cadeiras de rodas e cintos de suporte traseiro
            ],
            walkingAndRestraint: [
                'collarAndHarness',     // Coleiras e peitorais
                'leash',                // Guias comuns e retráteis
                'muzzle'                // Focinheiras
            ],
            habitatAndTransport: [
                'carrierBox',           // Caixas de transporte (padrão IATA, etc.)
                'bedAndMat',            // Camas, colchonetes, tocas
                'cageAndTerrarium'      // Gaiolas (aves), terrários (exóticos)
            ],
            feedingUtensil: [
                'bowlAndFeeder',        // Comedouros convencionais e bebedouros
                'waterFountain',        // Fontes de água elétricas (vital para gatos)
                'slowFeeder'            // Comedouros lentos/interativos
            ],
            toyAndEnrichment: [
                'chewToy',              // Brinquedos de destruição/roer
                'plushToy',             // Pelúcias
                'interactiveToy',       // Brinquedos cognitivos (KONG, quebra-cabeças)
                'scratchingPost'        // Arranhadores para gatos
            ],
            clothingAndWearable: [
                'clothes',              // Roupas de frio, capas de chuva
                'shoesAndSocks',        // Sapatos, meias antiderrapantes
                'bandanaAndBow'         // Bandanas e laços
            ]
        },

        /** 6. AMBIENTE E SANEAMENTO (Biosegurança e Casa do Tutor) */
        environmentAndSanitation: {
            wasteManagement: [
                'trainingPad',          // Tapetes higiênicos
                'catLitter',            // Areia para gatos (sílica, madeira, bentonita)
                'wasteBag',             // Cata-caca (saquinhos)
                'odorNeutralizer'       // Eliminadores de odor e removedores de manchas
            ],
            facilitySanitizer: [
                'hospitalDisinfectant', // Desinfetantes clínicos (Quaternário de amônia)
                'enzymaticCleaner',     // Detergentes enzimáticos para instrumentais
                'chemicalSterilant'     // Soluções esterilizantes a frio (Glutaraldeído)
            ],
            environmentalPestControl: [
                'environmentalInsecticide', // Sprays de ambiente contra pulgas/carrapatos
                'repellent'                 // Repelentes ultrassônicos ou sprays de citronela
            ]
        },

        /** 7. EQUIPAMENTOS E INSTRUMENTAIS CLÍNICOS (Ativos do Hospital) */
        equipmentAndInstrument: {
            surgicalInstrument: [
                'forcepsAndScissor',    // Pinças, tesouras
                'needleHolder',         // Porta-agulhas
                'retractor'             // Afastadores
            ],
            diagnosticDevice: [
                'stethoscope',          // Estetoscópios
                'thermometer',          // Termômetros
                'otoscopeAndOphthalmoscope', // Otoscópios, oftalmoscópios
                'glucometer'            // Glicosímetros veterinários
            ]
        }
    }
} as const;

export const PRODUCT_CLASSIFICATION_AXES = [
    {
        id: 'origin',
        values: [
            /** Medicamento convencional químico (sintético/analítico) */
            'allopathic',
            /** Medicamento de origem exclusivamente vegetal (plantas medicinais) */
            'phytotherapeutic',
            /** Medicamento baseado em substâncias diluídas/dinamizadas */
            'homeopathic',
            /** Produtos derivados de organismos vivos (vacinas, soros, anticorpos) */
            'biological'
        ]
    },
    {
        id: 'commercial',
        values: [
            /** Medicamento inovador registrado pelo laboratório criador da molécula */
            'reference',
            /** Equivalente de referência, sem nome comercial (apenas o princípio ativo) */
            'generic',
            /** Equivalente com marca própria e características físicas próprias */
            'similar',
            /** Medicamento feito sob medida em farmácia de manipulação veterinária */
            'compounded',
            /** Insumos, alimentos e acessórios que não se enquadram como medicamentos */
            'nonApplicable'
        ]
    },
    {
        id: 'therapeuticAction',
        values: [
            /** Destinado à prevenção de patologias e infestações (vacinas, vermífugos) */
            'prophylactic',
            /** Destinado à eliminação da causa ativa de uma doença (antibióticos) */
            'curative',
            /** Focado no alívio de sintomas e dor em quadros terminais ou sem cura */
            'palliative',
            /** Medicamentos de uso contínuo para gerenciar enfermidades crônicas */
            'control'
        ]
    }
] as const;

const PRODUCT_RUNTIME_TYPE_TREE: CatalogTypeTree = PRODUCT_TYPE_TREE;

export const PRODUCT_PHARMACEUTICAL_FORMS = [
    // Sólidos e Semi-sólidos Orais
    'tablet',            // Comprimido convencional
    'palatableTablet',   // Comprimido palatável/mastigável (altamente comum na veterinária)
    'capsule',           // Cápsula (inclui gelatinosas e duras)
    'powder',            // Pó / Grânulos / Sachês (ex: probióticos, suplementos)

    // Líquidos Orais e Injetáveis
    'oralSuspension',    // Suspensão ou solução oral (gotas, xaropes)
    'injectableSolution',// Soluções, suspensões e emulsões injetáveis (frascos-ampola, ampolas)

    // Aplicação Cutânea / Dermatológica
    'spotOn',            // Pipetas de aplicação direta na pele do pescoço/nuca
    'pourOn',            // Líquidos aplicados na linha dorsal (crucial para bovinos, ovinos e equinos)
    'ointmentOrCream',   // Cremes, pomadas, pastas e géis (para uso dermatológico, oftálmico ou ótico)
    'solution',          // Soluções líquidas de uso geral (colírios, sprays, loções, soluções otológicas)

    // Higiene e Cosmética
    'shampoo',           // Shampoos medicinais ou cosméticos
    'soapOrBar',         // Sabonetes em barra ou líquidos

    // Acessórios, Dispositivos e Outros
    'collar',            // Coleiras (parasitárias ou de passeio)
    'feedOrKibble',      // Alimentos, rações secas/úmidas, petiscos e sachês alimentares
    'deviceOrConsumable',// Insumos físicos (seringas, agulhas, equipos, gazes, fios de sutura)
    'nonApplicable'      // Outros produtos que não possuem uma forma farmacêutica clássica
] as const;

export const PRODUCT_ADMINISTRATION_ROUTES = [
    'oral',              // Via oral (boca, ingestão direta ou misturado ao alimento)
    'intravenous',       // Via intravenosa / endovenosa (direto na corrente sanguínea)
    'intramuscular',     // Via intramuscular (aplicação no tecido muscular)
    'subcutaneous',      // Via subcutânea (sob a pele do animal)
    'topical',           // Via tópica / cutânea (aplicado sobre a pele externa)
    'otic',              // Via ótica / auricular (aplicado no conduto auditivo)
    'ophthalmic',        // Via oftálmica (aplicado na superfície do olho ou saco conjuntival)
    'intranasal',        // Via intranasal (aplicação por spray/gotas nas narinas - comum em certas vacinas)
    'epidural',          // Via epidural (bloqueios anestésicos no canal espinhal)
    'intraarticular',    // Via intra-articular (infiltrações diretamente nas articulações)
    'inhaled',           // Via inalatória / nebulização (aerossóis e bombinhas de asma)
    'rectal',            // Via retal (enemas, supositórios, diazepam de emergência)
    'nonApplicable'      // Não aplicável (para rações, shampoos de uso livre, coleiras comuns ou insumos cirúrgicos)
] as const;

export type ProductTypeTree = typeof PRODUCT_TYPE_TREE;
export type ProductTypeMain = keyof ProductTypeTree['product'] & string;
export type ProductTypeSubtype<TMain extends ProductTypeMain> = keyof ProductTypeTree['product'][TMain] & string;
export type ProductTypeDetail<TMain extends ProductTypeMain, TSubtype extends ProductTypeSubtype<TMain>> = ProductTypeTree['product'][TMain][TSubtype] extends readonly string[] ? ProductTypeTree['product'][TMain][TSubtype][number] : never;
export type ProductTypeTuple<TMain extends ProductTypeMain = ProductTypeMain> = Extract<CatalogTypeTuple<ProductTypeTree>, readonly ['product', TMain, string | null, string | null]>;
export type ProductType = ProductTypeTuple;
export type ProductTreatmentKind = 'vaccine' | 'antiparasitic';
export type ProductCompositionOrigin = (typeof PRODUCT_CLASSIFICATION_AXES)[0]['values'][number];
export type ProductCommercialCategory = (typeof PRODUCT_CLASSIFICATION_AXES)[1]['values'][number];
export type ProductTherapeuticAction = (typeof PRODUCT_CLASSIFICATION_AXES)[2]['values'][number];
export type ProductPharmaceuticalForm = (typeof PRODUCT_PHARMACEUTICAL_FORMS)[number];
export type ProductAdministrationRoute = (typeof PRODUCT_ADMINISTRATION_ROUTES)[number];
export type ProductSpecies = TreatmentSpecies;
export type ProductCatalogOrigin = CatalogEntityOrigin;

export interface ProductCommercialTherapeuticClassification {
	compositionOrigin: ProductCompositionOrigin | null;
	commercialCategory: ProductCommercialCategory | null;
	therapeuticAction: ProductTherapeuticAction | null;
}

export interface ProductFormClassification {
	pharmaceuticalForm: ProductPharmaceuticalForm | null;
	administrationRoutes: ProductAdministrationRoute[];
	presentationDosage: string | null;
}

export interface ProductRegulatoryIdentifiers {
	brazilMapa: string | null;
	unitedStatesNada: string | null;
	unitedStatesAnada: string | null;
	gtinEan: string | null;
}

export interface ProductTargetSpeciesClassification {
	warnings: string[];
}

export interface ProductClassification {
	commercialTherapeutic: ProductCommercialTherapeuticClassification;
	formAndAdministration: ProductFormClassification;
	targetSpecies: ProductTargetSpeciesClassification;
	regulatoryIdentifiers: ProductRegulatoryIdentifiers;
}

export const PRODUCT_TYPES = catalogTypesFromTree(PRODUCT_TYPE_TREE) as ProductType[];

export function productTypeOptions<TMain extends ProductTypeMain>(main: TMain): readonly ProductTypeSubtype<TMain>[] {
	return catalogTypeSubcategoryOptions(PRODUCT_TYPE_TREE, 'product', main) as readonly ProductTypeSubtype<TMain>[];
}

export function productType<TMain extends ProductTypeMain, TSubtype extends ProductTypeSubtype<TMain>>(
	main: TMain,
	subtype: TSubtype,
	detail: ProductTypeDetail<TMain, TSubtype> | null = null
): ProductTypeTuple<TMain> {
	const candidate = ['product', main, subtype, detail] as const;
	if (!isCatalogType(candidate, PRODUCT_RUNTIME_TYPE_TREE)) throw new Error('product_type_invalid');
	return candidate as unknown as ProductTypeTuple<TMain>;
}

export function productTypeDetailOptions<TMain extends ProductTypeMain, TSubtype extends ProductTypeSubtype<TMain>>(main: TMain, subtype: TSubtype): readonly ProductTypeDetail<TMain, TSubtype>[] {
	return catalogTypeDetailOptions(PRODUCT_TYPE_TREE, 'product', main, subtype) as readonly ProductTypeDetail<TMain, TSubtype>[];
}

export function productTypeMain(type: ProductType): ProductTypeMain {
	return catalogTypeCategory(type) as ProductTypeMain;
}

export function productTypeSubtype<TMain extends ProductTypeMain>(type: ProductTypeTuple<TMain>): ProductTypeTuple<TMain>[2] {
	return catalogTypeSubcategory(type) as ProductTypeTuple<TMain>[2];
}

export function productTypeDetail<TMain extends ProductTypeMain>(type: ProductTypeTuple<TMain>): ProductTypeTuple<TMain>[3] | null {
	return catalogTypeDetail(type) as ProductTypeTuple<TMain>[3] | null;
}

export function productTypeForTreatmentKind(kind: ProductTreatmentKind): ProductTypeTuple<'medication'> {
	if (kind === 'vaccine') return productType('medication', 'biologicalAndImmunological', 'vaccine');
	return productType('medication', 'antiparasitic', null);
}

export function productTreatmentKind(type: ProductType): ProductTreatmentKind | null {
	if (productTypeMain(type) !== 'medication') return null;
	const subtype = productTypeSubtype(type as ProductTypeTuple<'medication'>);
	const detail = productTypeDetail(type as ProductTypeTuple<'medication'>);
	if (detail === 'vaccine') return 'vaccine';
	if (subtype === 'antiparasitic') return 'antiparasitic';
	return null;
}

export function productTypeMatchesTreatmentKind(type: ProductType, kind: ProductTreatmentKind): boolean {
	return productTreatmentKind(type) === kind;
}

export function isProductType(value: unknown): value is ProductType {
	return isCatalogType(value, PRODUCT_TYPE_TREE);
}

export function parseProductType(value: string): ProductType {
	try {
		return parseCatalogType(value, PRODUCT_TYPE_TREE) as ProductType;
	} catch {
		throw new Error('product_type_invalid');
	}
}

export function stringifyProductType(type: ProductType): string {
	return stringifyCatalogType(type);
}

export const productLeafletSectionIds = [
	'about',
	'presentations',
	'indications',
	'administration',
	'interactions',
	'pharmacology',
	'studies',
	'videos',
	'distributors',
	'references'
] as const;

export type ProductLeafletSectionId = (typeof productLeafletSectionIds)[number];

export type ProductLeafletSections = Partial<Record<ProductLeafletSectionId, string>>;

export interface ProductCatalogExtension {
	classification: ProductClassification;
	commercialLine: string | null;
	sections: ProductLeafletSections;
}

export const defaultProductSpecies = [...defaultTreatmentSpecies];
export const emptyProductCommercialTherapeuticClassification: ProductCommercialTherapeuticClassification = {
	compositionOrigin: null,
	commercialCategory: null,
	therapeuticAction: null
};
export const emptyProductFormClassification: ProductFormClassification = {
	pharmaceuticalForm: null,
	administrationRoutes: [],
	presentationDosage: null
};
export const emptyProductTargetSpeciesClassification: ProductTargetSpeciesClassification = {
	warnings: []
};
export const emptyProductRegulatoryIdentifiers: ProductRegulatoryIdentifiers = {
	brazilMapa: null,
	unitedStatesNada: null,
	unitedStatesAnada: null,
	gtinEan: null
};
export const emptyProductCatalogExtension: ProductCatalogExtension = {
	classification: {
		commercialTherapeutic: emptyProductCommercialTherapeuticClassification,
		formAndAdministration: emptyProductFormClassification,
		targetSpecies: emptyProductTargetSpeciesClassification,
		regulatoryIdentifiers: emptyProductRegulatoryIdentifiers
	},
	commercialLine: null,
	sections: {}
};

export interface ProductCatalogMetadata {
	type: ProductType;
	aliases: string[];
	manufacturerId: string | null;
	manufacturerName: string | null;
	activeIngredientIds: string[];
	origin: ProductCatalogOrigin;
	regions: string[];
	species: ProductSpecies[];
	extension: ProductCatalogExtension;
}

export interface ProductCatalogItem extends CatalogEntityBase<ProductType, ProductCatalogExtension> {
	species: ProductSpecies[];
	manufacturerId: string | null;
	manufacturerName: string | null;
	activeIngredientIds: string[];
	activeIngredients: ActiveIngredientCatalogItem[];
}

export function canEditProductCatalogItem(item: Pick<ProductCatalogMetadata, 'origin'>): boolean {
	return item.origin === 'user';
}

export function canDeleteProductCatalogItem(item: Pick<ProductCatalogMetadata, 'origin'>): boolean {
	return canEditProductCatalogItem(item);
}

export function normalizeProductSpecies(values: readonly string[] | null | undefined): ProductSpecies[] {
	return normalizeTreatmentSpecies(values);
}

export function parseProductSpecies(value: string | null | undefined): ProductSpecies[] {
	return parseTreatmentSpecies(value);
}

export function stringifyProductSpecies(values: readonly string[] | null | undefined): string {
	return stringifyTreatmentSpecies(values);
}

/**
 * Normalizes product markets as unique ISO 3166-1 alpha-3 country codes.
 */
export function normalizeProductRegions(values: readonly string[] | null | undefined): string[] {
	return normalizeCatalogRegions(values);
}

export function parseProductRegions(value: string | null | undefined): string[] {
	return parseCatalogRegions(value);
}

export function stringifyProductRegions(values: readonly string[] | null | undefined): string {
	return stringifyCatalogRegions(values);
}

export function normalizeCatalogAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	return normalizeBaseCatalogAliases(values, maxLength, normalize, canonicalNormalizedName);
}

export function parseCatalogAliases(value: string | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	return parseBaseCatalogAliases(value, maxLength, normalize, canonicalNormalizedName);
}

export function stringifyCatalogAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string {
	return stringifyBaseCatalogAliases(values, maxLength, normalize, canonicalNormalizedName);
}

export function productItemMatchesSpecies(species: readonly ProductSpecies[], petSpecies: string | null | undefined): boolean {
	if (!isTreatmentSpecies(petSpecies)) return true;
	return species.includes(petSpecies);
}

export function productItemMatchesSearch(name: string, aliases: readonly string[], query: string, normalize: (value: string) => string): boolean {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) return true;
	if (normalize(name).includes(normalizedQuery)) return true;
	return aliases.some((alias) => normalize(alias).includes(normalizedQuery));
}

function normalizedLeafletSections(value: unknown): ProductLeafletSections {
	return normalizedSectionTexts(value, productLeafletSectionIds);
}

function normalizedProductOption<TOption extends string>(value: unknown, options: readonly TOption[]): TOption | null {
	if (typeof value !== 'string') return null;
	return (options as readonly string[]).includes(value) ? (value as TOption) : null;
}

function normalizedProductOptionList<TOption extends string>(value: unknown, options: readonly TOption[]): TOption[] {
	if (!Array.isArray(value)) return [];

	const normalized: TOption[] = [];
	for (const item of value) {
		const option = normalizedProductOption(item, options);
		if (option && !normalized.includes(option)) normalized.push(option);
	}
	return normalized;
}

function normalizedTextList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	const normalized: string[] = [];
	for (const item of value) {
		const text = normalizedNullableText(item);
		if (text && !normalized.includes(text)) normalized.push(text);
	}
	return normalized;
}

export function normalizeProductFormClassification(value: unknown): ProductFormClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductFormClassification, administrationRoutes: [] };

	const source = value as Record<string, unknown>;
	return {
		pharmaceuticalForm: normalizedProductOption(source.pharmaceuticalForm, PRODUCT_PHARMACEUTICAL_FORMS),
		administrationRoutes: normalizedProductOptionList(source.administrationRoutes, PRODUCT_ADMINISTRATION_ROUTES),
		presentationDosage: normalizedNullableText(source.presentationDosage)
	};
}

export function normalizeProductCommercialTherapeuticClassification(value: unknown): ProductCommercialTherapeuticClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductCommercialTherapeuticClassification };

	const source = value as Record<string, unknown>;
	return {
		compositionOrigin: normalizedProductOption(source.compositionOrigin, PRODUCT_CLASSIFICATION_AXES[0].values),
		commercialCategory: normalizedProductOption(source.commercialCategory, PRODUCT_CLASSIFICATION_AXES[1].values),
		therapeuticAction: normalizedProductOption(source.therapeuticAction, PRODUCT_CLASSIFICATION_AXES[2].values)
	};
}

export function normalizeProductTargetSpeciesClassification(value: unknown): ProductTargetSpeciesClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { warnings: [] };

	const source = value as Record<string, unknown>;
	return {
		warnings: normalizedTextList(source.warnings)
	};
}

export function normalizeProductRegulatoryIdentifiers(value: unknown): ProductRegulatoryIdentifiers {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductRegulatoryIdentifiers };

	const source = value as Record<string, unknown>;
	return {
		brazilMapa: normalizedNullableText(source.brazilMapa),
		unitedStatesNada: normalizedNullableText(source.unitedStatesNada),
		unitedStatesAnada: normalizedNullableText(source.unitedStatesAnada),
		gtinEan: normalizedNullableText(source.gtinEan)
	};
}

export function normalizeProductClassification(value: unknown): ProductClassification {
	if (!value || typeof value !== 'object') {
		return {
			commercialTherapeutic: { ...emptyProductCommercialTherapeuticClassification },
			formAndAdministration: { ...emptyProductFormClassification, administrationRoutes: [] },
			targetSpecies: { warnings: [] },
			regulatoryIdentifiers: { ...emptyProductRegulatoryIdentifiers }
		};
	}

	const source = value as Record<string, unknown>;
	return {
		commercialTherapeutic: normalizeProductCommercialTherapeuticClassification(source.commercialTherapeutic),
		formAndAdministration: normalizeProductFormClassification(source.formAndAdministration),
		targetSpecies: normalizeProductTargetSpeciesClassification(source.targetSpecies),
		regulatoryIdentifiers: normalizeProductRegulatoryIdentifiers(source.regulatoryIdentifiers)
	};
}

export function normalizeProductCatalogExtension(value: unknown): ProductCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizeProductClassification(source.classification),
		commercialLine: normalizedNullableText(source.commercialLine),
		sections: normalizedLeafletSections(source.sections)
	};
}

export function parseProductCatalogExtension(value: string | null | undefined): ProductCatalogExtension {
	if (!value) return { ...emptyProductCatalogExtension, sections: {} };

	try {
		return normalizeProductCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyProductCatalogExtension, sections: {} };
	}
}

export function stringifyProductCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeProductCatalogExtension(value));
}
