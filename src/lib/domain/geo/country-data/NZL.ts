import type { Country } from './types.js';

export const NZL = {
	"code": "NZL",
	"labels": {
		"pt-BR": "Nova Zelândia",
		"pt-PT": "Nova Zelândia",
		"es-ES": "Nueva Zelanda",
		"es-419": "Nueva Zelanda",
		"es-AR": "Nueva Zelanda",
		"es-BO": "Nueva Zelanda",
		"es-BR": "Nueva Zelanda",
		"es-BZ": "Nueva Zelanda",
		"es-CL": "Nueva Zelanda",
		"es-CO": "Nueva Zelanda",
		"es-CR": "Nueva Zelanda",
		"es-CU": "Nueva Zelanda",
		"es-DO": "Nueva Zelanda",
		"es-EC": "Nueva Zelanda",
		"es-GT": "Nueva Zelanda",
		"es-HN": "Nueva Zelanda",
		"es-MX": "Nueva Zelanda",
		"es-NI": "Nueva Zelanda",
		"es-PA": "Nueva Zelanda",
		"es-PE": "Nueva Zelanda",
		"es-PR": "Nueva Zelanda",
		"es-PY": "Nueva Zelanda",
		"es-SV": "Nueva Zelanda",
		"es-US": "Nueva Zelanda",
		"es-UY": "Nueva Zelanda",
		"es-VE": "Nueva Zelanda",
		"en-US": "New Zealand",
		"fr-FR": "Nouvelle-Zélande",
		"fr-BE": "Nouvelle-Zélande",
		"fr-CA": "Nouvelle-Zélande",
		"fr-CH": "Nouvelle-Zélande",
		"fr-LU": "Nouvelle-Zélande",
		"fr-MC": "Nouvelle-Zélande",
		"it-IT": "Nuova Zelanda",
		"it-CH": "Nuova Zelanda",
		"it-SM": "Nuova Zelanda",
		"it-VA": "Nuova Zelanda",
		"de-DE": "Neuseeland",
		"de-AT": "Neuseeland",
		"de-CH": "Neuseeland",
		"de-BE": "Neuseeland",
		"de-LI": "Neuseeland",
		"de-LU": "Neuseeland"
	},
	"callingCode": "64",
	"phoneMasks": [
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5
		},
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
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"24|[346]|7[2-57-9]|9[2-9]"
			]
		},
		{
			"mask": "### ## ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"50[036-8]|8|90",
				"50(?:[0367]|88)|8|90"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "## ### #####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2(?:[169]|7[0-35-9])|7"
			]
		},
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1|2[028]"
			]
		},
		{
			"mask": "## ########",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8[1-79]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2(?:10|74)|[589]"
			]
		}
	]
} satisfies Country;
