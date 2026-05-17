import type { Country } from './types.js';

export const SPM = {
	"code": "SPM",
	"labels": {
		"pt-BR": "São Pedro e Miquelão",
		"pt-PT": "São Pedro e Miquelão",
		"es-ES": "San Pedro y Miquelón",
		"es-419": "San Pedro y Miquelón",
		"es-AR": "San Pedro y Miquelón",
		"es-BO": "San Pedro y Miquelón",
		"es-BR": "San Pedro y Miquelón",
		"es-BZ": "San Pedro y Miquelón",
		"es-CL": "San Pedro y Miquelón",
		"es-CO": "San Pedro y Miquelón",
		"es-CR": "San Pedro y Miquelón",
		"es-CU": "San Pedro y Miquelón",
		"es-DO": "San Pedro y Miquelón",
		"es-EC": "San Pedro y Miquelón",
		"es-GT": "San Pedro y Miquelón",
		"es-HN": "San Pedro y Miquelón",
		"es-MX": "San Pedro y Miquelón",
		"es-NI": "San Pedro y Miquelón",
		"es-PA": "San Pedro y Miquelón",
		"es-PE": "San Pedro y Miquelón",
		"es-PR": "San Pedro y Miquelón",
		"es-PY": "San Pedro y Miquelón",
		"es-SV": "San Pedro y Miquelón",
		"es-US": "San Pedro y Miquelón",
		"es-UY": "San Pedro y Miquelón",
		"es-VE": "San Pedro y Miquelón",
		"en-US": "St. Pierre & Miquelon",
		"fr-FR": "Saint-Pierre-et-Miquelon",
		"fr-BE": "Saint-Pierre-et-Miquelon",
		"fr-CA": "Saint-Pierre-et-Miquelon",
		"fr-CH": "Saint-Pierre-et-Miquelon",
		"fr-LU": "Saint-Pierre-et-Miquelon",
		"fr-MC": "Saint-Pierre-et-Miquelon",
		"it-IT": "Saint-Pierre e Miquelon",
		"it-CH": "Saint-Pierre e Miquelon",
		"it-SM": "Saint-Pierre e Miquelon",
		"it-VA": "Saint-Pierre e Miquelon",
		"de-DE": "St. Pierre und Miquelon",
		"de-AT": "St. Pierre und Miquelon",
		"de-CH": "St. Pierre und Miquelon",
		"de-BE": "St. Pierre und Miquelon",
		"de-LI": "St. Pierre und Miquelon",
		"de-LU": "St. Pierre und Miquelon"
	},
	"callingCode": "508",
	"phoneMasks": [
		{
			"mask": "## ## ##",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"[45]"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"7"
			]
		}
	]
} satisfies Country;
