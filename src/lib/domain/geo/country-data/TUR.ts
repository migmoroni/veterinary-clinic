import type { Country } from './types.js';

export const TUR = {
	"code": "TUR",
	"labels": {
		"pt-BR": "Turquia",
		"pt-PT": "Turquia",
		"es-ES": "Turquía",
		"es-419": "Turquía",
		"es-AR": "Turquía",
		"es-BO": "Turquía",
		"es-BR": "Turquía",
		"es-BZ": "Turquía",
		"es-CL": "Turquía",
		"es-CO": "Turquía",
		"es-CR": "Turquía",
		"es-CU": "Turquía",
		"es-DO": "Turquía",
		"es-EC": "Turquía",
		"es-GT": "Turquía",
		"es-HN": "Turquía",
		"es-MX": "Turquía",
		"es-NI": "Turquía",
		"es-PA": "Turquía",
		"es-PE": "Turquía",
		"es-PR": "Turquía",
		"es-PY": "Turquía",
		"es-SV": "Turquía",
		"es-US": "Turquía",
		"es-UY": "Turquía",
		"es-VE": "Turquía",
		"en-US": "Türkiye",
		"fr-FR": "Turquie",
		"fr-BE": "Turquie",
		"fr-CA": "Turquie",
		"fr-CH": "Turquie",
		"fr-LU": "Turquie",
		"fr-MC": "Turquie",
		"it-IT": "Turchia",
		"it-CH": "Turchia",
		"it-SM": "Turchia",
		"it-VA": "Turchia",
		"de-DE": "Türkei",
		"de-AT": "Türkei",
		"de-CH": "Türkei",
		"de-BE": "Türkei",
		"de-LI": "Türkei",
		"de-LU": "Türkei"
	},
	"callingCode": "90",
	"phoneMasks": [
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "### ### ## ##",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"5(?:[0-59]|61)",
				"5(?:[0-59]|61[06])",
				"5(?:[0-59]|61[06]1)"
			]
		},
		{
			"mask": "### ### ## ##",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[24][1-8]|3[1-9]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"512|8[01589]|90"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		},
		{
			"mask": "### ### #######",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"80"
			]
		}
	]
} satisfies Country;
