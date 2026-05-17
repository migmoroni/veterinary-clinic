import type { Country } from './types.js';

export const NGA = {
	"code": "NGA",
	"labels": {
		"pt-BR": "Nigéria",
		"pt-PT": "Nigéria",
		"es-ES": "Nigeria",
		"es-419": "Nigeria",
		"es-AR": "Nigeria",
		"es-BO": "Nigeria",
		"es-BR": "Nigeria",
		"es-BZ": "Nigeria",
		"es-CL": "Nigeria",
		"es-CO": "Nigeria",
		"es-CR": "Nigeria",
		"es-CU": "Nigeria",
		"es-DO": "Nigeria",
		"es-EC": "Nigeria",
		"es-GT": "Nigeria",
		"es-HN": "Nigeria",
		"es-MX": "Nigeria",
		"es-NI": "Nigeria",
		"es-PA": "Nigeria",
		"es-PE": "Nigeria",
		"es-PR": "Nigeria",
		"es-PY": "Nigeria",
		"es-SV": "Nigeria",
		"es-US": "Nigeria",
		"es-UY": "Nigeria",
		"es-VE": "Nigeria",
		"en-US": "Nigeria",
		"fr-FR": "Nigeria",
		"fr-BE": "Nigeria",
		"fr-CA": "Nigéria",
		"fr-CH": "Nigeria",
		"fr-LU": "Nigeria",
		"fr-MC": "Nigeria",
		"it-IT": "Nigeria",
		"it-CH": "Nigeria",
		"it-SM": "Nigeria",
		"it-VA": "Nigeria",
		"de-DE": "Nigeria",
		"de-AT": "Nigeria",
		"de-CH": "Nigeria",
		"de-BE": "Nigeria",
		"de-LI": "Nigeria",
		"de-LU": "Nigeria"
	},
	"callingCode": "234",
	"phoneMasks": [
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"3"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[7-9]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"20[129]"
			]
		},
		{
			"mask": "#### ## ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "### #### #####",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"[78]"
			]
		},
		{
			"mask": "# ### ### ### ###",
			"minLength": 13,
			"maxLength": 13
		},
		{
			"mask": "### ##### ######",
			"minLength": 14,
			"maxLength": 14,
			"leadingDigits": [
				"[78]"
			]
		}
	]
} satisfies Country;
