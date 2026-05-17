import type { Country } from './types.js';

export const BGR = {
	"code": "BGR",
	"labels": {
		"pt-BR": "Bulgária",
		"pt-PT": "Bulgária",
		"es-ES": "Bulgaria",
		"es-419": "Bulgaria",
		"es-AR": "Bulgaria",
		"es-BO": "Bulgaria",
		"es-BR": "Bulgaria",
		"es-BZ": "Bulgaria",
		"es-CL": "Bulgaria",
		"es-CO": "Bulgaria",
		"es-CR": "Bulgaria",
		"es-CU": "Bulgaria",
		"es-DO": "Bulgaria",
		"es-EC": "Bulgaria",
		"es-GT": "Bulgaria",
		"es-HN": "Bulgaria",
		"es-MX": "Bulgaria",
		"es-NI": "Bulgaria",
		"es-PA": "Bulgaria",
		"es-PE": "Bulgaria",
		"es-PR": "Bulgaria",
		"es-PY": "Bulgaria",
		"es-SV": "Bulgaria",
		"es-US": "Bulgaria",
		"es-UY": "Bulgaria",
		"es-VE": "Bulgaria",
		"en-US": "Bulgaria",
		"fr-FR": "Bulgarie",
		"fr-BE": "Bulgarie",
		"fr-CA": "Bulgarie",
		"fr-CH": "Bulgarie",
		"fr-LU": "Bulgarie",
		"fr-MC": "Bulgarie",
		"it-IT": "Bulgaria",
		"it-CH": "Bulgaria",
		"it-SM": "Bulgaria",
		"it-VA": "Bulgaria",
		"de-DE": "Bulgarien",
		"de-AT": "Bulgarien",
		"de-CH": "Bulgarien",
		"de-BE": "Bulgarien",
		"de-LI": "Bulgarien",
		"de-LU": "Bulgarien"
	},
	"callingCode": "359",
	"phoneMasks": [
		{
			"mask": "# # ## ##",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"43[1-6]|70[1-9]"
			]
		},
		{
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[356]|4[124-7]|7[1-9]|8[1-6]|9[1-7]"
			]
		},
		{
			"mask": "### ## ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"(?:70|8)0"
			]
		},
		{
			"mask": "### ### ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"43[1-7]|7"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[48]|9[08]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		}
	]
} satisfies Country;
