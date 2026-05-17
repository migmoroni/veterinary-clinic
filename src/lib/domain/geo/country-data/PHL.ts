import type { Country } from './types.js';

export const PHL = {
	"code": "PHL",
	"labels": {
		"pt-BR": "Filipinas",
		"pt-PT": "Filipinas",
		"es-ES": "Filipinas",
		"es-419": "Filipinas",
		"es-AR": "Filipinas",
		"es-BO": "Filipinas",
		"es-BR": "Filipinas",
		"es-BZ": "Filipinas",
		"es-CL": "Filipinas",
		"es-CO": "Filipinas",
		"es-CR": "Filipinas",
		"es-CU": "Filipinas",
		"es-DO": "Filipinas",
		"es-EC": "Filipinas",
		"es-GT": "Filipinas",
		"es-HN": "Filipinas",
		"es-MX": "Filipinas",
		"es-NI": "Filipinas",
		"es-PA": "Filipinas",
		"es-PE": "Filipinas",
		"es-PR": "Filipinas",
		"es-PY": "Filipinas",
		"es-SV": "Filipinas",
		"es-US": "Filipinas",
		"es-UY": "Filipinas",
		"es-VE": "Filipinas",
		"en-US": "Philippines",
		"fr-FR": "Philippines",
		"fr-BE": "Philippines",
		"fr-CA": "Philippines",
		"fr-CH": "Philippines",
		"fr-LU": "Philippines",
		"fr-MC": "Philippines",
		"it-IT": "Filippine",
		"it-CH": "Filippine",
		"it-SM": "Filippine",
		"it-VA": "Filippine",
		"de-DE": "Philippinen",
		"de-AT": "Philippinen",
		"de-CH": "Philippinen",
		"de-BE": "Philippinen",
		"de-LI": "Philippinen",
		"de-LU": "Philippinen"
	},
	"callingCode": "63",
	"phoneMasks": [
		{
			"mask": "# #####",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "# #### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[3-7]|8[2-8]"
			]
		},
		{
			"mask": "##### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"346|4(?:27|9[35])|883",
				"3469|4(?:279|9(?:30|56))|8834"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[89]"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"3(?:23|39|46)|4(?:2[3-6]|[35]9|4[26]|76)|544|88[245]|(?:52|64|86)2",
				"3(?:230|397|461)|4(?:2(?:35|[46]4|51)|396|4(?:22|63)|59[347]|76[15])|5(?:221|446)|642[23]|8(?:622|8(?:[24]2|5[13]))"
			]
		},
		{
			"mask": "#### ### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		},
		{
			"mask": "#### ## ### ####",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
