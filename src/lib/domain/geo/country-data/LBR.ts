import type { Country } from './types.js';

export const LBR = {
	"code": "LBR",
	"labels": {
		"pt-BR": "Libéria",
		"pt-PT": "Libéria",
		"es-ES": "Liberia",
		"es-419": "Liberia",
		"es-AR": "Liberia",
		"es-BO": "Liberia",
		"es-BR": "Liberia",
		"es-BZ": "Liberia",
		"es-CL": "Liberia",
		"es-CO": "Liberia",
		"es-CR": "Liberia",
		"es-CU": "Liberia",
		"es-DO": "Liberia",
		"es-EC": "Liberia",
		"es-GT": "Liberia",
		"es-HN": "Liberia",
		"es-MX": "Liberia",
		"es-NI": "Liberia",
		"es-PA": "Liberia",
		"es-PE": "Liberia",
		"es-PR": "Liberia",
		"es-PY": "Liberia",
		"es-SV": "Liberia",
		"es-US": "Liberia",
		"es-UY": "Liberia",
		"es-VE": "Liberia",
		"en-US": "Liberia",
		"fr-FR": "Liberia",
		"fr-BE": "Liberia",
		"fr-CA": "Libéria",
		"fr-CH": "Liberia",
		"fr-LU": "Liberia",
		"fr-MC": "Liberia",
		"it-IT": "Liberia",
		"it-CH": "Liberia",
		"it-SM": "Liberia",
		"it-VA": "Liberia",
		"de-DE": "Liberia",
		"de-AT": "Liberia",
		"de-CH": "Liberia",
		"de-BE": "Liberia",
		"de-LI": "Liberia",
		"de-LU": "Liberia"
	},
	"callingCode": "231",
	"phoneMasks": [
		{
			"mask": "# ### ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"4[67]|[56]"
			]
		},
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-578]"
			]
		}
	]
} satisfies Country;
