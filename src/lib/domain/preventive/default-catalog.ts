import { localizedPreventiveAliases, type PreventiveAliasTranslationKey } from '../../i18n/preventive-aliases/index.js';

export type DefaultPreventiveKind = 'vaccine' | 'antiparasitic';
export type DefaultPreventiveSpecies = 'canine' | 'feline';

export interface DefaultPreventiveCatalogItem {
	kind: DefaultPreventiveKind;
	origin: 'system';
	name: string;
	species: DefaultPreventiveSpecies[];
	aliases: string[];
	manufacturer: string;
	regions: string[];
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
const defaultPreventiveCatalogDefinitions: DefaultPreventiveCatalogItem[] = [
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Canine 1-DAPPVL2+CV',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Nobivac DHPPI+L',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Nobivac DHPPi',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['ZAF'],
		aliases: searchAliases({
			technical: ['DHPPi'],
			localized: ['preventiveAlias.polyvalent', 'preventiveAlias.canineMultiple', ...polyvalentCanineDiseases]
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Duramune Max 5-CvK/4L',
		species: ['canine'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Canigen MHA2PPi/L',
		species: ['canine'],
		manufacturer: 'Virbac',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Imunocan V8',
		species: ['canine'],
		manufacturer: 'Vaxxinova',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Versican Plus DHPPi/L4R',
		species: ['canine'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Nobivac Puppy DP',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['DP'],
			localized: ['preventiveAlias.puppy', 'preventiveAlias.canineDistemper', 'preventiveAlias.canineParvovirus']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'GiardiaVax',
		species: ['canine'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.giardia', 'preventiveAlias.giardiasis'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'BronchiGuard',
		species: ['canine'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['Bordetella bronchiseptica'],
			localized: ['preventiveAlias.canineInfectiousTracheobronchitis', 'preventiveAlias.kennelCough']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Intra-Trac Oral Bb',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['Bb', 'Bordetella bronchiseptica'],
			localized: ['preventiveAlias.canineInfectiousTracheobronchitis', 'preventiveAlias.kennelCough']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac KC',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Leish-Tec',
		species: ['canine'],
		manufacturer: 'Ceva Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.leishmaniasis', 'preventiveAlias.kalaAzar'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Eurican Herpes 205',
		species: ['canine'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.canineHerpesvirus'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Raiva',
		species: ['canine', 'feline'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Rabisin',
		species: ['canine', 'feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Defensor',
		species: ['canine', 'feline'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Feline 1-HCP',
		species: ['feline'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'HCP', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Feline 1-HCPCh',
		species: ['feline'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 4', 'V4', 'HCPCh', 'FVRCP+Ch'],
			localized: ['preventiveAlias.felineQuadruple', ...coreFelineDiseases, 'preventiveAlias.felineChlamydiosis']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Feline 1-HCPCh + FeLV',
		species: ['feline'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Nobivac L4',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ technical: ['L4'], localized: ['preventiveAlias.canineLeptospirosis'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Recombitek C6',
		species: ['canine'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['C6', 'V 10', 'V10'],
			localized: ['preventiveAlias.polyvalent', 'preventiveAlias.canineMultiple']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Vanguard Plus',
		species: ['canine'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 10', 'V10'],
			localized: ['preventiveAlias.polyvalent', 'preventiveAlias.canineMultiple']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Nobivac Tricat Trio',
		species: ['feline'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Felocell CVR',
		species: ['feline'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Purevax RCP',
		species: ['feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 3', 'V3', 'RCP', 'FVRCP'],
			localized: ['preventiveAlias.felineTriple', ...coreFelineDiseases]
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Purevax RCPCh',
		species: ['feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			technical: ['V 4', 'V4', 'RCPCh', 'FVRCP+Ch'],
			localized: ['preventiveAlias.felineQuadruple', ...coreFelineDiseases, 'preventiveAlias.felineChlamydiosis']
		})
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Purevax RCPCh FeLV',
		species: ['feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Purevax FeLV',
		species: ['feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ technical: ['FeLV'], localized: ['preventiveAlias.felineLeukemia'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Purevax Rabies',
		species: ['feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.rabies'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Leucogen',
		species: ['feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ technical: ['FeLV'], localized: ['preventiveAlias.felineLeukemia'] })
	},
	{
		kind: 'vaccine',
		origin: 'system',
		name: 'Versifel FeLV',
		species: ['feline'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ technical: ['FeLV'], localized: ['preventiveAlias.felineLeukemia'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Drontal Plus',
		species: ['canine'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'Drontal Puppy',
		species: ['canine'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.pyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Endogard',
		species: ['canine'],
		manufacturer: 'Virbac',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Canex Premium',
		species: ['canine'],
		manufacturer: 'Ceva Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Endal Plus',
		species: ['canine'],
		manufacturer: 'Ourofino Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoateFebantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Chemital',
		species: ['canine', 'feline'],
		manufacturer: 'Chemitec',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.broadSpectrumAntiparasitic', 'preventiveAlias.endoparasites']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Top Dog',
		species: ['canine'],
		manufacturer: 'Ourofino Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.broadSpectrumAntiparasitic', 'preventiveAlias.endoparasites']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Drontal Gatos',
		species: ['feline'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.praziquantelPyrantelPamoate', 'preventiveAlias.tapewormTreatment']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Milbemax',
		species: ['canine', 'feline'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.milbemycinOximePraziquantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Milpro',
		species: ['canine', 'feline'],
		manufacturer: 'Virbac',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.milbemycinOximePraziquantel', 'preventiveAlias.broadSpectrumAntiparasitic']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Panacur 10%',
		species: ['canine'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.fenbendazole', 'preventiveAlias.endoparasites', 'preventiveAlias.giardia', 'preventiveAlias.nematodes']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Giardicid',
		species: ['canine'],
		manufacturer: 'Agener União Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.febantel', 'preventiveAlias.giardia', 'preventiveAlias.roundworm']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Bravecto',
		species: ['canine', 'feline'],
		manufacturer: 'MSD Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.fluralaner', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'NexGard',
		species: ['canine'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.afoxolaner', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Simparic',
		species: ['canine'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.sarolaner', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Capstar',
		species: ['canine', 'feline'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
		aliases: searchAliases({
			localized: ['preventiveAlias.nitenpyram', 'preventiveAlias.ectoparasiticide', 'preventiveAlias.fleaTreatment']
		})
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Effipro',
		species: ['canine', 'feline'],
		manufacturer: 'Virbac',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.fipronil', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Fiprolex',
		species: ['canine', 'feline'],
		manufacturer: 'Ceva Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.fipronil', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Frontline',
		species: ['canine', 'feline'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.fipronil', ...fleaAndTickControl] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Defenza',
		species: ['canine'],
		manufacturer: 'Ourofino Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({ localized: fleaAndTickControl })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Mectimax',
		species: ['canine'],
		manufacturer: 'Agener União Saúde Animal',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.ivermectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Ivercanis',
		species: ['canine'],
		manufacturer: 'World Veterinária',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.ivermectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Revolution',
		species: ['canine', 'feline'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.selamectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Stronghold',
		species: ['canine', 'feline'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.selamectin', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Advocate',
		species: ['canine', 'feline'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.moxidectinImidacloprid', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Advantage Multi',
		species: ['canine', 'feline'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.moxidectinImidacloprid', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Profender',
		species: ['feline'],
		manufacturer: 'Elanco',
		regions: ['BRA'],
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
		origin: 'system',
		name: 'NexGard Spectra',
		species: ['canine'],
		manufacturer: 'Boehringer Ingelheim Animal Health',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.afoxolanerMilbemycinOxime', 'preventiveAlias.endectocide'] })
	},
	{
		kind: 'antiparasitic',
		origin: 'system',
		name: 'Simparic Trio',
		species: ['canine'],
		manufacturer: 'Zoetis',
		regions: ['BRA'],
		aliases: searchAliases({ localized: ['preventiveAlias.sarolanerMoxidectinPyrantel', 'preventiveAlias.endectocide'] })
	}
];

export const defaultPreventiveCatalogItems = defaultPreventiveCatalogDefinitions;
