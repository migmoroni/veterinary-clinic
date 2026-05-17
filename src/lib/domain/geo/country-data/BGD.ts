import type { Country } from './types.js';

export const BGD = {
	"code": "BGD",
	"labels": {
		"pt-BR": "Bangladesh",
		"pt-PT": "Bangladeche",
		"es-ES": "Bangladés",
		"es-419": "Bangladés",
		"es-AR": "Bangladés",
		"es-BO": "Bangladés",
		"es-BR": "Bangladés",
		"es-BZ": "Bangladés",
		"es-CL": "Bangladés",
		"es-CO": "Bangladés",
		"es-CR": "Bangladés",
		"es-CU": "Bangladés",
		"es-DO": "Bangladés",
		"es-EC": "Bangladés",
		"es-GT": "Bangladés",
		"es-HN": "Bangladés",
		"es-MX": "Bangladés",
		"es-NI": "Bangladés",
		"es-PA": "Bangladés",
		"es-PE": "Bangladés",
		"es-PR": "Bangladés",
		"es-PY": "Bangladés",
		"es-SV": "Bangladés",
		"es-US": "Bangladés",
		"es-UY": "Bangladés",
		"es-VE": "Bangladés",
		"en-US": "Bangladesh",
		"fr-FR": "Bangladesh",
		"fr-BE": "Bangladesh",
		"fr-CA": "Bangladesh",
		"fr-CH": "Bangladesh",
		"fr-LU": "Bangladesh",
		"fr-MC": "Bangladesh",
		"it-IT": "Bangladesh",
		"it-CH": "Bangladesh",
		"it-SM": "Bangladesh",
		"it-VA": "Bangladesh",
		"de-DE": "Bangladesch",
		"de-AT": "Bangladesch",
		"de-CH": "Bangladesch",
		"de-BE": "Bangladesch",
		"de-LI": "Bangladesch",
		"de-LU": "Bangladesch"
	},
	"callingCode": "880",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "##-######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"31[5-8]|[459]1"
			]
		},
		{
			"mask": "#-########",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "###-#######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"3(?:[67]|8[013-9])|4(?:6[168]|7|[89][18])|5(?:6[128]|9)|6(?:[15]|28|4[14])|7[2-589]|8(?:0[014-9]|[12])|9[358]|(?:3[2-5]|4[235]|5[2-578]|6[0389]|76|8[3-7]|9[24])1|(?:44|66)[01346-9]"
			]
		},
		{
			"mask": "####-######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[13-9]|2[23]"
			]
		}
	]
} satisfies Country;
