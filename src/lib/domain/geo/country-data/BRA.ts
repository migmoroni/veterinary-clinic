import type { Country } from './types.js';

export const BRA = {
	"code": "BRA",
	"labels": {
		"pt-BR": "Brasil",
		"pt-PT": "Brasil",
		"es-ES": "Brasil",
		"es-419": "Brasil",
		"es-AR": "Brasil",
		"es-BO": "Brasil",
		"es-BR": "Brasil",
		"es-BZ": "Brasil",
		"es-CL": "Brasil",
		"es-CO": "Brasil",
		"es-CR": "Brasil",
		"es-CU": "Brasil",
		"es-DO": "Brasil",
		"es-EC": "Brasil",
		"es-GT": "Brasil",
		"es-HN": "Brasil",
		"es-MX": "Brasil",
		"es-NI": "Brasil",
		"es-PA": "Brasil",
		"es-PE": "Brasil",
		"es-PR": "Brasil",
		"es-PY": "Brasil",
		"es-SV": "Brasil",
		"es-US": "Brasil",
		"es-UY": "Brasil",
		"es-VE": "Brasil",
		"en-US": "Brazil",
		"fr-FR": "Brésil",
		"fr-BE": "Brésil",
		"fr-CA": "Brésil",
		"fr-CH": "Brésil",
		"fr-LU": "Brésil",
		"fr-MC": "Brésil",
		"it-IT": "Brasile",
		"it-CH": "Brasile",
		"it-SM": "Brasile",
		"it-VA": "Brasile",
		"de-DE": "Brasilien",
		"de-AT": "Brasilien",
		"de-CH": "Brasilien",
		"de-BE": "Brasilien",
		"de-LI": "Brasilien",
		"de-LU": "Brasilien"
	},
	"callingCode": "55",
	"phoneMasks": [
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"300|4(?:0[02]|37)",
				"4(?:02|37)0|[34]00"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "(##) ####-####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"(?:[14689][1-9]|2[12478]|3[1-578]|5[13-5]|7[13-579])[2-57]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"(?:[358]|90)0"
			]
		},
		{
			"mask": "(##) #####-####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"[16][1-9]|[2-57-9]"
			]
		}
	]
} satisfies Country;
