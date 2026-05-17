import type { Country } from './types.js';

export const LUX = {
	"code": "LUX",
	"labels": {
		"pt-BR": "Luxemburgo",
		"pt-PT": "Luxemburgo",
		"es-ES": "Luxemburgo",
		"es-419": "Luxemburgo",
		"es-AR": "Luxemburgo",
		"es-BO": "Luxemburgo",
		"es-BR": "Luxemburgo",
		"es-BZ": "Luxemburgo",
		"es-CL": "Luxemburgo",
		"es-CO": "Luxemburgo",
		"es-CR": "Luxemburgo",
		"es-CU": "Luxemburgo",
		"es-DO": "Luxemburgo",
		"es-EC": "Luxemburgo",
		"es-GT": "Luxemburgo",
		"es-HN": "Luxemburgo",
		"es-MX": "Luxemburgo",
		"es-NI": "Luxemburgo",
		"es-PA": "Luxemburgo",
		"es-PE": "Luxemburgo",
		"es-PR": "Luxemburgo",
		"es-PY": "Luxemburgo",
		"es-SV": "Luxemburgo",
		"es-US": "Luxemburgo",
		"es-UY": "Luxemburgo",
		"es-VE": "Luxemburgo",
		"en-US": "Luxembourg",
		"fr-FR": "Luxembourg",
		"fr-BE": "Luxembourg",
		"fr-CA": "Luxembourg",
		"fr-CH": "Luxembourg",
		"fr-LU": "Luxembourg",
		"fr-MC": "Luxembourg",
		"it-IT": "Lussemburgo",
		"it-CH": "Lussemburgo",
		"it-SM": "Lussemburgo",
		"it-VA": "Lussemburgo",
		"de-DE": "Luxemburg",
		"de-AT": "Luxemburg",
		"de-CH": "Luxemburg",
		"de-BE": "Luxemburg",
		"de-LI": "Luxemburg",
		"de-LU": "Luxemburg"
	},
	"callingCode": "352",
	"phoneMasks": [
		{
			"mask": "####",
			"minLength": 4,
			"maxLength": 4
		},
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])"
			]
		},
		{
			"mask": "## ## ##",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])"
			]
		},
		{
			"mask": "## ## ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"20[2-689]"
			]
		},
		{
			"mask": "## ## ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2(?:[0367]|4[3-8])"
			]
		},
		{
			"mask": "### ## ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"80[01]|90[015]"
			]
		},
		{
			"mask": "## ## ## ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"20"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6"
			]
		},
		{
			"mask": "## ## ## ## ##",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2(?:[0367]|4[3-8])"
			]
		},
		{
			"mask": "## ## ## #####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"[3-57]|8[13-9]|9(?:0[89]|[2-579])|(?:2|80)[2-9]"
			]
		}
	]
} satisfies Country;
