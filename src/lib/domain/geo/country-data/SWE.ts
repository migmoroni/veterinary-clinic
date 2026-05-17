import type { Country } from './types.js';

export const SWE = {
	"code": "SWE",
	"labels": {
		"pt-BR": "Suécia",
		"pt-PT": "Suécia",
		"es-ES": "Suecia",
		"es-419": "Suecia",
		"es-AR": "Suecia",
		"es-BO": "Suecia",
		"es-BR": "Suecia",
		"es-BZ": "Suecia",
		"es-CL": "Suecia",
		"es-CO": "Suecia",
		"es-CR": "Suecia",
		"es-CU": "Suecia",
		"es-DO": "Suecia",
		"es-EC": "Suecia",
		"es-GT": "Suecia",
		"es-HN": "Suecia",
		"es-MX": "Suecia",
		"es-NI": "Suecia",
		"es-PA": "Suecia",
		"es-PE": "Suecia",
		"es-PR": "Suecia",
		"es-PY": "Suecia",
		"es-SV": "Suecia",
		"es-US": "Suecia",
		"es-UY": "Suecia",
		"es-VE": "Suecia",
		"en-US": "Sweden",
		"fr-FR": "Suède",
		"fr-BE": "Suède",
		"fr-CA": "Suède",
		"fr-CH": "Suède",
		"fr-LU": "Suède",
		"fr-MC": "Suède",
		"it-IT": "Svezia",
		"it-CH": "Svezia",
		"it-SM": "Svezia",
		"it-VA": "Svezia",
		"de-DE": "Schweden",
		"de-AT": "Schweden",
		"de-CH": "Schweden",
		"de-BE": "Schweden",
		"de-LI": "Schweden",
		"de-LU": "Schweden"
	},
	"callingCode": "46",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "##-### ##",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"20"
			]
		},
		{
			"mask": "##-### ##",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[12][136]|3[356]|4[0246]|6[03]|90[1-9]"
			]
		},
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"9(?:00|39|44|9)"
			]
		},
		{
			"mask": "#-### ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "###-### ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1[2457]|2(?:[247-9]|5[0138])|3[0247-9]|4[1357-9]|5[0-35-9]|6(?:[125689]|4[02-57]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])"
			]
		},
		{
			"mask": "#-### ### ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "##-### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1[13689]|2[0136]|3[1356]|4[0246]|54|6[03]|90[1-9]"
			]
		},
		{
			"mask": "##-### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"10|7"
			]
		},
		{
			"mask": "###-## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[13-5]|2(?:[247-9]|5[0138])|6(?:[124-689]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])"
			]
		},
		{
			"mask": "###-### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9(?:00|39|44)"
			]
		},
		{
			"mask": "###-## ## ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "###-## ### ## ##",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"[26]"
			]
		}
	]
} satisfies Country;
