import type { Country } from './types.js';

export const BIH = {
	"code": "BIH",
	"labels": {
		"pt-BR": "Bósnia e Herzegovina",
		"pt-PT": "Bósnia e Herzegovina",
		"es-ES": "Bosnia y Herzegovina",
		"es-419": "Bosnia-Herzegovina",
		"es-AR": "Bosnia y Herzegovina",
		"es-BO": "Bosnia y Herzegovina",
		"es-BR": "Bosnia-Herzegovina",
		"es-BZ": "Bosnia-Herzegovina",
		"es-CL": "Bosnia y Herzegovina",
		"es-CO": "Bosnia y Herzegovina",
		"es-CR": "Bosnia y Herzegovina",
		"es-CU": "Bosnia-Herzegovina",
		"es-DO": "Bosnia y Herzegovina",
		"es-EC": "Bosnia y Herzegovina",
		"es-GT": "Bosnia y Herzegovina",
		"es-HN": "Bosnia y Herzegovina",
		"es-MX": "Bosnia y Herzegovina",
		"es-NI": "Bosnia y Herzegovina",
		"es-PA": "Bosnia y Herzegovina",
		"es-PE": "Bosnia y Herzegovina",
		"es-PR": "Bosnia-Herzegovina",
		"es-PY": "Bosnia y Herzegovina",
		"es-SV": "Bosnia-Herzegovina",
		"es-US": "Bosnia y Herzegovina",
		"es-UY": "Bosnia-Herzegovina",
		"es-VE": "Bosnia y Herzegovina",
		"en-US": "Bosnia & Herzegovina",
		"fr-FR": "Bosnie-Herzégovine",
		"fr-BE": "Bosnie-Herzégovine",
		"fr-CA": "Bosnie-Herzégovine",
		"fr-CH": "Bosnie-Herzégovine",
		"fr-LU": "Bosnie-Herzégovine",
		"fr-MC": "Bosnie-Herzégovine",
		"it-IT": "Bosnia ed Erzegovina",
		"it-CH": "Bosnia ed Erzegovina",
		"it-SM": "Bosnia ed Erzegovina",
		"it-VA": "Bosnia ed Erzegovina",
		"de-DE": "Bosnien und Herzegowina",
		"de-AT": "Bosnien und Herzegowina",
		"de-CH": "Bosnien und Herzegowina",
		"de-BE": "Bosnien und Herzegowina",
		"de-LI": "Bosnien und Herzegowina",
		"de-LU": "Bosnien und Herzegowina"
	},
	"callingCode": "387",
	"phoneMasks": [
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"6[1-3]|[7-9]"
			]
		},
		{
			"mask": "## ###-###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[3-5]|6[56]"
			]
		},
		{
			"mask": "## ## ## ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6"
			]
		}
	]
} satisfies Country;
