import type { Country } from './types.js';

export const MDA = {
	"code": "MDA",
	"labels": {
		"pt-BR": "Moldávia",
		"pt-PT": "Moldávia",
		"es-ES": "Moldavia",
		"es-419": "Moldavia",
		"es-AR": "Moldavia",
		"es-BO": "Moldavia",
		"es-BR": "Moldavia",
		"es-BZ": "Moldavia",
		"es-CL": "Moldavia",
		"es-CO": "Moldavia",
		"es-CR": "Moldavia",
		"es-CU": "Moldavia",
		"es-DO": "Moldavia",
		"es-EC": "Moldavia",
		"es-GT": "Moldavia",
		"es-HN": "Moldavia",
		"es-MX": "Moldavia",
		"es-NI": "Moldavia",
		"es-PA": "Moldavia",
		"es-PE": "Moldavia",
		"es-PR": "Moldavia",
		"es-PY": "Moldavia",
		"es-SV": "Moldavia",
		"es-US": "Moldavia",
		"es-UY": "Moldavia",
		"es-VE": "Moldavia",
		"en-US": "Moldova",
		"fr-FR": "Moldavie",
		"fr-BE": "Moldavie",
		"fr-CA": "Moldavie",
		"fr-CH": "Moldavie",
		"fr-LU": "Moldavie",
		"fr-MC": "Moldavie",
		"it-IT": "Moldavia",
		"it-CH": "Moldavia",
		"it-SM": "Moldavia",
		"it-VA": "Moldavia",
		"de-DE": "Republik Moldau",
		"de-AT": "Republik Moldau",
		"de-CH": "Republik Moldau",
		"de-BE": "Republik Moldau",
		"de-LI": "Republik Moldau",
		"de-LU": "Republik Moldau"
	},
	"callingCode": "373",
	"phoneMasks": [
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"22|3"
			]
		},
		{
			"mask": "### ## ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[25-7]"
			]
		},
		{
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[89]"
			]
		}
	]
} satisfies Country;
