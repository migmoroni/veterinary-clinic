import type { Country } from './types.js';

export const TWN = {
	"code": "TWN",
	"labels": {
		"pt-BR": "Taiwan",
		"pt-PT": "Taiwan",
		"es-ES": "Taiwán",
		"es-419": "Taiwán",
		"es-AR": "Taiwán",
		"es-BO": "Taiwán",
		"es-BR": "Taiwán",
		"es-BZ": "Taiwán",
		"es-CL": "Taiwán",
		"es-CO": "Taiwán",
		"es-CR": "Taiwán",
		"es-CU": "Taiwán",
		"es-DO": "Taiwán",
		"es-EC": "Taiwán",
		"es-GT": "Taiwán",
		"es-HN": "Taiwán",
		"es-MX": "Taiwán",
		"es-NI": "Taiwán",
		"es-PA": "Taiwán",
		"es-PE": "Taiwán",
		"es-PR": "Taiwán",
		"es-PY": "Taiwán",
		"es-SV": "Taiwán",
		"es-US": "Taiwán",
		"es-UY": "Taiwán",
		"es-VE": "Taiwán",
		"en-US": "Taiwan",
		"fr-FR": "Taïwan",
		"fr-BE": "Taïwan",
		"fr-CA": "Taïwan",
		"fr-CH": "Taïwan",
		"fr-LU": "Taïwan",
		"fr-MC": "Taïwan",
		"it-IT": "Taiwan",
		"it-CH": "Taiwan",
		"it-SM": "Taiwan",
		"it-VA": "Taiwan",
		"de-DE": "Taiwan",
		"de-AT": "Taiwan",
		"de-CH": "Taiwan",
		"de-BE": "Taiwan",
		"de-LI": "Taiwan",
		"de-LU": "Taiwan"
	},
	"callingCode": "886",
	"phoneMasks": [
		{
			"mask": "## # ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"202"
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
				"[23568]|4(?:0[02-48]|[1-47-9])|7[1-9]",
				"[23568]|4(?:0[2-48]|[1-47-9])|(?:400|7)[1-9]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[258]0"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[49]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "## #### #####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"7"
			]
		}
	]
} satisfies Country;
