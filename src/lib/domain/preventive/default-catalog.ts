import { localizedPreventiveAliases, type PreventiveAliasTranslationKey } from '../../i18n/preventive-aliases/index.js';

export type DefaultPreventiveKind = 'vaccine' | 'antiparasitic';
export type DefaultPreventiveSpecies = 'canine' | 'feline';

export interface DefaultPreventiveCatalogItem {
	kind: DefaultPreventiveKind;
	name: string;
	species: DefaultPreventiveSpecies[];
	aliases: string[];
}

interface PreventiveAliasDefinitions {
	technical?: readonly string[];
	localized?: readonly PreventiveAliasTranslationKey[];
}

function searchAliases({ technical = [], localized = [] }: PreventiveAliasDefinitions): string[] {
	return [...new Set([...technical, ...localizedPreventiveAliases(...localized)])];
}

const polyvalentCanineDiseases: PreventiveAliasTranslationKey[] = [
	'preventiveAlias.canineDistemper',
	'preventiveAlias.infectiousCanineHepatitis',
	'preventiveAlias.canineParainfluenza',
	'preventiveAlias.canineParvovirus'
];

const coreFelineDiseases: PreventiveAliasTranslationKey[] = [
	'preventiveAlias.felineRhinotracheitis',
	'preventiveAlias.felineCalicivirosis',
	'preventiveAlias.felinePanleukopenia'
];

const fleaAndTickControl: PreventiveAliasTranslationKey[] = [
	'preventiveAlias.ectoparasiticide',
	'preventiveAlias.fleaTreatment',
	'preventiveAlias.tickTreatment'
];

/**
 * Products offered when a new database is created. Names are commercial
 * products; aliases describe what each product is or how it is commonly
 * classified. Source-specific spellings and import heuristics belong only to
 * their respective importers.
 */
export const defaultPreventiveCatalogItems: DefaultPreventiveCatalogItem[] = [
	{
		kind: 'vaccine',
		name: 'Nobivac Canine 1-DAPPVL2+CV',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['DAPPVL2+CV'],
			localized: [
				'preventiveAlias.polyvalent',
				'preventiveAlias.canineMultiple',
				'preventiveAlias.canineDistemper',
				'preventiveAlias.canineAdenovirusType2',
				'preventiveAlias.canineCoronavirus',
				'preventiveAlias.canineParainfluenza',
				'preventiveAlias.canineParvovirus',
				'preventiveAlias.canineLeptospirosis'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac DHPPI+L',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['DHPPI+L', 'V 8', 'V8'],
			localized: [
				'preventiveAlias.polyvalent',
				'preventiveAlias.canineMultiple',
				...polyvalentCanineDiseases,
				'preventiveAlias.canineLeptospirosis'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Duramune Max 5-CvK/4L',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['DAPPi+CV+L4', 'V 10', 'V10'],
			localized: [
				'preventiveAlias.polyvalent',
				'preventiveAlias.canineMultiple',
				'preventiveAlias.canineDistemper',
				'preventiveAlias.canineAdenovirusType2',
				'preventiveAlias.canineCoronavirus',
				'preventiveAlias.canineParainfluenza',
				'preventiveAlias.canineParvovirus',
				'preventiveAlias.canineLeptospirosis'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Canigen MHA2PPi/L',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['MHA2PPi/L', 'V 8', 'V8'],
			localized: [
				'preventiveAlias.polyvalent',
				'preventiveAlias.canineMultiple',
				...polyvalentCanineDiseases,
				'preventiveAlias.canineAdenovirusType2',
				'preventiveAlias.canineLeptospirosis'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Imunocan V8',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['V 8', 'V8'],
			localized: [
				'preventiveAlias.polyvalent',
				'preventiveAlias.canineMultiple',
				...polyvalentCanineDiseases,
				'preventiveAlias.canineAdenovirusType2',
				'preventiveAlias.canineCoronavirus',
				'preventiveAlias.canineLeptospirosis'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Versican Plus DHPPi/L4R',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['DHPPi/L4R'],
			localized: [
				'preventiveAlias.polyvalent',
				'preventiveAlias.canineMultiple',
				'preventiveAlias.canineDistemper',
				'preventiveAlias.canineAdenovirusType2',
				'preventiveAlias.canineParainfluenza',
				'preventiveAlias.canineParvovirus',
				'preventiveAlias.canineLeptospirosis',
				'preventiveAlias.rabies'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Puppy DP',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['DP'],
			localized: ['preventiveAlias.puppy', 'preventiveAlias.canineDistemper', 'preventiveAlias.canineParvovirus']
		})
	},
	{
		kind: 'vaccine',
		name: 'GiardiaVax',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.giardia', 'preventiveAlias.giardiasis'] })
	},
	{
		kind: 'vaccine',
		name: 'BronchiGuard',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['Bordetella bronchiseptica'],
			localized: ['preventiveAlias.canineInfectiousTracheobronchitis', 'preventiveAlias.kennelCough']
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Intra-Trac Oral Bb',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['Bb', 'Bordetella bronchiseptica'],
			localized: ['preventiveAlias.canineInfectiousTracheobronchitis', 'preventiveAlias.kennelCough']
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac KC',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['KC', 'Bordetella bronchiseptica'],
			localized: [
				'preventiveAlias.canineInfectiousTracheobronchitis',
				'preventiveAlias.kennelCough',
				'preventiveAlias.canineParainfluenza'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Leish-Tec',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.leishmaniasis', 'preventiveAlias.kalaAzar'] })
	},
	{
		kind: 'vaccine',
		name: 'Eurican Herpes 205',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.canineHerpesvirus'] })
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Raiva',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		name: 'Rabisin',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		name: 'Defensor',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Feline 1-HCP',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'HCP', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Feline 1-HCPCh',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 4', 'V4', 'HCPCh', 'FVRCP+Ch'],
			localized: ['preventiveAlias.felineQuadruple', ...coreFelineDiseases, 'preventiveAlias.felineChlamydiosis']
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Feline 1-HCPCh + FeLV',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 5', 'V5', 'HCPCh+FeLV', 'FVRCP+Ch+FeLV', 'FeLV'],
			localized: [
				'preventiveAlias.felineQuintuple',
				...coreFelineDiseases,
				'preventiveAlias.felineChlamydiosis',
				'preventiveAlias.felineLeukemia'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac L4',
		species: ['canine'],
		aliases: searchAliases({ technical: ['L4'], localized: ['preventiveAlias.canineLeptospirosis'] })
	},
	{
		kind: 'vaccine',
		name: 'Recombitek C6',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['C6', 'V 10', 'V10'],
			localized: ['preventiveAlias.polyvalent', 'preventiveAlias.canineMultiple']
		})
	},
	{
		kind: 'vaccine',
		name: 'Vanguard Plus',
		species: ['canine'],
		aliases: searchAliases({
			technical: ['V 10', 'V10'],
			localized: ['preventiveAlias.polyvalent', 'preventiveAlias.canineMultiple']
		})
	},
	{
		kind: 'vaccine',
		name: 'Nobivac Tricat Trio',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		name: 'Felocell CVR',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		name: 'Purevax RCP',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'RCP', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		name: 'Purevax RCPCh',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 4', 'V4', 'RCPCh', 'FVRCP+Ch'],
			localized: ['preventiveAlias.felineQuadruple', ...coreFelineDiseases, 'preventiveAlias.felineChlamydiosis']
		})
	},
	{
		kind: 'vaccine',
		name: 'Purevax RCPCh FeLV',
		species: ['feline'],
		aliases: searchAliases({
			technical: ['V 5', 'V5', 'RCPCh FeLV', 'FVRCP+Ch+FeLV', 'FeLV'],
			localized: [
				'preventiveAlias.felineQuintuple',
				...coreFelineDiseases,
				'preventiveAlias.felineChlamydiosis',
				'preventiveAlias.felineLeukemia'
			]
		})
	},
	{
		kind: 'vaccine',
		name: 'Purevax FeLV',
		species: ['feline'],
		aliases: searchAliases({ technical: ['FeLV'], localized: ['preventiveAlias.felineLeukemia'] })
	},
	{
		kind: 'vaccine',
		name: 'Purevax Rabies',
		species: ['feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		name: 'Leucogen',
		species: ['feline'],
		aliases: searchAliases({ technical: ['FeLV'], localized: ['preventiveAlias.felineLeukemia'] })
	},
	{
		kind: 'vaccine',
		name: 'Versifel FeLV',
		species: ['feline'],
		aliases: searchAliases({ technical: ['FeLV'], localized: ['preventiveAlias.felineLeukemia'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Drontal Plus',
		species: ['canine'],
		aliases: searchAliases({
			localized: [
				'preventiveAlias.praziquantelPyrantelPamoateFebantel',
				'preventiveAlias.broadSpectrumAntiparasitic',
				'preventiveAlias.tapewormTreatment'
			]
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Drontal Puppy',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.pyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Endogard',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Canex Premium',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Endal Plus',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Chemital',
		species: ['canine', 'feline'],
		aliases: searchAliases({
			localized: ['preventiveAlias.broadSpectrumAntiparasitic', 'preventiveAlias.endoparasites']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Top Dog',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.broadSpectrumAntiparasitic', 'preventiveAlias.endoparasites']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Drontal Gatos',
		species: ['feline'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoate', 'preventiveAlias.tapewormTreatment']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Milbemax',
		species: ['canine', 'feline'],
		aliases: searchAliases({
			localized: ['preventiveAlias.milbemycinOximePraziquantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Milpro',
		species: ['canine', 'feline'],
		aliases: searchAliases({
			localized: ['preventiveAlias.milbemycinOximePraziquantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Panacur 10%',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.fenbendazole', 'preventiveAlias.endoparasites', 'preventiveAlias.giardia', 'preventiveAlias.nematodes']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Giardicid',
		species: ['canine'],
		aliases: searchAliases({
			localized: ['preventiveAlias.febantel', 'preventiveAlias.giardia', 'preventiveAlias.roundworm']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Bravecto',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.fluralaner', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		name: 'NexGard',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.afoxolaner', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		name: 'Simparic',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.sarolaner', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		name: 'Capstar',
		species: ['canine', 'feline'],
		aliases: searchAliases({
			localized: ['preventiveAlias.nitenpyram', 'preventiveAlias.ectoparasiticide', 'preventiveAlias.fleaTreatment']
		})
	},
	{
		kind: 'antiparasitic',
		name: 'Effipro',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.fipronil', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		name: 'Fiprolex',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.fipronil', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		name: 'Frontline',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.fipronil', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		name: 'Defenza',
		species: ['canine'],
		aliases: searchAliases({ localized: fleaAndTickControl })
	},
	{
		kind: 'antiparasitic',
		name: 'Mectimax',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.ivermectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Ivercanis',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.ivermectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Revolution',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.selamectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Stronghold',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.selamectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Advocate',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.moxidectinImidacloprid', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Advantage Multi',
		species: ['canine', 'feline'],
		aliases: searchAliases({ localized: ['preventiveAlias.moxidectinImidacloprid', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Profender',
		species: ['feline'],
		aliases: searchAliases({
			localized: [
				'preventiveAlias.emodepsidePraziquantel',
				'preventiveAlias.endoparasites',
				'preventiveAlias.topicalFelineAntiparasitic'
			]
		})
	},
	{
		kind: 'antiparasitic',
		name: 'NexGard Spectra',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.afoxolanerMilbemycinOxime', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		name: 'Simparic Trio',
		species: ['canine'],
		aliases: searchAliases({ localized: ['preventiveAlias.sarolanerMoxidectinPyrantel', 'preventiveAlias.endectocide'] })
	}
];
