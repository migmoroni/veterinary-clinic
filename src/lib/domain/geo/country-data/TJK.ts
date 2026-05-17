import type { Country } from './types.js';

export const TJK = {
	"code": "TJK",
	"labels": {
		"pt-BR": "Tadjiquistão",
		"pt-PT": "Tajiquistão",
		"es-ES": "Tayikistán",
		"es-419": "Tayikistán",
		"es-AR": "Tayikistán",
		"es-BO": "Tayikistán",
		"es-BR": "Tayikistán",
		"es-BZ": "Tayikistán",
		"es-CL": "Tayikistán",
		"es-CO": "Tayikistán",
		"es-CR": "Tayikistán",
		"es-CU": "Tayikistán",
		"es-DO": "Tayikistán",
		"es-EC": "Tayikistán",
		"es-GT": "Tayikistán",
		"es-HN": "Tayikistán",
		"es-MX": "Tayikistán",
		"es-NI": "Tayikistán",
		"es-PA": "Tayikistán",
		"es-PE": "Tayikistán",
		"es-PR": "Tayikistán",
		"es-PY": "Tayikistán",
		"es-SV": "Tayikistán",
		"es-US": "Tayikistán",
		"es-UY": "Tayikistán",
		"es-VE": "Tayikistán",
		"en-US": "Tajikistan",
		"fr-FR": "Tadjikistan",
		"fr-BE": "Tadjikistan",
		"fr-CA": "Tadjikistan",
		"fr-CH": "Tadjikistan",
		"fr-LU": "Tadjikistan",
		"fr-MC": "Tadjikistan",
		"it-IT": "Tagikistan",
		"it-CH": "Tagikistan",
		"it-SM": "Tagikistan",
		"it-VA": "Tagikistan",
		"de-DE": "Tadschikistan",
		"de-AT": "Tadschikistan",
		"de-CH": "Tadschikistan",
		"de-BE": "Tadschikistan",
		"de-LI": "Tadschikistan",
		"de-LU": "Tadschikistan"
	},
	"callingCode": "992",
	"phoneMasks": [
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[0-57-9]"
			]
		},
		{
			"mask": "### ## ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"44[02-479]|[34]7"
			]
		},
		{
			"mask": "#### # ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"3(?:[1245]|3[12])"
			]
		},
		{
			"mask": "###### # ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"331",
				"3317"
			]
		}
	]
} satisfies Country;
