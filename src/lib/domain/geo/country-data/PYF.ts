import type { Country } from './types.js';

export const PYF = {
	"code": "PYF",
	"labels": {
		"pt-BR": "Polinésia Francesa",
		"pt-PT": "Polinésia Francesa",
		"es-ES": "Polinesia Francesa",
		"es-419": "Polinesia Francesa",
		"es-AR": "Polinesia Francesa",
		"es-BO": "Polinesia Francesa",
		"es-BR": "Polinesia Francesa",
		"es-BZ": "Polinesia Francesa",
		"es-CL": "Polinesia Francesa",
		"es-CO": "Polinesia Francesa",
		"es-CR": "Polinesia Francesa",
		"es-CU": "Polinesia Francesa",
		"es-DO": "Polinesia Francesa",
		"es-EC": "Polinesia Francesa",
		"es-GT": "Polinesia Francesa",
		"es-HN": "Polinesia Francesa",
		"es-MX": "Polinesia Francesa",
		"es-NI": "Polinesia Francesa",
		"es-PA": "Polinesia Francesa",
		"es-PE": "Polinesia Francesa",
		"es-PR": "Polinesia Francesa",
		"es-PY": "Polinesia Francesa",
		"es-SV": "Polinesia Francesa",
		"es-US": "Polinesia Francesa",
		"es-UY": "Polinesia Francesa",
		"es-VE": "Polinesia Francesa",
		"en-US": "French Polynesia",
		"fr-FR": "Polynésie française",
		"fr-BE": "Polynésie française",
		"fr-CA": "Polynésie française",
		"fr-CH": "Polynésie française",
		"fr-LU": "Polynésie française",
		"fr-MC": "Polynésie française",
		"it-IT": "Polinesia Francese",
		"it-CH": "Polinesia Francese",
		"it-SM": "Polinesia Francese",
		"it-VA": "Polinesia Francese",
		"de-DE": "Französisch-Polynesien",
		"de-AT": "Französisch-Polynesien",
		"de-CH": "Französisch-Polynesien",
		"de-BE": "Französisch-Polynesien",
		"de-LI": "Französisch-Polynesien",
		"de-LU": "Französisch-Polynesien"
	},
	"callingCode": "689",
	"phoneMasks": [
		{
			"mask": "## ## ##",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"44"
			]
		},
		{
			"mask": "## ## ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"4|8[7-9]"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
