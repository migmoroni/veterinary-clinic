import type { Country } from './types.js';

export const ECU = {
	"code": "ECU",
	"labels": {
		"pt-BR": "Equador",
		"pt-PT": "Equador",
		"es-ES": "Ecuador",
		"es-419": "Ecuador",
		"es-AR": "Ecuador",
		"es-BO": "Ecuador",
		"es-BR": "Ecuador",
		"es-BZ": "Ecuador",
		"es-CL": "Ecuador",
		"es-CO": "Ecuador",
		"es-CR": "Ecuador",
		"es-CU": "Ecuador",
		"es-DO": "Ecuador",
		"es-EC": "Ecuador",
		"es-GT": "Ecuador",
		"es-HN": "Ecuador",
		"es-MX": "Ecuador",
		"es-NI": "Ecuador",
		"es-PA": "Ecuador",
		"es-PE": "Ecuador",
		"es-PR": "Ecuador",
		"es-PY": "Ecuador",
		"es-SV": "Ecuador",
		"es-US": "Ecuador",
		"es-UY": "Ecuador",
		"es-VE": "Ecuador",
		"en-US": "Ecuador",
		"fr-FR": "Équateur",
		"fr-BE": "Équateur",
		"fr-CA": "Équateur",
		"fr-CH": "Équateur",
		"fr-LU": "Équateur",
		"fr-MC": "Équateur",
		"it-IT": "Ecuador",
		"it-CH": "Ecuador",
		"it-SM": "Ecuador",
		"it-VA": "Ecuador",
		"de-DE": "Ecuador",
		"de-AT": "Ecuador",
		"de-CH": "Ecuador",
		"de-BE": "Ecuador",
		"de-LI": "Ecuador",
		"de-LU": "Ecuador"
	},
	"callingCode": "593",
	"phoneMasks": [
		{
			"mask": "# ###-####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[2-7]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "#### ### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
