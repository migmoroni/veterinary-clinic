import type { Country } from './types.js';

export const ZWE = {
	"code": "ZWE",
	"labels": {
		"pt-BR": "Zimbábue",
		"pt-PT": "Zimbabué",
		"es-ES": "Zimbabue",
		"es-419": "Zimbabue",
		"es-AR": "Zimbabue",
		"es-BO": "Zimbabue",
		"es-BR": "Zimbabue",
		"es-BZ": "Zimbabue",
		"es-CL": "Zimbabue",
		"es-CO": "Zimbabue",
		"es-CR": "Zimbabue",
		"es-CU": "Zimbabue",
		"es-DO": "Zimbabue",
		"es-EC": "Zimbabue",
		"es-GT": "Zimbabue",
		"es-HN": "Zimbabue",
		"es-MX": "Zimbabue",
		"es-NI": "Zimbabue",
		"es-PA": "Zimbabue",
		"es-PE": "Zimbabue",
		"es-PR": "Zimbabue",
		"es-PY": "Zimbabue",
		"es-SV": "Zimbabue",
		"es-US": "Zimbabue",
		"es-UY": "Zimbabue",
		"es-VE": "Zimbabue",
		"en-US": "Zimbabwe",
		"fr-FR": "Zimbabwe",
		"fr-BE": "Zimbabwe",
		"fr-CA": "Zimbabwe",
		"fr-CH": "Zimbabwe",
		"fr-LU": "Zimbabwe",
		"fr-MC": "Zimbabwe",
		"it-IT": "Zimbabwe",
		"it-CH": "Zimbabwe",
		"it-SM": "Zimbabwe",
		"it-VA": "Zimbabwe",
		"de-DE": "Simbabwe",
		"de-AT": "Simbabwe",
		"de-CH": "Zimbabwe",
		"de-BE": "Simbabwe",
		"de-LI": "Simbabwe",
		"de-LU": "Simbabwe"
	},
	"callingCode": "263",
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
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"1|2(?:0[0-36-9]|12|29|[56])|3(?:1[0-689]|[24-6])|5(?:[0236-9]|1[2-4])|6(?:[013-59]|7[0-46-9])|(?:33|55|6[68])[0-69]|(?:29|3[09]|62)[0-79]"
			]
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"80"
			]
		},
		{
			"mask": "# ### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[49]"
			]
		},
		{
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2(?:0[45]|2[278]|[49]8)|3(?:[09]8|17)|6(?:[29]8|37|75)|[23][78]|(?:33|5[15]|6[68])[78]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"7"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"29[013-9]|39|54"
			]
		},
		{
			"mask": "## #######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"24|8[13-59]|(?:2[05-79]|39|5[45]|6[15-8])2",
				"2(?:02[014]|4|[56]20|[79]2)|392|5(?:42|525)|6(?:[16-8]21|52[013])|8[13-59]"
			]
		},
		{
			"mask": "#### #####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"(?:25|54)8",
				"258|5483"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2(?:1[39]|2[0157]|[378]|[56][14])|3(?:12|29)",
				"2(?:1[39]|2[0157]|[378]|[56][14])|3(?:123|29)"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
