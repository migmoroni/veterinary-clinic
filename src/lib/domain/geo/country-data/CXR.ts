import type { Country } from './types.js';

export const CXR = {
	"code": "CXR",
	"labels": {
		"pt-BR": "Ilha Christmas",
		"pt-PT": "Ilha do Natal",
		"es-ES": "Isla de Navidad",
		"es-419": "Isla de Navidad",
		"es-AR": "Isla de Navidad",
		"es-BO": "Isla de Navidad",
		"es-BR": "Isla de Navidad",
		"es-BZ": "Isla de Navidad",
		"es-CL": "Isla de Navidad",
		"es-CO": "Isla de Navidad",
		"es-CR": "Isla de Navidad",
		"es-CU": "Isla de Navidad",
		"es-DO": "Isla de Navidad",
		"es-EC": "Isla de Navidad",
		"es-GT": "Isla de Navidad",
		"es-HN": "Isla de Navidad",
		"es-MX": "Isla de Navidad",
		"es-NI": "Isla de Navidad",
		"es-PA": "Isla de Navidad",
		"es-PE": "Isla de Navidad",
		"es-PR": "Isla de Navidad",
		"es-PY": "Isla de Navidad",
		"es-SV": "Isla de Navidad",
		"es-US": "Isla de Navidad",
		"es-UY": "Isla de Navidad",
		"es-VE": "Isla de Navidad",
		"en-US": "Christmas Island",
		"fr-FR": "Île Christmas",
		"fr-BE": "Île Christmas",
		"fr-CA": "île Christmas",
		"fr-CH": "Île Christmas",
		"fr-LU": "Île Christmas",
		"fr-MC": "Île Christmas",
		"it-IT": "Isola Christmas",
		"it-CH": "Isola Christmas",
		"it-SM": "Isola Christmas",
		"it-VA": "Isola Christmas",
		"de-DE": "Weihnachtsinsel",
		"de-AT": "Weihnachtsinsel",
		"de-CH": "Weihnachtsinsel",
		"de-BE": "Weihnachtsinsel",
		"de-LI": "Weihnachtsinsel",
		"de-LU": "Weihnachtsinsel"
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
