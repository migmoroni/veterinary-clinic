import type { Country } from './types.js';

export const PRI = {
	"code": "PRI",
	"labels": {
		"pt-BR": "Porto Rico",
		"pt-PT": "Porto Rico",
		"es-ES": "Puerto Rico",
		"es-419": "Puerto Rico",
		"es-AR": "Puerto Rico",
		"es-BO": "Puerto Rico",
		"es-BR": "Puerto Rico",
		"es-BZ": "Puerto Rico",
		"es-CL": "Puerto Rico",
		"es-CO": "Puerto Rico",
		"es-CR": "Puerto Rico",
		"es-CU": "Puerto Rico",
		"es-DO": "Puerto Rico",
		"es-EC": "Puerto Rico",
		"es-GT": "Puerto Rico",
		"es-HN": "Puerto Rico",
		"es-MX": "Puerto Rico",
		"es-NI": "Puerto Rico",
		"es-PA": "Puerto Rico",
		"es-PE": "Puerto Rico",
		"es-PR": "Puerto Rico",
		"es-PY": "Puerto Rico",
		"es-SV": "Puerto Rico",
		"es-US": "Puerto Rico",
		"es-UY": "Puerto Rico",
		"es-VE": "Puerto Rico",
		"en-US": "Puerto Rico",
		"fr-FR": "Porto Rico",
		"fr-BE": "Porto Rico",
		"fr-CA": "Porto Rico",
		"fr-CH": "Porto Rico",
		"fr-LU": "Porto Rico",
		"fr-MC": "Porto Rico",
		"it-IT": "Portorico",
		"it-CH": "Portorico",
		"it-SM": "Portorico",
		"it-VA": "Portorico",
		"de-DE": "Puerto Rico",
		"de-AT": "Puerto Rico",
		"de-CH": "Puerto Rico",
		"de-BE": "Puerto Rico",
		"de-LI": "Puerto Rico",
		"de-LU": "Puerto Rico"
	},
	"callingCode": "1",
	"phoneMasks": [
		{
			"mask": "(###) ###-####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[2-9]"
			]
		}
	]
} satisfies Country;
