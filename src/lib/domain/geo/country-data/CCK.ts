import type { Country } from './types.js';

export const CCK = {
	"code": "CCK",
	"labels": {
		"pt-BR": "Ilhas Cocos (Keeling)",
		"pt-PT": "Ilhas dos Cocos (Keeling)",
		"es-ES": "Islas Cocos",
		"es-419": "Islas Cocos",
		"es-AR": "Islas Cocos",
		"es-BO": "Islas Cocos",
		"es-BR": "Islas Cocos",
		"es-BZ": "Islas Cocos",
		"es-CL": "Islas Cocos",
		"es-CO": "Islas Cocos",
		"es-CR": "Islas Cocos",
		"es-CU": "Islas Cocos",
		"es-DO": "Islas Cocos",
		"es-EC": "Islas Cocos",
		"es-GT": "Islas Cocos",
		"es-HN": "Islas Cocos",
		"es-MX": "Islas Cocos",
		"es-NI": "Islas Cocos",
		"es-PA": "Islas Cocos",
		"es-PE": "Islas Cocos",
		"es-PR": "Islas Cocos",
		"es-PY": "Islas Cocos",
		"es-SV": "Islas Cocos",
		"es-US": "Islas Cocos",
		"es-UY": "Islas Cocos",
		"es-VE": "Islas Cocos",
		"en-US": "Cocos (Keeling) Islands",
		"fr-FR": "Îles Cocos",
		"fr-BE": "Îles Cocos",
		"fr-CA": "îles Cocos (Keeling)",
		"fr-CH": "Îles Cocos",
		"fr-LU": "Îles Cocos",
		"fr-MC": "Îles Cocos",
		"it-IT": "Isole Cocos (Keeling)",
		"it-CH": "Isole Cocos (Keeling)",
		"it-SM": "Isole Cocos (Keeling)",
		"it-VA": "Isole Cocos (Keeling)",
		"de-DE": "Kokosinseln",
		"de-AT": "Kokosinseln",
		"de-CH": "Kokosinseln",
		"de-BE": "Kokosinseln",
		"de-LI": "Kokosinseln",
		"de-LU": "Kokosinseln"
	},
	"callingCode": "61",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		}
	]
} satisfies Country;
