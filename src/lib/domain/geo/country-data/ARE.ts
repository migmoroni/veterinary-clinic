import type { Country } from './types.js';

export const ARE = {
	"code": "ARE",
	"labels": {
		"pt-BR": "Emirados Árabes Unidos",
		"pt-PT": "Emirados Árabes Unidos",
		"es-ES": "Emiratos Árabes Unidos",
		"es-419": "Emiratos Árabes Unidos",
		"es-AR": "Emiratos Árabes Unidos",
		"es-BO": "Emiratos Árabes Unidos",
		"es-BR": "Emiratos Árabes Unidos",
		"es-BZ": "Emiratos Árabes Unidos",
		"es-CL": "Emiratos Árabes Unidos",
		"es-CO": "Emiratos Árabes Unidos",
		"es-CR": "Emiratos Árabes Unidos",
		"es-CU": "Emiratos Árabes Unidos",
		"es-DO": "Emiratos Árabes Unidos",
		"es-EC": "Emiratos Árabes Unidos",
		"es-GT": "Emiratos Árabes Unidos",
		"es-HN": "Emiratos Árabes Unidos",
		"es-MX": "Emiratos Árabes Unidos",
		"es-NI": "Emiratos Árabes Unidos",
		"es-PA": "Emiratos Árabes Unidos",
		"es-PE": "Emiratos Árabes Unidos",
		"es-PR": "Emiratos Árabes Unidos",
		"es-PY": "Emiratos Árabes Unidos",
		"es-SV": "Emiratos Árabes Unidos",
		"es-US": "Emiratos Árabes Unidos",
		"es-UY": "Emiratos Árabes Unidos",
		"es-VE": "Emiratos Árabes Unidos",
		"en-US": "United Arab Emirates",
		"fr-FR": "Émirats arabes unis",
		"fr-BE": "Émirats arabes unis",
		"fr-CA": "Émirats arabes unis",
		"fr-CH": "Émirats arabes unis",
		"fr-LU": "Émirats arabes unis",
		"fr-MC": "Émirats arabes unis",
		"it-IT": "Emirati Arabi Uniti",
		"it-CH": "Emirati Arabi Uniti",
		"it-SM": "Emirati Arabi Uniti",
		"it-VA": "Emirati Arabi Uniti",
		"de-DE": "Vereinigte Arabische Emirate",
		"de-AT": "Vereinigte Arabische Emirate",
		"de-CH": "Vereinigte Arabische Emirate",
		"de-BE": "Vereinigte Arabische Emirate",
		"de-LI": "Vereinigte Arabische Emirate",
		"de-LU": "Vereinigte Arabische Emirate"
	},
	"callingCode": "971",
	"phoneMasks": [
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[236]|[479][2-8]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"5"
			]
		},
		{
			"mask": "### # #####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[479]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "### #########",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"60|8"
			]
		}
	]
} satisfies Country;
