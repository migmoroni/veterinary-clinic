import type { Country } from './types.js';

export const MWI = {
	"code": "MWI",
	"labels": {
		"pt-BR": "Malaui",
		"pt-PT": "Maláui",
		"es-ES": "Malaui",
		"es-419": "Malaui",
		"es-AR": "Malaui",
		"es-BO": "Malaui",
		"es-BR": "Malaui",
		"es-BZ": "Malaui",
		"es-CL": "Malaui",
		"es-CO": "Malaui",
		"es-CR": "Malaui",
		"es-CU": "Malaui",
		"es-DO": "Malaui",
		"es-EC": "Malaui",
		"es-GT": "Malaui",
		"es-HN": "Malaui",
		"es-MX": "Malaui",
		"es-NI": "Malaui",
		"es-PA": "Malaui",
		"es-PE": "Malaui",
		"es-PR": "Malaui",
		"es-PY": "Malaui",
		"es-SV": "Malaui",
		"es-US": "Malaui",
		"es-UY": "Malaui",
		"es-VE": "Malaui",
		"en-US": "Malawi",
		"fr-FR": "Malawi",
		"fr-BE": "Malawi",
		"fr-CA": "Malawi",
		"fr-CH": "Malawi",
		"fr-LU": "Malawi",
		"fr-MC": "Malawi",
		"it-IT": "Malawi",
		"it-CH": "Malawi",
		"it-SM": "Malawi",
		"it-VA": "Malawi",
		"de-DE": "Malawi",
		"de-AT": "Malawi",
		"de-CH": "Malawi",
		"de-BE": "Malawi",
		"de-LI": "Malawi",
		"de-LU": "Malawi"
	},
	"callingCode": "265",
	"phoneMasks": [
		{
			"mask": "# ### ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"1[2-9]"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[137-9]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2"
			]
		}
	]
} satisfies Country;
