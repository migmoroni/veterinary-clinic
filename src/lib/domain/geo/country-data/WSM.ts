import type { Country } from './types.js';

export const WSM = {
	"code": "WSM",
	"labels": {
		"pt-BR": "Samoa",
		"pt-PT": "Samoa",
		"es-ES": "Samoa",
		"es-419": "Samoa",
		"es-AR": "Samoa",
		"es-BO": "Samoa",
		"es-BR": "Samoa",
		"es-BZ": "Samoa",
		"es-CL": "Samoa",
		"es-CO": "Samoa",
		"es-CR": "Samoa",
		"es-CU": "Samoa",
		"es-DO": "Samoa",
		"es-EC": "Samoa",
		"es-GT": "Samoa",
		"es-HN": "Samoa",
		"es-MX": "Samoa",
		"es-NI": "Samoa",
		"es-PA": "Samoa",
		"es-PE": "Samoa",
		"es-PR": "Samoa",
		"es-PY": "Samoa",
		"es-SV": "Samoa",
		"es-US": "Samoa",
		"es-UY": "Samoa",
		"es-VE": "Samoa",
		"en-US": "Samoa",
		"fr-FR": "Samoa",
		"fr-BE": "Samoa",
		"fr-CA": "Samoa",
		"fr-CH": "Samoa",
		"fr-LU": "Samoa",
		"fr-MC": "Samoa",
		"it-IT": "Samoa",
		"it-CH": "Samoa",
		"it-SM": "Samoa",
		"it-VA": "Samoa",
		"de-DE": "Samoa",
		"de-AT": "Samoa",
		"de-CH": "Samoa",
		"de-BE": "Samoa",
		"de-LI": "Samoa",
		"de-LU": "Samoa"
	},
	"callingCode": "685",
	"phoneMasks": [
		{
			"mask": "#####",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"[2-5]|6[1-9]"
			]
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"7"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[68]"
			]
		}
	]
} satisfies Country;
