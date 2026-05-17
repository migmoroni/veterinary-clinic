import type { Country } from './types.js';

export const KHM = {
	"code": "KHM",
	"labels": {
		"pt-BR": "Camboja",
		"pt-PT": "Camboja",
		"es-ES": "Camboya",
		"es-419": "Camboya",
		"es-AR": "Camboya",
		"es-BO": "Camboya",
		"es-BR": "Camboya",
		"es-BZ": "Camboya",
		"es-CL": "Camboya",
		"es-CO": "Camboya",
		"es-CR": "Camboya",
		"es-CU": "Camboya",
		"es-DO": "Camboya",
		"es-EC": "Camboya",
		"es-GT": "Camboya",
		"es-HN": "Camboya",
		"es-MX": "Camboya",
		"es-NI": "Camboya",
		"es-PA": "Camboya",
		"es-PE": "Camboya",
		"es-PR": "Camboya",
		"es-PY": "Camboya",
		"es-SV": "Camboya",
		"es-US": "Camboya",
		"es-UY": "Camboya",
		"es-VE": "Camboya",
		"en-US": "Cambodia",
		"fr-FR": "Cambodge",
		"fr-BE": "Cambodge",
		"fr-CA": "Cambodge",
		"fr-CH": "Cambodge",
		"fr-LU": "Cambodge",
		"fr-MC": "Cambodge",
		"it-IT": "Cambogia",
		"it-CH": "Cambogia",
		"it-SM": "Cambogia",
		"it-VA": "Cambogia",
		"de-DE": "Kambodscha",
		"de-AT": "Kambodscha",
		"de-CH": "Kambodscha",
		"de-BE": "Kambodscha",
		"de-LI": "Kambodscha",
		"de-LU": "Kambodscha"
	},
	"callingCode": "855",
	"phoneMasks": [
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[1-9]"
			]
		},
		{
			"mask": "#### ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
