import type { Country } from './types.js';

export const ALA = {
	"code": "ALA",
	"labels": {
		"pt-BR": "Ilhas Aland",
		"pt-PT": "Alanda",
		"es-ES": "Islas Aland",
		"es-419": "Islas Åland",
		"es-AR": "Islas Åland",
		"es-BO": "Islas Åland",
		"es-BR": "Islas Åland",
		"es-BZ": "Islas Åland",
		"es-CL": "Islas Åland",
		"es-CO": "Islas Åland",
		"es-CR": "Islas Åland",
		"es-CU": "Islas Åland",
		"es-DO": "Islas Åland",
		"es-EC": "Islas Åland",
		"es-GT": "Islas Åland",
		"es-HN": "Islas Åland",
		"es-MX": "Islas Åland",
		"es-NI": "Islas Åland",
		"es-PA": "Islas Åland",
		"es-PE": "Islas Åland",
		"es-PR": "Islas Åland",
		"es-PY": "Islas Åland",
		"es-SV": "Islas Åland",
		"es-US": "Islas Åland",
		"es-UY": "Islas Åland",
		"es-VE": "Islas Åland",
		"en-US": "Åland Islands",
		"fr-FR": "Îles Åland",
		"fr-BE": "Îles Åland",
		"fr-CA": "îles d’Åland",
		"fr-CH": "Îles Åland",
		"fr-LU": "Îles Åland",
		"fr-MC": "Îles Åland",
		"it-IT": "Isole Åland",
		"it-CH": "Isole Åland",
		"it-SM": "Isole Åland",
		"it-VA": "Isole Åland",
		"de-DE": "Ålandinseln",
		"de-AT": "Ålandinseln",
		"de-CH": "Ålandinseln",
		"de-BE": "Ålandinseln",
		"de-LI": "Ålandinseln",
		"de-LU": "Ålandinseln"
	},
	"callingCode": "35818",
	"phoneMasks": [
		{
			"mask": "###",
			"minLength": 3,
			"maxLength": 3
		},
		{
			"mask": "####",
			"minLength": 4,
			"maxLength": 4
		},
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
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		}
	]
} satisfies Country;
