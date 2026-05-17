import type { Country } from './types.js';

export const UKR = {
	"code": "UKR",
	"labels": {
		"pt-BR": "Ucrânia",
		"pt-PT": "Ucrânia",
		"es-ES": "Ucrania",
		"es-419": "Ucrania",
		"es-AR": "Ucrania",
		"es-BO": "Ucrania",
		"es-BR": "Ucrania",
		"es-BZ": "Ucrania",
		"es-CL": "Ucrania",
		"es-CO": "Ucrania",
		"es-CR": "Ucrania",
		"es-CU": "Ucrania",
		"es-DO": "Ucrania",
		"es-EC": "Ucrania",
		"es-GT": "Ucrania",
		"es-HN": "Ucrania",
		"es-MX": "Ucrania",
		"es-NI": "Ucrania",
		"es-PA": "Ucrania",
		"es-PE": "Ucrania",
		"es-PR": "Ucrania",
		"es-PY": "Ucrania",
		"es-SV": "Ucrania",
		"es-US": "Ucrania",
		"es-UY": "Ucrania",
		"es-VE": "Ucrania",
		"en-US": "Ukraine",
		"fr-FR": "Ukraine",
		"fr-BE": "Ukraine",
		"fr-CA": "Ukraine",
		"fr-CH": "Ukraine",
		"fr-LU": "Ukraine",
		"fr-MC": "Ukraine",
		"it-IT": "Ucraina",
		"it-CH": "Ucraina",
		"it-SM": "Ucraina",
		"it-VA": "Ucraina",
		"de-DE": "Ukraine",
		"de-AT": "Ukraine",
		"de-CH": "Ukraine",
		"de-BE": "Ukraine",
		"de-LI": "Ukraine",
		"de-LU": "Ukraine"
	},
	"callingCode": "380",
	"phoneMasks": [
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[3-7]|89|9[1-9]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6[12][29]|(?:3[1-8]|4[136-8]|5[12457]|6[49])2|(?:56|65)[24]",
				"6[12][29]|(?:35|4[1378]|5[12457]|6[49])2|(?:56|65)[24]|(?:3[1-46-8]|46)2[013-9]"
			]
		},
		{
			"mask": "#### #####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6[0135689]|7[4-6])|6(?:[12][3-7]|[459])",
				"3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6(?:[015689]|3[02389])|7[4-6])|6(?:[12][3-7]|[459])"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[89]"
			]
		}
	]
} satisfies Country;
