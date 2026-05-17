import type { Country } from './types.js';

export const COD = {
	"code": "COD",
	"labels": {
		"pt-BR": "Congo - Kinshasa",
		"pt-PT": "Congo-Kinshasa",
		"es-ES": "República Democrática del Congo",
		"es-419": "República Democrática del Congo",
		"es-AR": "República Democrática del Congo",
		"es-BO": "República Democrática del Congo",
		"es-BR": "República Democrática del Congo",
		"es-BZ": "República Democrática del Congo",
		"es-CL": "República Democrática del Congo",
		"es-CO": "República Democrática del Congo",
		"es-CR": "República Democrática del Congo",
		"es-CU": "República Democrática del Congo",
		"es-DO": "República Democrática del Congo",
		"es-EC": "República Democrática del Congo",
		"es-GT": "República Democrática del Congo",
		"es-HN": "República Democrática del Congo",
		"es-MX": "República Democrática del Congo",
		"es-NI": "República Democrática del Congo",
		"es-PA": "República Democrática del Congo",
		"es-PE": "República Democrática del Congo",
		"es-PR": "República Democrática del Congo",
		"es-PY": "República Democrática del Congo",
		"es-SV": "República Democrática del Congo",
		"es-US": "República Democrática del Congo",
		"es-UY": "República Democrática del Congo",
		"es-VE": "República Democrática del Congo",
		"en-US": "Congo - Kinshasa",
		"fr-FR": "Congo-Kinshasa",
		"fr-BE": "Congo-Kinshasa",
		"fr-CA": "Congo-Kinshasa",
		"fr-CH": "Congo-Kinshasa",
		"fr-LU": "Congo-Kinshasa",
		"fr-MC": "Congo-Kinshasa",
		"it-IT": "Congo - Kinshasa",
		"it-CH": "Congo - Kinshasa",
		"it-SM": "Congo - Kinshasa",
		"it-VA": "Congo - Kinshasa",
		"de-DE": "Kongo-Kinshasa",
		"de-AT": "Kongo-Kinshasa",
		"de-CH": "Kongo-Kinshasa",
		"de-BE": "Kongo-Kinshasa",
		"de-LI": "Kongo-Kinshasa",
		"de-LU": "Kongo-Kinshasa"
	},
	"callingCode": "243",
	"phoneMasks": [
		{
			"mask": "## ## ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"88"
			]
		},
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[1-6]"
			]
		},
		{
			"mask": "## ## ####",
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
				"1"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[89]"
			]
		},
		{
			"mask": "## ## ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"5"
			]
		}
	]
} satisfies Country;
