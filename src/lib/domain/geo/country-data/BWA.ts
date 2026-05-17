import type { Country } from './types.js';

export const BWA = {
	"code": "BWA",
	"labels": {
		"pt-BR": "Botsuana",
		"pt-PT": "Botsuana",
		"es-ES": "Botsuana",
		"es-419": "Botsuana",
		"es-AR": "Botsuana",
		"es-BO": "Botsuana",
		"es-BR": "Botsuana",
		"es-BZ": "Botsuana",
		"es-CL": "Botsuana",
		"es-CO": "Botsuana",
		"es-CR": "Botsuana",
		"es-CU": "Botsuana",
		"es-DO": "Botsuana",
		"es-EC": "Botsuana",
		"es-GT": "Botsuana",
		"es-HN": "Botsuana",
		"es-MX": "Botsuana",
		"es-NI": "Botsuana",
		"es-PA": "Botsuana",
		"es-PE": "Botsuana",
		"es-PR": "Botsuana",
		"es-PY": "Botsuana",
		"es-SV": "Botsuana",
		"es-US": "Botsuana",
		"es-UY": "Botsuana",
		"es-VE": "Botsuana",
		"en-US": "Botswana",
		"fr-FR": "Botswana",
		"fr-BE": "Botswana",
		"fr-CA": "Botswana",
		"fr-CH": "Botswana",
		"fr-LU": "Botswana",
		"fr-MC": "Botswana",
		"it-IT": "Botswana",
		"it-CH": "Botswana",
		"it-SM": "Botswana",
		"it-VA": "Botswana",
		"de-DE": "Botsuana",
		"de-AT": "Botsuana",
		"de-CH": "Botswana",
		"de-BE": "Botsuana",
		"de-LI": "Botsuana",
		"de-LU": "Botsuana"
	},
	"callingCode": "267",
	"phoneMasks": [
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"90"
			]
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[24-6]|3[15-9]"
			]
		},
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[37]"
			]
		},
		{
			"mask": "### #### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "#### ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"0"
			]
		}
	]
} satisfies Country;
