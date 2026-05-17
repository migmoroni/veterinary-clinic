import type { Country } from './types.js';

export const EGY = {
	"code": "EGY",
	"labels": {
		"pt-BR": "Egito",
		"pt-PT": "Egito",
		"es-ES": "Egipto",
		"es-419": "Egipto",
		"es-AR": "Egipto",
		"es-BO": "Egipto",
		"es-BR": "Egipto",
		"es-BZ": "Egipto",
		"es-CL": "Egipto",
		"es-CO": "Egipto",
		"es-CR": "Egipto",
		"es-CU": "Egipto",
		"es-DO": "Egipto",
		"es-EC": "Egipto",
		"es-GT": "Egipto",
		"es-HN": "Egipto",
		"es-MX": "Egipto",
		"es-NI": "Egipto",
		"es-PA": "Egipto",
		"es-PE": "Egipto",
		"es-PR": "Egipto",
		"es-PY": "Egipto",
		"es-SV": "Egipto",
		"es-US": "Egipto",
		"es-UY": "Egipto",
		"es-VE": "Egipto",
		"en-US": "Egypt",
		"fr-FR": "Égypte",
		"fr-BE": "Égypte",
		"fr-CA": "Égypte",
		"fr-CH": "Égypte",
		"fr-LU": "Égypte",
		"fr-MC": "Égypte",
		"it-IT": "Egitto",
		"it-CH": "Egitto",
		"it-SM": "Egitto",
		"it-VA": "Egitto",
		"de-DE": "Ägypten",
		"de-AT": "Ägypten",
		"de-CH": "Ägypten",
		"de-BE": "Ägypten",
		"de-LI": "Ägypten",
		"de-LU": "Ägypten"
	},
	"callingCode": "20",
	"phoneMasks": [
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "# ########",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[23]"
			]
		},
		{
			"mask": "## #######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1[35]|[4-6]|8[2468]|9[235-7]"
			]
		},
		{
			"mask": "## ########",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[89]"
			]
		}
	]
} satisfies Country;
