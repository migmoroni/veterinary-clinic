import type { Country } from './types.js';

export const PRK = {
	"code": "PRK",
	"labels": {
		"pt-BR": "Coreia do Norte",
		"pt-PT": "Coreia do Norte",
		"es-ES": "Corea del Norte",
		"es-419": "Corea del Norte",
		"es-AR": "Corea del Norte",
		"es-BO": "Corea del Norte",
		"es-BR": "Corea del Norte",
		"es-BZ": "Corea del Norte",
		"es-CL": "Corea del Norte",
		"es-CO": "Corea del Norte",
		"es-CR": "Corea del Norte",
		"es-CU": "Corea del Norte",
		"es-DO": "Corea del Norte",
		"es-EC": "Corea del Norte",
		"es-GT": "Corea del Norte",
		"es-HN": "Corea del Norte",
		"es-MX": "Corea del Norte",
		"es-NI": "Corea del Norte",
		"es-PA": "Corea del Norte",
		"es-PE": "Corea del Norte",
		"es-PR": "Corea del Norte",
		"es-PY": "Corea del Norte",
		"es-SV": "Corea del Norte",
		"es-US": "Corea del Norte",
		"es-UY": "Corea del Norte",
		"es-VE": "Corea del Norte",
		"en-US": "North Korea",
		"fr-FR": "Corée du Nord",
		"fr-BE": "Corée du Nord",
		"fr-CA": "Corée du Nord",
		"fr-CH": "Corée du Nord",
		"fr-LU": "Corée du Nord",
		"fr-MC": "Corée du Nord",
		"it-IT": "Corea del Nord",
		"it-CH": "Corea del Nord",
		"it-SM": "Corea del Nord",
		"it-VA": "Corea del Nord",
		"de-DE": "Nordkorea",
		"de-AT": "Nordkorea",
		"de-CH": "Nordkorea",
		"de-BE": "Nordkorea",
		"de-LI": "Nordkorea",
		"de-LU": "Nordkorea"
	},
	"callingCode": "850",
	"phoneMasks": [
		{
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[2-7]"
			]
		},
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
