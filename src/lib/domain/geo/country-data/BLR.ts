import type { Country } from './types.js';

export const BLR = {
	"code": "BLR",
	"labels": {
		"pt-BR": "Bielorrússia",
		"pt-PT": "Bielorrússia",
		"es-ES": "Bielorrusia",
		"es-419": "Bielorrusia",
		"es-AR": "Bielorrusia",
		"es-BO": "Bielorrusia",
		"es-BR": "Bielorrusia",
		"es-BZ": "Bielorrusia",
		"es-CL": "Bielorrusia",
		"es-CO": "Bielorrusia",
		"es-CR": "Bielorrusia",
		"es-CU": "Bielorrusia",
		"es-DO": "Bielorrusia",
		"es-EC": "Bielorrusia",
		"es-GT": "Bielorrusia",
		"es-HN": "Bielorrusia",
		"es-MX": "Bielorrusia",
		"es-NI": "Bielorrusia",
		"es-PA": "Bielorrusia",
		"es-PE": "Bielorrusia",
		"es-PR": "Bielorrusia",
		"es-PY": "Bielorrusia",
		"es-SV": "Bielorrusia",
		"es-US": "Bielorrusia",
		"es-UY": "Bielorrusia",
		"es-VE": "Bielorrusia",
		"en-US": "Belarus",
		"fr-FR": "Biélorussie",
		"fr-BE": "Biélorussie",
		"fr-CA": "Bélarus",
		"fr-CH": "Biélorussie",
		"fr-LU": "Biélorussie",
		"fr-MC": "Biélorussie",
		"it-IT": "Bielorussia",
		"it-CH": "Bielorussia",
		"it-SM": "Bielorussia",
		"it-VA": "Bielorussia",
		"de-DE": "Belarus",
		"de-AT": "Belarus",
		"de-CH": "Belarus",
		"de-BE": "Belarus",
		"de-LI": "Belarus",
		"de-LU": "Belarus"
	},
	"callingCode": "375",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"800"
			]
		},
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "## ###-##-##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[1-4]"
			]
		},
		{
			"mask": "### ## ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"800"
			]
		},
		{
			"mask": "### ##-##-##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1(?:[56]|7[467])|2[1-3]"
			]
		},
		{
			"mask": "#### ##-###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1(?:5[169]|6[3-5]|7[179])|2(?:1[35]|2[34]|3[3-5])",
				"1(?:5[169]|6(?:3[1-3]|4|5[125])|7(?:1[3-9]|7[0-24-6]|9[2-7]))|2(?:1[35]|2[34]|3[3-5])"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"[89]"
			]
		}
	]
} satisfies Country;
