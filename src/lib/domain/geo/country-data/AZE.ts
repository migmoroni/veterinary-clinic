import type { Country } from './types.js';

export const AZE = {
	"code": "AZE",
	"labels": {
		"pt-BR": "Azerbaijão",
		"pt-PT": "Azerbaijão",
		"es-ES": "Azerbaiyán",
		"es-419": "Azerbaiyán",
		"es-AR": "Azerbaiyán",
		"es-BO": "Azerbaiyán",
		"es-BR": "Azerbaiyán",
		"es-BZ": "Azerbaiyán",
		"es-CL": "Azerbaiyán",
		"es-CO": "Azerbaiyán",
		"es-CR": "Azerbaiyán",
		"es-CU": "Azerbaiyán",
		"es-DO": "Azerbaiyán",
		"es-EC": "Azerbaiyán",
		"es-GT": "Azerbaiyán",
		"es-HN": "Azerbaiyán",
		"es-MX": "Azerbaiyán",
		"es-NI": "Azerbaiyán",
		"es-PA": "Azerbaiyán",
		"es-PE": "Azerbaiyán",
		"es-PR": "Azerbaiyán",
		"es-PY": "Azerbaiyán",
		"es-SV": "Azerbaiyán",
		"es-US": "Azerbaiyán",
		"es-UY": "Azerbaiyán",
		"es-VE": "Azerbaiyán",
		"en-US": "Azerbaijan",
		"fr-FR": "Azerbaïdjan",
		"fr-BE": "Azerbaïdjan",
		"fr-CA": "Azerbaïdjan",
		"fr-CH": "Azerbaïdjan",
		"fr-LU": "Azerbaïdjan",
		"fr-MC": "Azerbaïdjan",
		"it-IT": "Azerbaigian",
		"it-CH": "Azerbaigian",
		"it-SM": "Azerbaigian",
		"it-VA": "Azerbaigian",
		"de-DE": "Aserbaidschan",
		"de-AT": "Aserbaidschan",
		"de-CH": "Aserbaidschan",
		"de-BE": "Aserbaidschan",
		"de-LI": "Aserbaidschan",
		"de-LU": "Aserbaidschan"
	},
	"callingCode": "994",
	"phoneMasks": [
		{
			"mask": "## ### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1[28]|2|365|46",
				"1[28]|2|365[45]|46",
				"1[28]|2|365(?:4|5[02])|46"
			]
		},
		{
			"mask": "## ### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[13-9]"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"90"
			]
		}
	]
} satisfies Country;
