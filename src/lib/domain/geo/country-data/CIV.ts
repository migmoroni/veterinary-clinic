import type { Country } from './types.js';

export const CIV = {
	"code": "CIV",
	"labels": {
		"pt-BR": "Costa do Marfim",
		"pt-PT": "Côte d’Ivoire (Costa do Marfim)",
		"es-ES": "Côte d’Ivoire",
		"es-419": "Costa de Marfil",
		"es-AR": "Costa de Marfil",
		"es-BO": "Costa de Marfil",
		"es-BR": "Costa de Marfil",
		"es-BZ": "Costa de Marfil",
		"es-CL": "Costa de Marfil",
		"es-CO": "Costa de Marfil",
		"es-CR": "Costa de Marfil",
		"es-CU": "Costa de Marfil",
		"es-DO": "Costa de Marfil",
		"es-EC": "Costa de Marfil",
		"es-GT": "Costa de Marfil",
		"es-HN": "Costa de Marfil",
		"es-MX": "Côte d’Ivoire",
		"es-NI": "Costa de Marfil",
		"es-PA": "Costa de Marfil",
		"es-PE": "Costa de Marfil",
		"es-PR": "Costa de Marfil",
		"es-PY": "Costa de Marfil",
		"es-SV": "Costa de Marfil",
		"es-US": "Costa de Marfil",
		"es-UY": "Costa de Marfil",
		"es-VE": "Costa de Marfil",
		"en-US": "Côte d’Ivoire",
		"fr-FR": "Côte d’Ivoire",
		"fr-BE": "Côte d’Ivoire",
		"fr-CA": "Côte d’Ivoire",
		"fr-CH": "Côte d’Ivoire",
		"fr-LU": "Côte d’Ivoire",
		"fr-MC": "Côte d’Ivoire",
		"it-IT": "Costa d’Avorio",
		"it-CH": "Costa d’Avorio",
		"it-SM": "Costa d’Avorio",
		"it-VA": "Costa d’Avorio",
		"de-DE": "Côte d’Ivoire",
		"de-AT": "Côte d’Ivoire",
		"de-CH": "Côte d’Ivoire",
		"de-BE": "Côte d’Ivoire",
		"de-LI": "Côte d’Ivoire",
		"de-LU": "Côte d’Ivoire"
	},
	"callingCode": "225",
	"phoneMasks": [
		{
			"mask": "## ## # #####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "## ## ## ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"0"
			]
		}
	]
} satisfies Country;
