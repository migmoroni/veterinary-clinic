import type { Country } from './types.js';

export const THA = {
	"code": "THA",
	"labels": {
		"pt-BR": "Tailândia",
		"pt-PT": "Tailândia",
		"es-ES": "Tailandia",
		"es-419": "Tailandia",
		"es-AR": "Tailandia",
		"es-BO": "Tailandia",
		"es-BR": "Tailandia",
		"es-BZ": "Tailandia",
		"es-CL": "Tailandia",
		"es-CO": "Tailandia",
		"es-CR": "Tailandia",
		"es-CU": "Tailandia",
		"es-DO": "Tailandia",
		"es-EC": "Tailandia",
		"es-GT": "Tailandia",
		"es-HN": "Tailandia",
		"es-MX": "Tailandia",
		"es-NI": "Tailandia",
		"es-PA": "Tailandia",
		"es-PE": "Tailandia",
		"es-PR": "Tailandia",
		"es-PY": "Tailandia",
		"es-SV": "Tailandia",
		"es-US": "Tailandia",
		"es-UY": "Tailandia",
		"es-VE": "Tailandia",
		"en-US": "Thailand",
		"fr-FR": "Thaïlande",
		"fr-BE": "Thaïlande",
		"fr-CA": "Thaïlande",
		"fr-CH": "Thaïlande",
		"fr-LU": "Thaïlande",
		"fr-MC": "Thaïlande",
		"it-IT": "Thailandia",
		"it-CH": "Thailandia",
		"it-SM": "Thailandia",
		"it-VA": "Thailandia",
		"de-DE": "Thailand",
		"de-AT": "Thailand",
		"de-CH": "Thailand",
		"de-BE": "Thailand",
		"de-LI": "Thailand",
		"de-LU": "Thailand"
	},
	"callingCode": "66",
	"phoneMasks": [
		{
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[13-9]"
			]
		},
		{
			"mask": "#### ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "# ### ### ### ###",
			"minLength": 13,
			"maxLength": 13
		}
	]
} satisfies Country;
