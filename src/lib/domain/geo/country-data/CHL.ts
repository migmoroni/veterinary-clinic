import type { Country } from './types.js';

export const CHL = {
	"code": "CHL",
	"labels": {
		"pt-BR": "Chile",
		"pt-PT": "Chile",
		"es-ES": "Chile",
		"es-419": "Chile",
		"es-AR": "Chile",
		"es-BO": "Chile",
		"es-BR": "Chile",
		"es-BZ": "Chile",
		"es-CL": "Chile",
		"es-CO": "Chile",
		"es-CR": "Chile",
		"es-CU": "Chile",
		"es-DO": "Chile",
		"es-EC": "Chile",
		"es-GT": "Chile",
		"es-HN": "Chile",
		"es-MX": "Chile",
		"es-NI": "Chile",
		"es-PA": "Chile",
		"es-PE": "Chile",
		"es-PR": "Chile",
		"es-PY": "Chile",
		"es-SV": "Chile",
		"es-US": "Chile",
		"es-UY": "Chile",
		"es-VE": "Chile",
		"en-US": "Chile",
		"fr-FR": "Chili",
		"fr-BE": "Chili",
		"fr-CA": "Chili",
		"fr-CH": "Chili",
		"fr-LU": "Chili",
		"fr-MC": "Chili",
		"it-IT": "Cile",
		"it-CH": "Cile",
		"it-SM": "Cile",
		"it-VA": "Cile",
		"de-DE": "Chile",
		"de-AT": "Chile",
		"de-CH": "Chile",
		"de-BE": "Chile",
		"de-LI": "Chile",
		"de-LU": "Chile"
	},
	"callingCode": "56",
	"phoneMasks": [
		{
			"mask": "(#) #### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2[1-36]"
			]
		},
		{
			"mask": "(##) ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"3[2-5]|[47]|5[1-3578]|6[13-57]|8(?:0[1-9]|[1-9])"
			]
		},
		{
			"mask": "(#####) ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"219",
				"2196"
			]
		},
		{
			"mask": "# #### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9[2-9]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"44"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"60|8"
			]
		},
		{
			"mask": "### ### ## ###",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"60"
			]
		},
		{
			"mask": "#### ### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
