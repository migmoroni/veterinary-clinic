import type { Country } from './types.js';

export const LIE = {
	"code": "LIE",
	"labels": {
		"pt-BR": "Liechtenstein",
		"pt-PT": "Listenstaine",
		"es-ES": "Liechtenstein",
		"es-419": "Liechtenstein",
		"es-AR": "Liechtenstein",
		"es-BO": "Liechtenstein",
		"es-BR": "Liechtenstein",
		"es-BZ": "Liechtenstein",
		"es-CL": "Liechtenstein",
		"es-CO": "Liechtenstein",
		"es-CR": "Liechtenstein",
		"es-CU": "Liechtenstein",
		"es-DO": "Liechtenstein",
		"es-EC": "Liechtenstein",
		"es-GT": "Liechtenstein",
		"es-HN": "Liechtenstein",
		"es-MX": "Liechtenstein",
		"es-NI": "Liechtenstein",
		"es-PA": "Liechtenstein",
		"es-PE": "Liechtenstein",
		"es-PR": "Liechtenstein",
		"es-PY": "Liechtenstein",
		"es-SV": "Liechtenstein",
		"es-US": "Liechtenstein",
		"es-UY": "Liechtenstein",
		"es-VE": "Liechtenstein",
		"en-US": "Liechtenstein",
		"fr-FR": "Liechtenstein",
		"fr-BE": "Liechtenstein",
		"fr-CA": "Liechtenstein",
		"fr-CH": "Liechtenstein",
		"fr-LU": "Liechtenstein",
		"fr-MC": "Liechtenstein",
		"it-IT": "Liechtenstein",
		"it-CH": "Liechtenstein",
		"it-SM": "Liechtenstein",
		"it-VA": "Liechtenstein",
		"de-DE": "Liechtenstein",
		"de-AT": "Liechtenstein",
		"de-CH": "Liechtenstein",
		"de-BE": "Liechtenstein",
		"de-LI": "Liechtenstein",
		"de-LU": "Liechtenstein"
	},
	"callingCode": "423",
	"phoneMasks": [
		{
			"mask": "### ## ##",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[2379]|8(?:0[09]|7)",
				"[2379]|8(?:0(?:02|9)|7)"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"69"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6"
			]
		}
	]
} satisfies Country;
