import type { Country } from './types.js';

export const GEO = {
	"code": "GEO",
	"labels": {
		"pt-BR": "Geórgia",
		"pt-PT": "Geórgia",
		"es-ES": "Georgia",
		"es-419": "Georgia",
		"es-AR": "Georgia",
		"es-BO": "Georgia",
		"es-BR": "Georgia",
		"es-BZ": "Georgia",
		"es-CL": "Georgia",
		"es-CO": "Georgia",
		"es-CR": "Georgia",
		"es-CU": "Georgia",
		"es-DO": "Georgia",
		"es-EC": "Georgia",
		"es-GT": "Georgia",
		"es-HN": "Georgia",
		"es-MX": "Georgia",
		"es-NI": "Georgia",
		"es-PA": "Georgia",
		"es-PE": "Georgia",
		"es-PR": "Georgia",
		"es-PY": "Georgia",
		"es-SV": "Georgia",
		"es-US": "Georgia",
		"es-UY": "Georgia",
		"es-VE": "Georgia",
		"en-US": "Georgia",
		"fr-FR": "Géorgie",
		"fr-BE": "Géorgie",
		"fr-CA": "Géorgie",
		"fr-CH": "Géorgie",
		"fr-LU": "Géorgie",
		"fr-MC": "Géorgie",
		"it-IT": "Georgia",
		"it-CH": "Georgia",
		"it-SM": "Georgia",
		"it-VA": "Georgia",
		"de-DE": "Georgien",
		"de-AT": "Georgien",
		"de-CH": "Georgien",
		"de-BE": "Georgien",
		"de-LI": "Georgien",
		"de-LU": "Georgien"
	},
	"callingCode": "995",
	"phoneMasks": [
		{
			"mask": "## ### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"32"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[57]"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[348]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"70"
			]
		}
	]
} satisfies Country;
