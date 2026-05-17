import type { Country } from './types.js';

export const IRQ = {
	"code": "IRQ",
	"labels": {
		"pt-BR": "Iraque",
		"pt-PT": "Iraque",
		"es-ES": "Irak",
		"es-419": "Irak",
		"es-AR": "Irak",
		"es-BO": "Irak",
		"es-BR": "Irak",
		"es-BZ": "Irak",
		"es-CL": "Irak",
		"es-CO": "Irak",
		"es-CR": "Irak",
		"es-CU": "Irak",
		"es-DO": "Irak",
		"es-EC": "Irak",
		"es-GT": "Irak",
		"es-HN": "Irak",
		"es-MX": "Irak",
		"es-NI": "Irak",
		"es-PA": "Irak",
		"es-PE": "Irak",
		"es-PR": "Irak",
		"es-PY": "Irak",
		"es-SV": "Irak",
		"es-US": "Irak",
		"es-UY": "Irak",
		"es-VE": "Irak",
		"en-US": "Iraq",
		"fr-FR": "Irak",
		"fr-BE": "Irak",
		"fr-CA": "Irak",
		"fr-CH": "Irak",
		"fr-LU": "Irak",
		"fr-MC": "Irak",
		"it-IT": "Iraq",
		"it-CH": "Iraq",
		"it-SM": "Iraq",
		"it-VA": "Iraq",
		"de-DE": "Irak",
		"de-AT": "Irak",
		"de-CH": "Irak",
		"de-BE": "Irak",
		"de-LI": "Irak",
		"de-LU": "Irak"
	},
	"callingCode": "964",
	"phoneMasks": [
		{
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-6]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"7"
			]
		}
	]
} satisfies Country;
