import type { Country } from './types.js';

export const DEU = {
	"code": "DEU",
	"labels": {
		"pt-BR": "Alemanha",
		"pt-PT": "Alemanha",
		"es-ES": "Alemania",
		"es-419": "Alemania",
		"es-AR": "Alemania",
		"es-BO": "Alemania",
		"es-BR": "Alemania",
		"es-BZ": "Alemania",
		"es-CL": "Alemania",
		"es-CO": "Alemania",
		"es-CR": "Alemania",
		"es-CU": "Alemania",
		"es-DO": "Alemania",
		"es-EC": "Alemania",
		"es-GT": "Alemania",
		"es-HN": "Alemania",
		"es-MX": "Alemania",
		"es-NI": "Alemania",
		"es-PA": "Alemania",
		"es-PE": "Alemania",
		"es-PR": "Alemania",
		"es-PY": "Alemania",
		"es-SV": "Alemania",
		"es-US": "Alemania",
		"es-UY": "Alemania",
		"es-VE": "Alemania",
		"en-US": "Germany",
		"fr-FR": "Allemagne",
		"fr-BE": "Allemagne",
		"fr-CA": "Allemagne",
		"fr-CH": "Allemagne",
		"fr-LU": "Allemagne",
		"fr-MC": "Allemagne",
		"it-IT": "Germania",
		"it-CH": "Germania",
		"it-SM": "Germania",
		"it-VA": "Germania",
		"de-DE": "Deutschland",
		"de-AT": "Deutschland",
		"de-CH": "Deutschland",
		"de-BE": "Deutschland",
		"de-LI": "Deutschland",
		"de-LU": "Deutschland"
	},
	"callingCode": "49",
	"phoneMasks": [
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
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"138"
			]
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
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"7"
			]
		},
		{
			"mask": "### ########",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1[67]"
			]
		},
		{
			"mask": "### ########",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"18"
			]
		},
		{
			"mask": "#### #######",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"18[68]"
			]
		},
		{
			"mask": "#### #######",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"15[1279]"
			]
		},
		{
			"mask": "##### ######",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"185",
				"1850",
				"18500"
			]
		},
		{
			"mask": "##### ######",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"15[03568]",
				"15(?:[0568]|31)"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		},
		{
			"mask": "### ## ########",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"1(?:6[023]|7)"
			]
		},
		{
			"mask": "### ## ########",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"15"
			]
		},
		{
			"mask": "#### ## #######",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"15[279]"
			]
		},
		{
			"mask": "### # ##########",
			"minLength": 14,
			"maxLength": 14,
			"leadingDigits": [
				"1(?:3|80)|9"
			]
		},
		{
			"mask": "### ###########",
			"minLength": 14,
			"maxLength": 14,
			"leadingDigits": [
				"181"
			]
		},
		{
			"mask": "## #############",
			"minLength": 15,
			"maxLength": 15,
			"leadingDigits": [
				"3[02]|40|[68]9"
			]
		},
		{
			"mask": "### ############",
			"minLength": 15,
			"maxLength": 15,
			"leadingDigits": [
				"2(?:0[1-389]|1[124]|2[18]|3[14])|3(?:[35-9][15]|4[015])|906|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1",
				"2(?:0[1-389]|12[0-8])|3(?:[35-9][15]|4[015])|906|2(?:[13][14]|2[18])|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1"
			]
		},
		{
			"mask": "### ############",
			"minLength": 15,
			"maxLength": 15,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "#### ###########",
			"minLength": 15,
			"maxLength": 15,
			"leadingDigits": [
				"[24-6]|3(?:[3569][02-46-9]|4[2-4679]|7[2-467]|8[2-46-8])|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]",
				"[24-6]|3(?:3(?:0[1-467]|2[127-9]|3[124578]|7[1257-9]|8[1256]|9[145])|4(?:2[135]|4[13578]|9[1346])|5(?:0[14]|2[1-3589]|6[1-4]|7[13468]|8[13568])|6(?:2[1-489]|3[124-6]|6[13]|7[12579]|8[1-356]|9[135])|7(?:2[1-7]|4[145]|6[1-5]|7[1-4])|8(?:21|3[1468]|6|7[1467]|8[136])|9(?:0[12479]|2[1358]|4[134679]|6[1-9]|7[136]|8[147]|9[1468]))|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]|3[68]4[1347]|3(?:47|60)[1356]|3(?:3[46]|46|5[49])[1246]|3[4579]3[1357]"
			]
		},
		{
			"mask": "##### ##########",
			"minLength": 15,
			"maxLength": 15,
			"leadingDigits": [
				"3"
			]
		}
	]
} satisfies Country;
