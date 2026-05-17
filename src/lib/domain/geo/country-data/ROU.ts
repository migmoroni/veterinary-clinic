import type { Country } from './types.js';

export const ROU = {
	"code": "ROU",
	"labels": {
		"pt-BR": "Romênia",
		"pt-PT": "Roménia",
		"es-ES": "Rumanía",
		"es-419": "Rumania",
		"es-AR": "Rumania",
		"es-BO": "Rumania",
		"es-BR": "Rumania",
		"es-BZ": "Rumania",
		"es-CL": "Rumania",
		"es-CO": "Rumania",
		"es-CR": "Rumania",
		"es-CU": "Rumania",
		"es-DO": "Rumania",
		"es-EC": "Rumania",
		"es-GT": "Rumania",
		"es-HN": "Rumania",
		"es-MX": "Rumania",
		"es-NI": "Rumania",
		"es-PA": "Rumania",
		"es-PE": "Rumania",
		"es-PR": "Rumania",
		"es-PY": "Rumania",
		"es-SV": "Rumania",
		"es-US": "Rumania",
		"es-UY": "Rumania",
		"es-VE": "Rumania",
		"en-US": "Romania",
		"fr-FR": "Roumanie",
		"fr-BE": "Roumanie",
		"fr-CA": "Roumanie",
		"fr-CH": "Roumanie",
		"fr-LU": "Roumanie",
		"fr-MC": "Roumanie",
		"it-IT": "Romania",
		"it-CH": "Romania",
		"it-SM": "Romania",
		"it-VA": "Romania",
		"de-DE": "Rumänien",
		"de-AT": "Rumänien",
		"de-CH": "Rumänien",
		"de-BE": "Rumänien",
		"de-LI": "Rumänien",
		"de-LU": "Rumänien"
	},
	"callingCode": "40",
	"phoneMasks": [
		{
			"mask": "## ####",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"219|31"
			]
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"2[3-6]",
				"2[3-6]\\d9"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[23]1"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[236-9]"
			]
		}
	]
} satisfies Country;
