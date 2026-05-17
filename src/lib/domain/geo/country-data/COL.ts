import type { Country } from './types.js';

export const COL = {
	"code": "COL",
	"labels": {
		"pt-BR": "Colômbia",
		"pt-PT": "Colômbia",
		"es-ES": "Colombia",
		"es-419": "Colombia",
		"es-AR": "Colombia",
		"es-BO": "Colombia",
		"es-BR": "Colombia",
		"es-BZ": "Colombia",
		"es-CL": "Colombia",
		"es-CO": "Colombia",
		"es-CR": "Colombia",
		"es-CU": "Colombia",
		"es-DO": "Colombia",
		"es-EC": "Colombia",
		"es-GT": "Colombia",
		"es-HN": "Colombia",
		"es-MX": "Colombia",
		"es-NI": "Colombia",
		"es-PA": "Colombia",
		"es-PE": "Colombia",
		"es-PR": "Colombia",
		"es-PY": "Colombia",
		"es-SV": "Colombia",
		"es-US": "Colombia",
		"es-UY": "Colombia",
		"es-VE": "Colombia",
		"en-US": "Colombia",
		"fr-FR": "Colombie",
		"fr-BE": "Colombie",
		"fr-CA": "Colombie",
		"fr-CH": "Colombie",
		"fr-LU": "Colombie",
		"fr-MC": "Colombie",
		"it-IT": "Colombia",
		"it-CH": "Colombia",
		"it-SM": "Colombia",
		"it-VA": "Colombia",
		"de-DE": "Kolumbien",
		"de-AT": "Kolumbien",
		"de-CH": "Kolumbien",
		"de-BE": "Kolumbien",
		"de-LI": "Kolumbien",
		"de-LU": "Kolumbien"
	},
	"callingCode": "57",
	"phoneMasks": [
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"46"
			]
		},
		{
			"mask": "(###) #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"6|90"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"3[0-357]|91"
			]
		},
		{
			"mask": "#-###-#######",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
