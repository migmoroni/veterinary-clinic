import type { Country } from './types.js';

export const KWT = {
	"code": "KWT",
	"labels": {
		"pt-BR": "Kuwait",
		"pt-PT": "Koweit",
		"es-ES": "Kuwait",
		"es-419": "Kuwait",
		"es-AR": "Kuwait",
		"es-BO": "Kuwait",
		"es-BR": "Kuwait",
		"es-BZ": "Kuwait",
		"es-CL": "Kuwait",
		"es-CO": "Kuwait",
		"es-CR": "Kuwait",
		"es-CU": "Kuwait",
		"es-DO": "Kuwait",
		"es-EC": "Kuwait",
		"es-GT": "Kuwait",
		"es-HN": "Kuwait",
		"es-MX": "Kuwait",
		"es-NI": "Kuwait",
		"es-PA": "Kuwait",
		"es-PE": "Kuwait",
		"es-PR": "Kuwait",
		"es-PY": "Kuwait",
		"es-SV": "Kuwait",
		"es-US": "Kuwait",
		"es-UY": "Kuwait",
		"es-VE": "Kuwait",
		"en-US": "Kuwait",
		"fr-FR": "Koweït",
		"fr-BE": "Koweït",
		"fr-CA": "Koweït",
		"fr-CH": "Koweït",
		"fr-LU": "Koweït",
		"fr-MC": "Koweït",
		"it-IT": "Kuwait",
		"it-CH": "Kuwait",
		"it-SM": "Kuwait",
		"it-VA": "Kuwait",
		"de-DE": "Kuwait",
		"de-AT": "Kuwait",
		"de-CH": "Kuwait",
		"de-BE": "Kuwait",
		"de-LI": "Kuwait",
		"de-LU": "Kuwait"
	},
	"callingCode": "965",
	"phoneMasks": [
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[245]"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[169]|2(?:[235]|4[1-35-9])|52"
			]
		}
	]
} satisfies Country;
