import type { Country } from './types.js';

export const IRL = {
	"code": "IRL",
	"labels": {
		"pt-BR": "Irlanda",
		"pt-PT": "Irlanda",
		"es-ES": "Irlanda",
		"es-419": "Irlanda",
		"es-AR": "Irlanda",
		"es-BO": "Irlanda",
		"es-BR": "Irlanda",
		"es-BZ": "Irlanda",
		"es-CL": "Irlanda",
		"es-CO": "Irlanda",
		"es-CR": "Irlanda",
		"es-CU": "Irlanda",
		"es-DO": "Irlanda",
		"es-EC": "Irlanda",
		"es-GT": "Irlanda",
		"es-HN": "Irlanda",
		"es-MX": "Irlanda",
		"es-NI": "Irlanda",
		"es-PA": "Irlanda",
		"es-PE": "Irlanda",
		"es-PR": "Irlanda",
		"es-PY": "Irlanda",
		"es-SV": "Irlanda",
		"es-US": "Irlanda",
		"es-UY": "Irlanda",
		"es-VE": "Irlanda",
		"en-US": "Ireland",
		"fr-FR": "Irlande",
		"fr-BE": "Irlande",
		"fr-CA": "Irlande",
		"fr-CH": "Irlande",
		"fr-LU": "Irlande",
		"fr-MC": "Irlande",
		"it-IT": "Irlanda",
		"it-CH": "Irlanda",
		"it-SM": "Irlanda",
		"it-VA": "Irlanda",
		"de-DE": "Irland",
		"de-AT": "Irland",
		"de-CH": "Irland",
		"de-BE": "Irland",
		"de-LI": "Irland",
		"de-LU": "Irland"
	},
	"callingCode": "353",
	"phoneMasks": [
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"2[24-9]|47|58|6[237-9]|9[35-9]"
			]
		},
		{
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[45]0"
			]
		},
		{
			"mask": "# #### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2569]|4[1-69]|7[14]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[78]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"70"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"81"
			]
		},
		{
			"mask": "## # ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"4"
			]
		},
		{
			"mask": "#### ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
