import type { Country } from './types.js';

export const HUN = {
	"code": "HUN",
	"labels": {
		"pt-BR": "Hungria",
		"pt-PT": "Hungria",
		"es-ES": "Hungría",
		"es-419": "Hungría",
		"es-AR": "Hungría",
		"es-BO": "Hungría",
		"es-BR": "Hungría",
		"es-BZ": "Hungría",
		"es-CL": "Hungría",
		"es-CO": "Hungría",
		"es-CR": "Hungría",
		"es-CU": "Hungría",
		"es-DO": "Hungría",
		"es-EC": "Hungría",
		"es-GT": "Hungría",
		"es-HN": "Hungría",
		"es-MX": "Hungría",
		"es-NI": "Hungría",
		"es-PA": "Hungría",
		"es-PE": "Hungría",
		"es-PR": "Hungría",
		"es-PY": "Hungría",
		"es-SV": "Hungría",
		"es-US": "Hungría",
		"es-UY": "Hungría",
		"es-VE": "Hungría",
		"en-US": "Hungary",
		"fr-FR": "Hongrie",
		"fr-BE": "Hongrie",
		"fr-CA": "Hongrie",
		"fr-CH": "Hongrie",
		"fr-LU": "Hongrie",
		"fr-MC": "Hongrie",
		"it-IT": "Ungheria",
		"it-CH": "Ungheria",
		"it-SM": "Ungheria",
		"it-VA": "Ungheria",
		"de-DE": "Ungarn",
		"de-AT": "Ungarn",
		"de-CH": "Ungarn",
		"de-BE": "Ungarn",
		"de-LI": "Ungarn",
		"de-LU": "Ungarn"
	},
	"callingCode": "36",
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
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[27][2-9]|3[2-7]|4[24-9]|5[2-79]|6|8[2-57-9]|9[2-69]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-9]"
			]
		}
	]
} satisfies Country;
