import type { Country } from './types.js';

export const KOR = {
	"code": "KOR",
	"labels": {
		"pt-BR": "Coreia do Sul",
		"pt-PT": "Coreia do Sul",
		"es-ES": "Corea del Sur",
		"es-419": "Corea del Sur",
		"es-AR": "Corea del Sur",
		"es-BO": "Corea del Sur",
		"es-BR": "Corea del Sur",
		"es-BZ": "Corea del Sur",
		"es-CL": "Corea del Sur",
		"es-CO": "Corea del Sur",
		"es-CR": "Corea del Sur",
		"es-CU": "Corea del Sur",
		"es-DO": "Corea del Sur",
		"es-EC": "Corea del Sur",
		"es-GT": "Corea del Sur",
		"es-HN": "Corea del Sur",
		"es-MX": "Corea del Sur",
		"es-NI": "Corea del Sur",
		"es-PA": "Corea del Sur",
		"es-PE": "Corea del Sur",
		"es-PR": "Corea del Sur",
		"es-PY": "Corea del Sur",
		"es-SV": "Corea del Sur",
		"es-US": "Corea del Sur",
		"es-UY": "Corea del Sur",
		"es-VE": "Corea del Sur",
		"en-US": "South Korea",
		"fr-FR": "Corée du Sud",
		"fr-BE": "Corée du Sud",
		"fr-CA": "Corée du Sud",
		"fr-CH": "Corée du Sud",
		"fr-LU": "Corée du Sud",
		"fr-MC": "Corée du Sud",
		"it-IT": "Corea del Sud",
		"it-CH": "Corea del Sud",
		"it-SM": "Corea del Sud",
		"it-VA": "Corea del Sud",
		"de-DE": "Südkorea",
		"de-AT": "Südkorea",
		"de-CH": "Südkorea",
		"de-BE": "Südkorea",
		"de-LI": "Südkorea",
		"de-LU": "Südkorea"
	},
	"callingCode": "82",
	"phoneMasks": [
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5
		},
		{
			"mask": "##-####",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"(?:3[1-3]|[46][1-4]|5[1-5])1"
			]
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "#-####-####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "##-###-####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[36]0|8"
			]
		},
		{
			"mask": "##-####-####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[1346]|5[1-5]"
			]
		},
		{
			"mask": "##-####-####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[57]"
			]
		},
		{
			"mask": "##-#####-####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"5"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		},
		{
			"mask": "# ### ### ### ###",
			"minLength": 13,
			"maxLength": 13
		},
		{
			"mask": "## ### ### ### ###",
			"minLength": 14,
			"maxLength": 14
		}
	]
} satisfies Country;
