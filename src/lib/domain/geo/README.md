# Geo Data

This folder contains the offline geography data used by owner addresses. Runtime code must not fetch network resources to validate or render these fields.

## Current Scope

- Countries: all available countries/territories are represented as three-letter country codes, such as `BRA`, `USA`, and `PRY`. These are ISO 3166-1 alpha-3 codes where assigned, with source-provided three-letter codes for exceptional entries.
- Structured subdivisions/cities: only Brazil is currently complete. Brazil uses UF codes and canonical IBGE municipality names.
- Other countries: state and city remain free text until a structured offline catalog exists for that country.

## Sources

- Country codes and base country records: Rest Countries (`https://restcountries.com/v3.1/all?fields=cca2,cca3,name`). The runtime app uses the vendored files only.
- Country labels: generated at development time with `Intl.DisplayNames` for each configured locale. These names come from the local JavaScript runtime ICU/CLDR data used during generation.
- Guarani country labels: taken from Rest Countries native names when a `grn` native name exists. When a country has no Guarani label, `location.ts` falls back to Spanish.
- Brazilian states and municipalities: generated from IBGE Localidades data (`https://servicodados.ibge.gov.br/api/v1/localidades/estados` and municipality endpoints). Stored states use UF codes; stored cities use the canonical municipality name.

## Structure

```text
geo/
  location.ts                 Pure helpers and normalization rules.
  brazil-data.ts              Offline Brazil UF and municipality catalog.
  country-data/
    types.ts                  Shared country and label locale types.
    index.ts                  Aggregate list used by the app country select.
    BRA.ts                    One country per ISO alpha-3 code.
    USA.ts
    ...
```

`country-data` is intentionally a folder instead of a single large file. Each country can be imported independently by a future standalone geography library. The current app still imports `country-data/index.ts` when it needs the full country select list.

## Country Contract

Each country file exports a constant named after its ISO alpha-3 code:

```ts
import type { Country } from './types.js';

export const BRA = {
	code: 'BRA',
	labels: {
		'pt-BR': 'Brasil',
		'en-US': 'Brazil'
	}
} satisfies Country;
```

Rules:

- `code` is always a three-letter country code from the country catalog source.
- Stored owner country values are alpha-3 only. There is no compatibility path for old names or alpha-2 codes because the app is pre-launch.
- `labels` is keyed by `CountryLabelLocale` from `country-data/types.ts`.
- Missing labels are allowed. Fallback happens in `location.ts`, not in the generated country files.

## Label Locales

The catalog currently includes:

- App locales: `pt-BR`, `pt-PT`, `gn-PY`, `en-US`, `es-ES`.
- Latin American Spanish variants: `es-419`, `es-AR`, `es-BO`, `es-BR`, `es-BZ`, `es-CL`, `es-CO`, `es-CR`, `es-CU`, `es-DO`, `es-EC`, `es-GT`, `es-HN`, `es-MX`, `es-NI`, `es-PA`, `es-PE`, `es-PR`, `es-PY`, `es-SV`, `es-US`, `es-UY`, `es-VE`.
- French variants: `fr-FR`, `fr-BE`, `fr-CA`, `fr-CH`, `fr-LU`, `fr-MC`.
- Italian variants: `it-IT`, `it-CH`, `it-SM`, `it-VA`.
- German variants: `de-DE`, `de-AT`, `de-CH`, `de-BE`, `de-LI`, `de-LU`.

## Runtime Fallback

`location.ts` is the public helper layer for this module. Country options are sorted by the rendered label for the requested locale.

Fallback order:

- `gn-PY`: `gn-PY`, `es-PY`, `es-419`, `es-ES`, `pt-BR`, `en-US`, country code.
- Spanish variants: requested locale, `es-419`, `es-ES`, `pt-BR`, `en-US`, country code.
- French variants: requested locale, `fr-FR`, `pt-BR`, `en-US`, country code.
- Italian variants: requested locale, `it-IT`, `pt-BR`, `en-US`, country code.
- German variants: requested locale, `de-DE`, `pt-BR`, `en-US`, country code.
- Portuguese variants: requested locale, `pt-BR`, `pt-PT`, `en-US`, country code.
- English variants: requested locale, `en-US`, `pt-BR`, country code.
- Other locales: `pt-BR`, `en-US`, country code.

## Brazil Structured Data

Brazil is the only country where state/city are currently constrained by offline data:

- Country: `BRA`.
- State: Brazilian UF code, for example `SP`.
- City: canonical IBGE municipality name, for example `Américo Brasiliense`.

For non-Brazil countries, `normalizeOwnerState` and `normalizeOwnerCity` return trimmed free text. This keeps the app usable globally while avoiding fake validation for countries that do not yet have a local catalog.

## Update Notes

- Keep `country-data/types.ts`, all per-country files, and `country-data/index.ts` in sync when regenerating country labels.
- Keep `brazil-data.ts` in sync with IBGE when updating Brazilian municipalities.
- Keep `legacy-to-sqlite/to-sqlite.ts` and the ignored `legacy-to-sqlite/to-sqlite.js` synchronized when country storage or Brazilian normalization changes.
- After updates, run `npm run check`, `npm run test:run`, `npm run build`, and `git diff --check`.