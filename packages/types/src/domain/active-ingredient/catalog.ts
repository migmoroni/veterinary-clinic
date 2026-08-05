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
} from '@vet/types/domain/catalog/catalog-entity.js';
import { emptyActiveIngredientClassification, normalizeActiveIngredientClassification, type ActiveIngredientClassification } from '@vet/types/domain/active-ingredient/classification.js';
import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
import { normalizeTreatmentName } from '@vet/types/domain/treatment/treatment.js';

/**
 * Árvore hierárquica de Princípios Ativos (Entidade química/farmacológica pura).
 * - Nível 1: Princípio Ativo (Entidade)
 * - Nível 2: Classe Farmacológica (Chave)
 * - Nível 3: Subclasse Farmacológica (Valores do Array)
 * - Nível 4: Tipo de Ação Farmacológica (Propriedade)
 */

export const ACTIVE_INGREDIENT_TYPE_TREE = {
    activeIngredient: {
        /** * 1. ANTI-INFECCIOSOS 
         * Alvos fora do hospedeiro (destroem a estrutura de organismos invasores)
         */
        antiInfective: {
			// Destroem parede, ribossomos ou DNA bacteriano
            antibacterial: [
				'betaLactams',           // Inibem parede celular (Penicilinas, Cefalosporinas, Carbapenêmicos)
                'fluoroquinolones',      // Inibem DNA girase (Enrofloxacina, Ciprofloxacina)
                'macrolides',            // Inibem ribossomo 50S (Azitromicina, Eritromicina)
                'aminoglycosides',       // Inibem ribossomo 30S (Gentamicina, Amicacina, Neomicina)
                'tetracyclines',         // Inibem ribossomo 30S (Doxiciclina, Oxitetraciclina)
                'sulfonamides',          // Inibem síntese de folato (Sulfametoxazol, Sulfadiazina)
                'diaminopyrimidines',    // Potencializadores de sulfas (Trimetoprima)
                'lincosamides',          // Inibem ribossomo 50S (Clindamicina)
                'amphenicols',           // Inibem ribossomo 50S (Cloranfenicol, Florfenicol)
                'nitroimidazoles',       // Rompem DNA de anaeróbios e protozoários (Metronidazol)
                'polypeptides'           // Rompem membrana celular (Bacitracina, Polimixina B)
			],
			// Destroem a membrana celular fúngica (ergosterol)
            antifungal: [
				'azoles',                // Inibem síntese de ergosterol (Cetoconazol, Itraconazol, Fluconazol)
                'polyenes',              // Ligam-se ao ergosterol formando poros (Anfotericina B, Nistatina)
                'allylamines',           // Inibem esqualeno epoxidase (Terbinafina)
                'echinocandins',         // Inibem síntese da parede celular beta-glucana (Caspofungina)
                'griseofulvin'           // Interrompe o fuso mitótico do fungo (Griseofulvina)
			],
			// Inibem a replicação ou transcriptase viral
            antiviral: [
				'nucleosideAnalogs',     // Falsos nucleotídeos que travam o DNA viral (Aciclovir, Zidovudina/AZT)
                'neuraminidaseInhibitors'// Impedem a liberação do vírus (Oseltamivir)
			],
			// Paralisam ou matam protozoários, helmintos e ectoparasitas
            antiparasitic: [
				// Focados em Ectoparasitas e Nematódeos
                'macrocyclicLactones',   // Modulam canais de cloreto (Ivermectina, Moxidectina, Selamectina)
                'isoxazolines',          // Bloqueiam receptores GABA em artrópodes (Fluralaner, Afoxolaner)
                'phenylpyrazoles',       // Bloqueiam GABA em artrópodes (Fipronil)
                'pyrethroids',           // Modulam canais de sódio causando paralisia (Permetrina, Deltametrina)
                'neonicotinoids',        // Agonistas nicotínicos em insetos (Imidacloprid, Nitenpiram)
                'formamidines',          // Agonistas octopaminérgicos (Amitraz)
                
                // Focados em Endoparasitas (Vermes e Protozoários)
                'benzimidazoles',        // Ligam-se à tubulina, destruindo o citoesqueleto do verme (Fenbendazol)
                'tetrahydropyrimidines', // Paralisia espástica do verme (Pirantel, Morantel)
                'isoquinolones',         // Aumentam permeabilidade ao cálcio no verme (Praziquantel)
                'imidazothiazoles',      // Agonistas colinérgicos (Levamisol)
                'triazines',             // Atacam o apicoplasto de protozoários (Toltrazuril, Ponazuril)
                'piroplasmides'          // Ligam-se ao DNA do protozoário (Imidocarb, Diminazeno)
			]
        },

        /** * 2. MODULADORES DE RECEPTORES 
         * Ligam-se aos receptores celulares do hospedeiro alterando a via de sinalização
         */
        receptorModulator: {
			// Ativação máxima do receptor (Ex: Morfina, Adrenalina)
            fullAgonist: [
				'opioidMuAgonist',             // Agonistas puros de dor (Morfina, Metadona, Fentanil)
                'alphaAdrenergicAgonist',      // Sedativos profundos e vasopressores (Xilazina, Dexmedetomidina, Adrenalina)
                'betaAdrenergicAgonist',       // Broncodilatadores e inotrópicos (Salbutamol, Dobutamina)
                'cholinergicMuscarinicAgonist',// Estimulantes parassimpáticos (Betanecol, Pilocarpina)
                'dopaminergicAgonist'          // Estimulantes dopaminérgicos (Apomorfina)
			],
			// Ativação com efeito teto/parcial (Ex: Buprenorfina, Butorfanol)
            partialAgonist: [
				'opioidPartialAgonist',        // Agonistas com efeito "teto" (Buprenorfina)
                'mixedOpioidAgonistAntagonist' // Agoniza um subtipo e bloqueia outro (Butorfanol: Agonista Kappa / Antagonista Mu)
			],
			// Bloqueio do receptor (Ex: Naloxona, Atipamezol)
            antagonist: [
				'opioidAntagonist',            // Reversores puros (Naloxona)
                'alphaAdrenergicAntagonist',   // Reversores de sedação e vasodilatadores (Atipamezol, Prazosina)
                'betaAdrenergicAntagonist',    // Betabloqueadores cardíacos (Atenolol, Propranolol)
                'muscarinicAntagonist',        // Anticolinérgicos clássicos (Atropina, Escopolamina, Tropicamida)
                'dopaminergicAntagonist',      // Antieméticos e tranquilizantes (Metoclopramida, Acepromazina)
                'histamineH1Antagonist',       // Antialérgicos clássicos (Difenidramina, Prometazina)
                'histamineH2Antagonist',       // Bloqueadores gástricos (Ranitidina, Famotidina)
                'serotonergicAntagonist',      // Antieméticos e estimulantes de apetite (Ondansetrona, Mirtazapina)
                'nk1ReceptorAntagonist',       // Bloqueadores da substância P / Antieméticos potentes (Maropitant)
                'angiotensinReceptorBlocker',  // Bloqueadores de receptores AT1 / Anti-hipertensivos (Telmisartana, Losartana)
                'nmdaReceptorAntagonist'       // Anestésicos dissociativos / Antagonistas não competitivos (Cetamina, Tiletamina)
			],
			// Alteração da afinidade do receptor por ligação em sítio paralelo (Ex: Diazepam)
            allostericModulator: [
				'gabaPositiveAllosteric',      // Potencializadores do GABA sem ligar no sítio principal (Diazepam, Midazolam, Fenobarbital)
                'calciumSensingReceptorModulator' // Moduladores da glândula paratireoide (Cinacalcete)
			]
        },

        /** * 3. MODULADORES ENZIMÁTICOS 
         * Atuam sobre proteínas catalíticas alterando a velocidade de reações químicas
         */
        enzymeModulator: {
			// Suprime a atividade catalítica (Ex: Inibidores da COX, IECA)
            enzymeInhibitor: [
				'cyclooxygenaseInhibitor',              // AINEs clássicos / Inibidores da COX (Meloxicam, Carprofeno, Dipirona)
                'angiotensinConvertingEnzymeInhibitor', // Inibidores da ECA / IECA (Enalapril, Benazepril)
                'phosphodiesteraseInhibitor',           // Inibidores da PDE (Pimobendan, Sildenafil, Teofilina)
                'tyrosineKinaseInhibitor',              // Inibidores da Tirosina Quinase / Oncologia (Toceranibe, Masitinibe)
                'cholinesteraseInhibitor',              // Inibidores da Colinesterase (Neostigmina, Piridostigmina)
                'monoamineOxidaseInhibitor',            // Inibidores da MAO / Neurologia (Selegilina)
                'carbonicAnhydraseInhibitor',           // Inibidores da Anidrase Carbónica / Oftalmologia (Dorzolamida)
                'xanthineOxidaseInhibitor',             // Inibidores da Xantina Oxidase / Urinário (Alopurinol)
                'steroidogenesisInhibitor'              // Inibidores da Esteroidogénese (Trilostano, Ketoconazol em altas doses)
			],
			// Estimula diretamente a atividade catalítica
            enzymeActivator: [
				'guanylateCyclaseActivator',            // Ativadores da Guanilato Ciclase (Riociguate - uso hipertenso raro)
                'adenylateCyclaseActivator'             // Ativadores da Adenilato Ciclase (Forskolina)
			],
			// Desliga compostos tóxicos de enzimas paralisadas (Ex: Pralidoxima)
            enzymeReactivator: [
				'cholinesteraseReactivator'             // Antídotos toxicológicos (Pralidoxima, Contrathion)
			]
        },

        /** * 4. MODULADORES DE CANAIS IÔNICOS
         * Fármacos que ocluem ou abrem poros transmembrana (sódio, cálcio, potássio)
         */
        ionChannelModulator: {
			// Oclui fisicamente o poro (Ex: Lidocaína, Anlodipino)
            ionChannelBlocker: [
				'voltageGatedSodiumChannelBlocker',     // Bloqueadores de Sódio (Lidocaína, Bupivacaína, Procainamida)
                'voltageGatedCalciumChannelBlocker',    // Bloqueadores de Cálcio (Anlodipino, Diltiazem, Verapamil)
                'voltageGatedPotassiumChannelBlocker'   // Bloqueadores de Potássio / Antiarrítmicos (Amiodarona, Sotalol)
			],
			// Mantém o poro na conformação aberta (Ex: Diazóxido)
            ionChannelOpener: [
				'atpSensitivePotassiumChannelOpener'    // Abridores de Canais de Potássio (Diazóxido - vital para insulinomas)
			]
        },

        /** * 5. MODULADORES DE TRANSPORTADORES
         * Moléculas que inibem bombas, cotransportadores ou carreadores de recaptação
         */
        transporterModulator: {
			// Inibe bombas ativas gastadoras de ATP (Ex: Omeprazol, Digoxina)
            ionPumpInhibitor: [
				'protonPumpInhibitor',               // Inibidores da bomba de prótons H+/K+ (Omeprazol, Pantoprazol)
                'sodiumPotassiumATPaseInhibitor'     // Inibidores da bomba de Na+/K+ / Glicosídeos cardíacos (Digoxina)
			],
			// Inibe o recolhimento de neurotransmissores (Ex: Fluoxetina)
            reuptakeInhibitor: [
				'selectiveSerotoninReuptakeInhibitor', // ISRS (Fluoxetina, Sertralina, Paroxetina)
                'serotoninNorepinephrineReuptakeInhibitor', // ISN (Duloxetina, Venlafaxina)
                'mixedMonoamineReuptakeInhibitor',     // Antidepressivos Tricíclicos clássicos (Clomipramina, Amitriptilina)
                'dopamineReuptakeInhibitor'            // Inibidores de recaptação de dopamina (Metilfenidato)
			],
			// Inibe carreadores acoplados/permutadores (Ex: Furosemida)
            symporterAndAntiporterInhibitor: [
				'naK2ClSymporterInhibitor',          // Diuréticos de alça (Furosemida, Torasemida)
                'naClSymporterInhibitor',            // Diuréticos tiazídicos (Hidroclorotiazida)
                'sglt2Inhibitor'                     // Inibidores do cotransportador de glicose renal (Dapagliflozina - uso emergente em gatos)
			]
        },

        /** * 6. HORMÔNIOS E ANÁLOGOS ESTRUTURAIS
         * Moléculas administradas como reposição exata ou mimetismo endócrino suprafisiológico.
         * Divididas estritamente pela sua natureza bioquímica.
         */
        hormone: {
			// Estruturas proteicas/cadeias polipeptídicas (Ex: Insulina, Ocitocina)
            peptideAndProteinHormone: [
				'insulinAndAnalog',                  // Cadeias peptídicas pancreáticas (Insulina NPH, Glargina, Regular)
                'posteriorPituitaryHormone',         // Peptídeos da neurohipófise (Ocitocina, Desmopressina/Vasopressina)
                'hypothalamicReleasingHormone',      // Análogos do GnRH (Deslorelina - implantes para castração química)
                'glycoproteinHormone'                // Hormônios glicoproteicos grandes (Eritropoietina/EPO, hCG)
			],
			// Estruturas derivadas do colesterol/ciclopentanoperidrofenantreno (Ex: Prednisolona)
            steroidHormone: [
				'glucocorticoid',                    // Esteroides de resposta ao estresse e inflamação (Prednisolona, Dexametasona)
                'mineralocorticoid',                 // Esteroides retentores de sódio (DOCP, Fludrocortisona)
                'progestogen',                       // Hormônios da gestação (Progesterona, Acetato de Megestrol)
                'androgen',                          // Hormônios masculinizantes (Testosterona, Estanozolol)
                'estrogen'                           // Hormônios feminilizantes (Estriol - usado para incontinência urinária)
			],
			// Pequenas moléculas derivadas de aminoácidos únicos (Ex: Levotiroxina)
            amineDerivativeHormone: [
				'thyroidHormone',                    // Derivados iodados da tirosina (Levotiroxina/T4, Liotironina/T3)
                'indoleamineHormone'                 // Derivados do triptofano (Melatonina)
			]
        },

        /** * 7. CITOTÓXICOS (Venenos Celulares Estruturais)
         * Moléculas agressivas projetadas para destruir estruturas vitais da célula do hospedeiro.
         * (Nota: Inibidores de quinase oncológicos entram em enzymeModulator, não aqui).
         */
        cytotoxic: {
			// Destroem ou bloqueiam o ADN/ARN celular (Ex: Ciclofosfamida, Doxorrubicina)
            nucleicAcidDamager: [
				'alkylatingAgent',       // Agentes Alquilantes: Fundem as fitas de ADN (Ciclofosfamida, Clorambucil, Lomustina)
                'antimetabolite',        // Antimetabólitos: Falsos nucleótidos que travam a síntese (Citarabina, Metotrexato, 5-Fluorouracil)
                'anthracycline',         // Antraciclinas (Antibióticos antitumorais): Intercalam o ADN e geram radicais livres (Doxorrubicina, Mitoxantrona)
                'platinumCompound'       // Compostos de Platina: Formam pontes metálicas no ADN (Carboplatina, Cisplatina)
			],
			// Desintegram os microtúbulos impedindo a mitose (Ex: Vincristina)
            cytoskeletalDisruptor: [
				'vincaAlkaloid',         // Alcaloides da Vinca: Impedem a formação dos microtúbulos na mitose (Vincristina, Vinblastina)
                'taxane'                 // Taxanos: Congelam/estabilizam os microtúbulos impedindo a separação celular (Paclitaxel)
			]
        },

        /** * 8. BIOLÓGICOS (Macromoléculas de Engenharia)
         * Proteínas gigantes cultivadas in vivo que agem por reconhecimento tridimensional exato.
         */
        biological: {
			// Anticorpos que neutralizam alvos exatos (Ex: Lokivetmab, Bedinvetmab, Frunevetmab)
            monoclonalAntibody: [
				'interleukinInhibitorMab', // Anticorpos anti-interleucina (Ex: Lokivetmab / Cytopoint - bloqueia IL-31 da coceira)
                'ngfInhibitorMab',         // Anticorpos anti-Fator de Crescimento Nervoso (Ex: Bedinvetmab / Librela, Frunevetmab / Solensia)
                'viralNeutralizingMab'     // Anticorpos de neutralização direta (Ex: Anticorpo Monoclonal anti-Parvovírus Canino)
			],
			// Enzimas purificadas para catálise no sangue/tecidos (Ex: L-Asparaginase)
            therapeuticEnzyme: [
				'aminoAcidDepletingEnzyme',// Enzimas que matam o tumor à fome de aminoácidos (Ex: L-Asparaginase)
                'thrombolyticEnzyme'       // Enzimas que dissolvem fibrina/coágulos (Ex: Estreptoquinase, Alteplase - para tromboembolismo felino)
			]
        },

        /** * 9. IMUNOBIOLÓGICOS (Treinadores do Sistema Imune)
         * Antígenos ou anticorpos dados para provocar memória, fornecer defesa imediata ou criar tolerância.
         */
        immunobiological: {
			// Exige trabalho do corpo para criar memória (Ex: Vacinas vivas/inativadas)
            activeImmunogen: [
				'liveAttenuatedVaccine', // Vacinas Vivas Atenuadas: Patógeno enfraquecido (Ex: V10/V8 fração viral, Cinomose, Parvovirose)
                'inactivatedVaccine',    // Vacinas Inativadas/Mortas: Patógeno morto + Adjuvante (Ex: Vacina Antirrábica, Leptospirose)
                'recombinantSubunit',    // Subunidades Recombinantes: Apenas uma proteína do patógeno cultivada (Ex: Vacina FeLV recombinante)
                'toxoid'                 // Toxoides: Toxinas bacterianas inativadas que geram memória (Ex: Toxoide Tetânico)
			],
			// Anticorpos prontos, efeito imediato, sem memória (Ex: Soro hiperimune antiofídico)
            passiveImmunogen: [
				'polyclonalAntiserum',   // Antissoros Policlonais: Soro hiperimune com múltiplos anticorpos (Ex: Soro Antiofídico, Soro Antitetânico)
                'purifiedImmunoglobulin' // Imunoglobulinas Purificadas específicas (Ex: Imunoglobulina anti-Cinomose inyectável)
			],
			// Antígenos crescentes para dessensibilizar alergias (Ex: Imunoterapia ASIT)
            tolerogen: [
				'allergenExtract'        // Extratos Alergénicos: Doses crescentes de antígenos para dessensibilizar (Ex: Imunoterapia ASIT para Atopia)
			]
        },

        /** * 10. AGENTES FÍSICO-QUÍMICOS E INERTES
         * Moléculas que não se ligam a proteínas, agindo pelas leis da física e química básica
         * (osmolaridade, tensão superficial, adsorção mecânica ou pH).
         */
        physicochemicalAgent: {
			// Puxam água por gradiente (Ex: Manitol, Macrogol)
            osmoticAgent: [
				'osmoticDiuretic',       // Puxam água dos tecidos para o sangue via IV (Ex: Manitol - vital para edema cerebral)
                'osmoticCathartic'       // Puxam água para o lúmen intestinal via Oral (Ex: Lactulose, Macrogol / PEG 3350)
			],
			// Doadores/Recetores de H+ (Ex: Bicarbonato de Sódio)
            acidBaseModifier: [
				'systemicAlkalinizer',   // Alcalinizantes Sistêmicos (Ex: Bicarbonato de Sódio IV para acidose metabólica)
                'systemicAcidifier',     // Acidificantes Sistêmicos/Urinários (Ex: Cloreto de Amônio, Metionina)
                'localNeutralizingAntacid'// Antiácidos de neutralização química direta no estômago (Ex: Hidróxido de Alumínio, Hidróxido de Magnésio)
			],
			// Redutores de tensão superficial (Ex: Poloxaleno, Simeticona)
            surfactant: [
				'antifoamingAgent',      // Rompem bolhas de gás/espuma (Ex: Simeticona para gases, Poloxaleno para timpanismo bovino)
                'stoolSurfactant'        // Reduzem a tensão superficial das fezes, misturando-as com água (Ex: Docusato de Sódio)
			],
			// Adesão física a toxinas ou barreiras mecânicas (Ex: Carvão Ativado, Sucralfato)
            physicalAdsorbentAndProtectant: [
				'gastrointestinalAdsorbent', // Pós inertes que aderem a toxinas por pontes de hidrogênio (Ex: Carvão Ativado, Diosmectita, Caulim)
                'mucosalProtectant',         // Polímeros que formam gel/penso sobre úlceras (Ex: Sucralfato)
                'topicalBarrier'             // Barreiras mecânicas cutâneas (Ex: Óxido de Zinco, Petrolato)
			]
        },

        /** * 11. AGENTES QUELANTES E LIGANTES
         * Estruturas que criam ligações químicas diretas com iões ou metais pesados livres.
         */
        chelatingAgent: {
			// Formam anéis de quelação verdadeiros com metais (Ex: EDTA, Penicilamina)
            heavyMetalChelator: [
				'edetateDerivative',    // Derivados do EDTA (Ex: EDTA Cálcico Dissódico - Antídoto para intoxicação por Chumbo)
                'thiolDerivative',      // Compostos com grupo tiol/sulfidrila (Ex: Penicilamina - Vital para acumulação de Cobre no fígado)
                'ironChelator'          // Quelantes de ferro específicos (Ex: Deferoxamina - Para intoxicação por sulfato ferroso)
			],
			// Ligam-se ou trocam iões específicos no lúmen (Ex: Sevelamer, Hidróxido de Alumínio)
            ionBinderAndExchangeResin: [
				'phosphateBinder',      // Quelantes/Ligantes de Fósforo intestinais (Ex: Sevelamer, Carbonato de Lantânio)
                'cationExchangeResin'   // Resinas de troca catiónica (Ex: Poliestirenossulfonato - Baixa o potássio no sangue trocando-o no intestino)
			]
        },

        /** * 12. SUBSTRATOS METABÓLICOS
         * Moléculas, cofatores e blocos inorgânicos consumidos pelas células como peças de reposição ou suporte vital.
         */
        metabolicSubstrate: {
			// Cofatores orgânicos de catálise (Ex: Vitamina K1, Tiamina)
            vitaminAndCofactor: [
				'fatSolubleVitamin',    // Vitaminas Lipossolúveis [A, D, E, K] (Ex: Fitomenadiona/Vitamina K1 - Antídoto para veneno de rato)
                'waterSolubleVitamin',  // Vitaminas Hidrossolúveis [Complexo B e C] (Ex: Tiamina, Cianocobalamina)
                'nonVitaminCofactor'    // Cofatores catalíticos não-vitamínicos (Ex: SAMe / S-adenosilmetionina - Hepatoprotetor intracelular)
			],
			// Elementos inorgânicos puros (Ex: Cloreto de Potássio, Cálcio)
            mineralAndElectrolyte: [
				'macromineralSalt',     // Sais de eletrólitos em grande volume (Ex: Cloreto de Potássio/KCl, Gluconato de Cálcio)
                'traceMineral'          // Microminerais e oligoelementos (Ex: Sulfato de Zinco, Sulfato Ferroso)
			],
			// Fonte calórica e macronutrição parenteral (Ex: Dextrose, Emulsão Lipídica)
            macronutrientAndEnergy: [
				'carbohydrateSubstrate',// Monossacarídeos puros para ATP (Ex: Dextrose 50%, Glicose injetável)
                'lipidEmulsion',        // Emulsões lipídicas parenterais (Ex: Intralipid - Usado em nutrição IV e no protocolo "Lipid Rescue" em toxicologia)
                'aminoAcidSolution'     // Soluções de aminoácidos puros cristalinos (Para nutrição parenteral total)
			],
			// Blocos construtores para matriz extracelular (Ex: Condroitina, Ômega-3)
            structuralPrecursor: [
				'glycosaminoglycanAndAminosugar', // Tijolos da matriz articular e parede vesical (Ex: Condroitina, Glucosamina, Ácido Hialurónico)
                'essentialFattyAcid'              // Precursores de membrana celular e moduladores de eicosanoides (Ex: Ômega 3 - EPA/DHA)
			]
        },

        /** * 13. TERAPIAS DE ÁCIDOS NUCLEICOS
         * Vetores, plasmídeos ou fitas de nucleótidos desenhadas para expressar 
         * ou silenciar código genético diretamente nas células do hospedeiro.
         */
        nucleicAcidTherapy: {
			// Plasmídeos de ADN/vetores virais para expressão (Ex: Vacina de ADN para melanoma)
            recombinantVector: [
				'plasmidDnaVector',         // Plasmídeos de ADN circulares "nus" (Ex: Vacina Oncept para Melanoma Canino)
                'viralVector'               // Vetores virais recombinantes e não-replicantes (Ex: Adenovírus, AAV para terapia génica)
			],
			// Fitas diretas de ARN mensageiro para tradução citoplasmática
            mrnaTranscript: [
				'syntheticMrnaTranscript',  // Fitas de mRNA lineares (Geralmente encapsuladas em nanopartículas lipídicas / LNP)
                'selfAmplifyingMrna'        // mRNA auto-amplificável (saRNA - capacidade de criar cópias de si mesmo no citoplasma)
			],
			// Fitas antissentido/siRNA para bloqueio e degradação de mRNA nativo
            oligonucleotideSilencer: [
				'antisenseOligonucleotide', // ASOs: Fitas simples que se ligam ao mRNA bloqueando a tradução pelos ribossomas
                'smallInterferingRna'       // siRNA: Fitas duplas que ativam o complexo celular RISC para clivar/destruir o mRNA doente
			]
        },

        /** * 14. TERAPIAS CELULARES E HEMODERIVADOS
         * Tratamentos baseados no transplante estrutural de tecidos vivos, células ou frações anucleadas.
         */
        cellularTherapy: {
			// Células vivas nucleadas com capacidade de divisão (Ex: Células-tronco/CTMs)
            stemAndProgenitorCell: [
				'mesenchymalStemCell',      // Células-Tronco Mesenquimais - CTMs (Derivadas de tecido adiposo ou medula, vitais na ortopedia vet)
                'hematopoieticStemCell',    // Células-Tronco Hematopoiéticas (Transplantes de medula)
                'dendriticCell'             // Células Dendríticas ativadas (Imunoterapia oncológica com células do próprio paciente)
			],
			// Células anucleadas e fatores isolados (Ex: Sangue Total, Concentrado de Hemácias, PRP)
            bloodAndPlateletFraction: [
				'wholeBlood',               // Sangue Total (Para perdas agudas de volume e hemorragias severas)
                'packedRedBloodCell',       // Concentrado de Hemácias / Eritrócitos (Apenas os glóbulos vermelhos, para anemia sem perda de volume)
                'freshFrozenPlasma',        // Plasma Fresco Congelado - PFC (Rico em fatores de coagulação, vital para intoxicação por veneno de rato)
                'cryoprecipitate',          // Crioprecipitado (Fração do plasma ultra-concentrada em Fibrinogénio e Fator de von Willebrand)
                'plateletRichPlasma'        // Plasma Rico em Plaquetas - PRP (Libertação de fatores de crescimento para cicatrização de tendões/feridas)
			]
        },

        /** * 15. AGENTES DE DIAGNÓSTICO IN VIVO
         * Substâncias inertes no metabolismo do hospedeiro, usadas estritamente por propriedades 
         * físicas (refração, emissão ou coloração) para exames imagiológicos ou oftálmicos.
         */
        diagnosticAgent: {
			// Metais pesados/halogéneos para absorção de fotões (Ex: Bário, Iohexol)
            radiocontrastMedia: [
				'bariumSulfate',         // Contraste gastrointestinal insolúvel (Ex: Bário)
                'iodinatedContrast',     // Contrastes intravasculares e mielográficos (Ex: Iohexol, Iopamidol)
                'gadoliniumChelate'      // Contraste para ressonância magnética paramagnética (Ex: Gadopentetato)
			],
			// Corantes orgânicos com afinidade por defeitos teciduais (Ex: Fluoresceína, Rosa Bengala)
            diagnosticStain: [
				'fluoresceinDerivative', // Reveladores de úlcera de córnea (Ex: Fluoresceína sódica)
                'vitalDye'               // Corantes para tecidos e glândulas in vivo (Ex: Rosa Bengala, Verde de Indocianina)
			],
			// Isótopos emissores de radiação para mapeamento por cintilografia (Ex: Tecnécio-99m)
            radiopharmaceutical: [
				'technetiumIsotope',     // Cintilografia geral e óssea (Ex: Tecnécio-99m)
                'radioiodine'            // Terapia e mapeamento de tireoide (Ex: Iodo-131)
			]
        }
    }
} as const;

export type ActiveIngredientTypeTree = typeof ACTIVE_INGREDIENT_TYPE_TREE;
export type ActiveIngredientTypeMain = keyof ActiveIngredientTypeTree['activeIngredient'] & string;
export type ActiveIngredientTypeSubtype<TMain extends ActiveIngredientTypeMain> = keyof ActiveIngredientTypeTree['activeIngredient'][TMain] & string;
export type ActiveIngredientTypeDetail<TMain extends ActiveIngredientTypeMain, TSubtype extends ActiveIngredientTypeSubtype<TMain>> =
	ActiveIngredientTypeTree['activeIngredient'][TMain][TSubtype] extends readonly string[] ? ActiveIngredientTypeTree['activeIngredient'][TMain][TSubtype][number] : never;
export type ActiveIngredientType = CatalogTypeTuple<ActiveIngredientTypeTree>;

export const ACTIVE_INGREDIENT_TYPES = catalogTypesFromTree(ACTIVE_INGREDIENT_TYPE_TREE);

export const activeIngredientProfileSectionIds = ['about', 'uses', 'safety', 'references'] as const;
export type ActiveIngredientProfileSectionId = (typeof activeIngredientProfileSectionIds)[number];
export type ActiveIngredientProfileSections = Partial<Record<ActiveIngredientProfileSectionId, string>>;

export interface ActiveIngredientCatalogExtension {
	classification: ActiveIngredientClassification;
	sections: ActiveIngredientProfileSections;
}

export interface ActiveIngredientCatalogItem extends CatalogEntityBase<ActiveIngredientType, ActiveIngredientCatalogExtension> {}

export const emptyActiveIngredientCatalogExtension: ActiveIngredientCatalogExtension = {
	classification: emptyActiveIngredientClassification,
	sections: {}
};

export function activeIngredientType<TMain extends ActiveIngredientTypeMain, TSubtype extends ActiveIngredientTypeSubtype<TMain>>(
	main: TMain,
	subtype: TSubtype,
	detail: ActiveIngredientTypeDetail<TMain, TSubtype> | null = null
): ActiveIngredientType {
	return catalogType(ACTIVE_INGREDIENT_TYPE_TREE, 'activeIngredient', main, subtype, detail) as ActiveIngredientType;
}

export function activeIngredientTypeOptions<TMain extends ActiveIngredientTypeMain>(main: TMain): readonly ActiveIngredientTypeSubtype<TMain>[] {
	return catalogTypeSubcategoryOptions(ACTIVE_INGREDIENT_TYPE_TREE, 'activeIngredient', main) as readonly ActiveIngredientTypeSubtype<TMain>[];
}

export function activeIngredientTypeDetailOptions<TMain extends ActiveIngredientTypeMain, TSubtype extends ActiveIngredientTypeSubtype<TMain>>(
	main: TMain,
	subtype: TSubtype
): readonly ActiveIngredientTypeDetail<TMain, TSubtype>[] {
	return catalogTypeDetailOptions(ACTIVE_INGREDIENT_TYPE_TREE, 'activeIngredient', main, subtype) as readonly ActiveIngredientTypeDetail<TMain, TSubtype>[];
}

export function activeIngredientTypeMain(type: ActiveIngredientType): ActiveIngredientTypeMain {
	return catalogTypeCategory(type) as ActiveIngredientTypeMain;
}

export function activeIngredientTypeSubtype<TMain extends ActiveIngredientTypeMain>(type: ActiveIngredientType): ActiveIngredientTypeSubtype<TMain> | null {
	return catalogTypeSubcategory(type) as ActiveIngredientTypeSubtype<TMain> | null;
}

export function activeIngredientTypeDetail<TMain extends ActiveIngredientTypeMain>(type: ActiveIngredientType): ActiveIngredientType[3] | null {
	return catalogTypeDetail(type);
}

export function parseActiveIngredientType(value: string): ActiveIngredientType {
	return parseCatalogType(value, ACTIVE_INGREDIENT_TYPE_TREE) as ActiveIngredientType;
}

export function stringifyActiveIngredientType(type: ActiveIngredientType): string {
	return stringifyCatalogType(type);
}

export function parseActiveIngredientAliases(value: string | null | undefined, canonicalNormalizedName = ''): string[] {
	return parseCatalogAliases(value, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export function stringifyActiveIngredientAliases(values: readonly string[] | null | undefined, canonicalNormalizedName = ''): string {
	return stringifyCatalogAliases(values, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export const parseActiveIngredientRegions = parseCatalogRegions;
export const stringifyActiveIngredientRegions = stringifyCatalogRegions;

export function normalizeActiveIngredientCatalogExtension(value: unknown): ActiveIngredientCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyActiveIngredientCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizeActiveIngredientClassification(source.classification),
		sections: normalizedSectionTexts(source.sections, activeIngredientProfileSectionIds)
	};
}

export function parseActiveIngredientCatalogExtension(value: string | null | undefined): ActiveIngredientCatalogExtension {
	if (!value) return { ...emptyActiveIngredientCatalogExtension, sections: {} };

	try {
		return normalizeActiveIngredientCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyActiveIngredientCatalogExtension, sections: {} };
	}
}

export function stringifyActiveIngredientCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeActiveIngredientCatalogExtension(value));
}
