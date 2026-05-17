import type { Country } from './types.js';

export const MNE = {
	"code": "MNE",
	"labels": {
		"pt-BR": "Montenegro",
		"pt-PT": "Montenegro",
		"es-ES": "Montenegro",
		"es-419": "Montenegro",
		"es-AR": "Montenegro",
		"es-BO": "Montenegro",
		"es-BR": "Montenegro",
		"es-BZ": "Montenegro",
		"es-CL": "Montenegro",
		"es-CO": "Montenegro",
		"es-CR": "Montenegro",
		"es-CU": "Montenegro",
		"es-DO": "Montenegro",
		"es-EC": "Montenegro",
		"es-GT": "Montenegro",
		"es-HN": "Montenegro",
		"es-MX": "Montenegro",
		"es-NI": "Montenegro",
		"es-PA": "Montenegro",
		"es-PE": "Montenegro",
		"es-PR": "Montenegro",
		"es-PY": "Montenegro",
		"es-SV": "Montenegro",
		"es-US": "Montenegro",
		"es-UY": "Montenegro",
		"es-VE": "Montenegro",
		"en-US": "Montenegro",
		"fr-FR": "Monténégro",
		"fr-BE": "Monténégro",
		"fr-CA": "Monténégro",
		"fr-CH": "Monténégro",
		"fr-LU": "Monténégro",
		"fr-MC": "Monténégro",
		"it-IT": "Montenegro",
		"it-CH": "Montenegro",
		"it-SM": "Montenegro",
		"it-VA": "Montenegro",
		"de-DE": "Montenegro",
		"de-AT": "Montenegro",
		"de-CH": "Montenegro",
		"de-BE": "Montenegro",
		"de-LI": "Montenegro",
		"de-LU": "Montenegro"
	},
	"callingCode": "382",
	"phoneMasks": [
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-9]"
			]
		}
	]
} satisfies Country;
