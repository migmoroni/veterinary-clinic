import type { Country } from './types.js';

export const CPV = {
	"code": "CPV",
	"labels": {
		"pt-BR": "Cabo Verde",
		"pt-PT": "Cabo Verde",
		"es-ES": "Cabo Verde",
		"es-419": "Cabo Verde",
		"es-AR": "Cabo Verde",
		"es-BO": "Cabo Verde",
		"es-BR": "Cabo Verde",
		"es-BZ": "Cabo Verde",
		"es-CL": "Cabo Verde",
		"es-CO": "Cabo Verde",
		"es-CR": "Cabo Verde",
		"es-CU": "Cabo Verde",
		"es-DO": "Cabo Verde",
		"es-EC": "Cabo Verde",
		"es-GT": "Cabo Verde",
		"es-HN": "Cabo Verde",
		"es-MX": "Cabo Verde",
		"es-NI": "Cabo Verde",
		"es-PA": "Cabo Verde",
		"es-PE": "Cabo Verde",
		"es-PR": "Cabo Verde",
		"es-PY": "Cabo Verde",
		"es-SV": "Cabo Verde",
		"es-US": "Cabo Verde",
		"es-UY": "Cabo Verde",
		"es-VE": "Cabo Verde",
		"en-US": "Cape Verde",
		"fr-FR": "Cap-Vert",
		"fr-BE": "Cap-Vert",
		"fr-CA": "Cap-Vert",
		"fr-CH": "Cap-Vert",
		"fr-LU": "Cap-Vert",
		"fr-MC": "Cap-Vert",
		"it-IT": "Capo Verde",
		"it-CH": "Capo Verde",
		"it-SM": "Capo Verde",
		"it-VA": "Capo Verde",
		"de-DE": "Cabo Verde",
		"de-AT": "Cabo Verde",
		"de-CH": "Kapverden",
		"de-BE": "Cabo Verde",
		"de-LI": "Cabo Verde",
		"de-LU": "Cabo Verde"
	},
	"callingCode": "238",
	"phoneMasks": [
		{
			"mask": "### ## ##",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[2-589]"
			]
		}
	]
} satisfies Country;
