# Geo Data

This folder contains the offline geography data used by owner addresses. Runtime code must not fetch network resources to validate or render these fields.

## Current Scope

- Countries: all available countries/territories are represented as three-letter country codes, such as `BRA`, `USA`, and `PRY`. These are ISO 3166-1 alpha-3 codes where assigned, with source-provided three-letter codes for exceptional entries.
- Structured subdivisions/cities: only Brazil is currently complete. Brazil uses UF codes and canonical IBGE municipality names.
- Other countries: state and city remain free text until a structured offline catalog exists for that country.

## Sources

- Country codes, base country records, and phone calling codes: Rest Countries (`https://restcountries.com/v3.1/all?fields=cca2,cca3,name,idd`). Runtime code uses the vendored files only.
- Phone/mobile masks: generated at development time from `libphonenumber-js` full metadata. The generated `phoneMasks` are stored locally in `country-data` and are used for contact phone/mobile fields without runtime network access.
- Country labels: generated at development time with `Intl.DisplayNames` for each configured locale. These names come from the local JavaScript runtime ICU/CLDR data used during generation.
- Indigenous American country labels: Guarani, Aymara, Quechua, and Kalaallisut prefer Rest Countries native names when the source has them (`grn`, `aym`, `que`, `kal`). Cherokee and Lakota use ICU/CLDR labels where available. Missing labels fall back in `location.ts`.
- Brazilian states and municipalities: generated from IBGE Localidades data (`https://servicodados.ibge.gov.br/api/v1/localidades/estados` and municipality endpoints). Stored states use UF codes; stored cities use the canonical municipality name.

## Structure

```text
geo/
  location.ts                 Pure helpers and normalization rules.
  brazil-data.ts              Offline Brazil UF and municipality catalog.
  country-data/
    types.ts                  Shared country and label locale types.
    index.ts                  Aggregate list used for full country option lists.
    BRA.ts                    One country per ISO alpha-3 code.
    USA.ts
    ...
```

`country-data` is intentionally a folder instead of a single large file. Each country can be imported independently by a future standalone geography library. The aggregate `country-data/index.ts` remains available for full country select lists.

## Country Contract

Each country file exports a constant named after its ISO alpha-3 code:

```ts
import type { Country } from './types.js';

export const BRA = {
	code: 'BRA',
	labels: {
		'pt-BR': 'Brasil',
		'en-US': 'Brazil'
  },
  callingCode: '55',
  phoneMasks: [
    { mask: '(##) ####-####', minLength: 10, maxLength: 10 },
    { mask: '(##) #####-####', minLength: 11, maxLength: 11 }
  ]
} satisfies Country;
```

Rules:

- `code` is always a three-letter country code from the country catalog source.
- `callingCode` is the default international dialing code stored without `+`, when the source has one.
- `phoneMasks` describes local digits after the country calling code. `#` marks a digit; punctuation and spaces are formatting characters. `minLength`/`maxLength` allow the formatter to pick the expected mask as the number grows.
- Stored owner country values are alpha-3 only. Old names and alpha-2 codes are intentionally invalid in this catalog.
- `labels` is keyed by `CountryLabelLocale` from `country-data/types.ts`.
- Missing labels are allowed. Fallback happens in `location.ts`, not in the generated country files.

## Label Locales

The catalog currently includes:

- Guarani: `gn-PY`.
- Aymara variants: `ay-BO`, `ay-PE`, `ay-CL`.
- Quechua variants: `qu-PE`, `qu-BO`, `qu-EC`.
- Cherokee: `chr-US`.
- Lakota: `lkt-US`.
- Kalaallisut / Greenlandic: `kl-GL`.
- Hindi: `hi-IN`.
- Bengali variants: `bn-IN`, `bn-BD`.
- Tamil variants: `ta-IN`, `ta-LK`, `ta-SG`, `ta-MY`.
- Telugu: `te-IN`.
- Marathi: `mr-IN`.
- Gujarati: `gu-IN`.
- Kannada: `kn-IN`.
- Malayalam: `ml-IN`.
- Punjabi: `pa-IN`.
- Urdu variants: `ur-IN`, `ur-PK`.
- Odia: `or-IN`.
- Assamese: `as-IN`.
- Nepali variants: `ne-IN`, `ne-NP`.
- Sinhala: `si-LK`.
- Konkani: `kok-IN`.
- Sindhi: `sd-IN`.
- Kashmiri: `ks-IN`.
- Dogri: `doi-IN`.
- Manipuri / Meitei: `mni-IN`.
- Bodo: `brx-IN`.
- Santali: `sat-IN`.
- Maithili: `mai-IN`.
- Sanskrit: `sa-IN`.
- Dzongkha: `dz-BT`.
- Japanese: `ja-JP`.
- Korean variants: `ko-KR`, `ko-KP`.
- Chinese variants: `zh-CN`, `zh-Hans-CN`, `zh-Hant-TW`, `zh-TW`, `zh-HK`, `zh-MO`, `zh-SG`.
- Cantonese variants: `yue-Hant-HK`, `yue-Hans-CN`.
- Mongolian: `mn-MN`.
- Tibetan variants: `bo-CN`, `bo-IN`.
- Uyghur: `ug-CN`.
- Sichuan Yi / Nuosu: `ii-CN`.
- Thai: `th-TH`.
- Lao: `lo-LA`.
- Khmer: `km-KH`.
- Burmese / Myanmar: `my-MM`.
- Vietnamese: `vi-VN`.
- Indonesian: `id-ID`.
- Malay variants: `ms-MY`, `ms-SG`, `ms-BN`.
- Javanese: `jv-ID`.
- Sundanese: `su-ID`.
- Filipino: `fil-PH`.
- Cebuano: `ceb-PH`.
- Georgian: `ka-GE`.
- Armenian: `hy-AM`.
- Azerbaijani variants: `az-AZ`, `az-Cyrl-AZ`.
- Kazakh: `kk-KZ`.
- Kyrgyz: `ky-KG`.
- Uzbek: `uz-UZ`.
- Tajik: `tg-TJ`.
- Turkmen: `tk-TM`.
- Persian variants: `fa-IR`, `fa-AF`.
- Pashto variants: `ps-AF`, `ps-PK`.
- Hebrew: `he-IL`.
- Arabic variants: `ar-SA`, `ar-AE`, `ar-QA`, `ar-BH`, `ar-KW`, `ar-OM`, `ar-YE`, `ar-IQ`, `ar-JO`, `ar-LB`, `ar-SY`, `ar-PS`.
- English variants: `en-US`, `en-GB`, `en-IE`, `en-MT`, `en-GI`, `en-CY`, `en-JE`, `en-GG`, `en-IM`, `en-CA`, `en-AU`, `en-NZ`, `en-ZA`, `en-IN`, `en-SG`.
- Portuguese variants: `pt-BR`, `pt-PT`, `pt-AO`, `pt-MZ`, `pt-CV`, `pt-GW`, `pt-ST`, `pt-TL`, `pt-MO`.
- Spanish variants: `es-ES`, `es-419`, `es-AD`, `es-GI`, `es-AR`, `es-BO`, `es-BR`, `es-BZ`, `es-CL`, `es-CO`, `es-CR`, `es-CU`, `es-DO`, `es-EC`, `es-GT`, `es-HN`, `es-MX`, `es-NI`, `es-PA`, `es-PE`, `es-PR`, `es-PY`, `es-SV`, `es-US`, `es-UY`, `es-VE`.
- French variants: `fr-FR`, `fr-BE`, `fr-CH`, `fr-LU`, `fr-MC`, `fr-AD`, `fr-CA`.
- Italian variants: `it-IT`, `it-CH`, `it-SM`, `it-VA`.
- German variants: `de-DE`, `de-AT`, `de-CH`, `de-BE`, `de-LI`, `de-LU`.
- Dutch variants: `nl-NL`, `nl-BE`.
- Swedish variants: `sv-SE`, `sv-FI`.
- Danish: `da-DK`.
- Norwegian variants: `nb-NO`, `nn-NO`.
- Finnish: `fi-FI`.
- Icelandic: `is-IS`.
- Faroese: `fo-FO`.
- Estonian: `et-EE`.
- Latvian: `lv-LV`.
- Lithuanian: `lt-LT`.
- Polish: `pl-PL`.
- Czech: `cs-CZ`.
- Slovak: `sk-SK`.
- Slovenian: `sl-SI`.
- Croatian: `hr-HR`.
- Bosnian: `bs-BA`.
- Serbian variants: `sr-RS`, `sr-BA`, `sr-ME`.
- Macedonian: `mk-MK`.
- Bulgarian: `bg-BG`.
- Belarusian: `be-BY`.
- Ukrainian: `uk-UA`.
- Russian: `ru-RU`.
- Greek variants: `el-GR`, `el-CY`.
- Romanian variants: `ro-RO`, `ro-MD`.
- Hungarian: `hu-HU`.
- Albanian variants: `sq-AL`, `sq-XK`.
- Maltese: `mt-MT`.
- Irish: `ga-IE`.
- Welsh: `cy-GB`.
- Scottish Gaelic: `gd-GB`.
- Luxembourgish: `lb-LU`.
- Catalan variants: `ca-ES`, `ca-AD`, `ca-FR`, `ca-IT`.
- Basque variants: `eu-ES`, `eu-FR`.
- Galician: `gl-ES`.
- Turkish variants: `tr-TR`, `tr-CY`.

## Runtime Fallback

`location.ts` is the public helper layer for this module. Country options are sorted by the rendered label for the requested locale.

Fallback order:

- Guarani: requested locale, `es-PY`, `es-419`, `es-ES`, `pt-BR`, `en-GB`, `en-US`, country code.
- Aymara and Quechua: requested locale, Spanish defaults, `pt-BR`, `en-GB`, `en-US`, country code.
- Cherokee and Lakota: requested locale, `en-US`, `pt-BR`, `en-GB`, country code.
- Kalaallisut / Greenlandic: requested locale, `da-DK`, `en-GB`, `en-US`, `pt-BR`, country code.
- South Asian language variants: requested locale, then the configured variants for that language, followed by the common fallback.
- Chinese and Cantonese: requested locale, script-aware simplified/traditional defaults, then the common fallback.
- Japanese, Korean, Southeast Asian, Central Asian, West Asian, and Southwest Asian language variants: requested locale, then the configured variants for that language, followed by the common fallback.
- Language variants: requested locale, then that language's configured European/default fallback chain in `location.ts`.
- Common fallback: `pt-BR`, `en-GB`, `en-US`, country code.

## Brazil Structured Data

Brazil is the only country where state/city are currently constrained by offline data:

- Country: `BRA`.
- State: Brazilian UF code, for example `SP`.
- City: canonical IBGE municipality name, for example `Américo Brasiliense`.

For non-Brazil countries, `normalizeOwnerState` and `normalizeOwnerCity` return trimmed free text. This supports global entry while avoiding fake validation for countries that do not yet have a local catalog.

## Update Notes

- Keep `country-data/types.ts`, all per-country files, and `country-data/index.ts` in sync when regenerating country labels.
- Keep `brazil-data.ts` in sync with IBGE when updating Brazilian municipalities.
- Keep `legacy-to-sqlite/to-sqlite.ts` and the ignored `legacy-to-sqlite/to-sqlite.js` synchronized when country storage or Brazilian normalization changes.
- After updates, run `npm run check`, `npm run test:run`, `npm run build`, and `git diff --check`.