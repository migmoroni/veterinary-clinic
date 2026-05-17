import type { Country } from './types.js';

export const BTN = {
	"code": "BTN",
	"labels": {
		"pt-BR": "Butão",
		"pt-PT": "Butão",
		"es-ES": "Bután",
		"es-419": "Bután",
		"es-AR": "Bután",
		"es-BO": "Bután",
		"es-BR": "Bután",
		"es-BZ": "Bután",
		"es-CL": "Bután",
		"es-CO": "Bután",
		"es-CR": "Bután",
		"es-CU": "Bután",
		"es-DO": "Bután",
		"es-EC": "Bután",
		"es-GT": "Bután",
		"es-HN": "Bután",
		"es-MX": "Bután",
		"es-NI": "Bután",
		"es-PA": "Bután",
		"es-PE": "Bután",
		"es-PR": "Bután",
		"es-PY": "Bután",
		"es-SV": "Bután",
		"es-US": "Bután",
		"es-UY": "Bután",
		"es-VE": "Bután",
		"en-US": "Bhutan",
		"fr-FR": "Bhoutan",
		"fr-BE": "Bhoutan",
		"fr-CA": "Bhoutan",
		"fr-CH": "Bhoutan",
		"fr-LU": "Bhoutan",
		"fr-MC": "Bhoutan",
		"it-IT": "Bhutan",
		"it-CH": "Bhutan",
		"it-SM": "Bhutan",
		"it-VA": "Bhutan",
		"de-DE": "Bhutan",
		"de-AT": "Bhutan",
		"de-CH": "Bhutan",
		"de-BE": "Bhutan",
		"de-LI": "Bhutan",
		"de-LU": "Bhutan"
	},
	"callingCode": "975",
	"phoneMasks": [
		{
			"mask": "# ### ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[2-68]|7[246]"
			]
		},
		{
			"mask": "## ## ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1[67]|7"
			]
		}
	]
} satisfies Country;
