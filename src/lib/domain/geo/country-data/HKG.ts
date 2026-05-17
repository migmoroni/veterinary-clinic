import type { Country } from './types.js';

export const HKG = {
	"code": "HKG",
	"labels": {
		"pt-BR": "Hong Kong, RAE da China",
		"pt-PT": "Hong Kong, RAE da China",
		"es-ES": "RAE de Hong Kong (China)",
		"es-419": "RAE de Hong Kong (China)",
		"es-AR": "RAE de Hong Kong (China)",
		"es-BO": "RAE de Hong Kong (China)",
		"es-BR": "RAE de Hong Kong (China)",
		"es-BZ": "RAE de Hong Kong (China)",
		"es-CL": "RAE de Hong Kong (China)",
		"es-CO": "RAE de Hong Kong (China)",
		"es-CR": "RAE de Hong Kong (China)",
		"es-CU": "RAE de Hong Kong (China)",
		"es-DO": "RAE de Hong Kong (China)",
		"es-EC": "RAE de Hong Kong (China)",
		"es-GT": "RAE de Hong Kong (China)",
		"es-HN": "RAE de Hong Kong (China)",
		"es-MX": "RAE de Hong Kong (China)",
		"es-NI": "RAE de Hong Kong (China)",
		"es-PA": "RAE de Hong Kong (China)",
		"es-PE": "RAE de Hong Kong (China)",
		"es-PR": "RAE de Hong Kong (China)",
		"es-PY": "RAE de Hong Kong (China)",
		"es-SV": "RAE de Hong Kong (China)",
		"es-US": "RAE de Hong Kong (China)",
		"es-UY": "RAE de Hong Kong (China)",
		"es-VE": "RAE de Hong Kong (China)",
		"en-US": "Hong Kong SAR China",
		"fr-FR": "R.A.S. chinoise de Hong Kong",
		"fr-BE": "R.A.S. chinoise de Hong Kong",
		"fr-CA": "R.A.S. chinoise de Hong Kong",
		"fr-CH": "R.A.S. chinoise de Hong Kong",
		"fr-LU": "R.A.S. chinoise de Hong Kong",
		"fr-MC": "R.A.S. chinoise de Hong Kong",
		"it-IT": "RAS di Hong Kong",
		"it-CH": "RAS di Hong Kong",
		"it-SM": "RAS di Hong Kong",
		"it-VA": "RAS di Hong Kong",
		"de-DE": "Sonderverwaltungsregion Hongkong",
		"de-AT": "Sonderverwaltungsregion Hongkong",
		"de-CH": "Sonderverwaltungsregion Hongkong",
		"de-BE": "Sonderverwaltungsregion Hongkong",
		"de-LI": "Sonderverwaltungsregion Hongkong",
		"de-LU": "Sonderverwaltungsregion Hongkong"
	},
	"callingCode": "852",
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
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"900",
				"9003"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[2-7]|8[1-4]|9(?:0[1-9]|[1-8])"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "### ## ### ###",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"9"
			]
		}
	]
} satisfies Country;
