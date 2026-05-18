Verify:

```
cd /home/miguel/Projects/proprios/veterinary-clinic && node --input-type=module <<'NODE'
const candidates = [
  'gn-PY',
  'ay-BO','ay-PE','ay-CL',
  'qu-PE','qu-BO','qu-EC',
  'quc-GT','yua-MX','nah-MX',
  'chr-US','nv-US','iu-CA','iu-Latn-CA','cr-CA','oj-CA','lkt-US','dak-US','moh-CA',
  'kl-GL','arn-CL','grn-PY'
];
const supported = [];
const unsupported = [];
for (const locale of candidates) {
  if (Intl.DisplayNames.supportedLocalesOf([locale]).length > 0) supported.push(locale);
  else unsupported.push(locale);
}
console.log({ supported, unsupported });
for (const locale of supported) {
  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  console.log(locale, 'BR=', displayNames.of('BR'), 'PY=', displayNames.of('PY'), 'MX=', displayNames.of('MX'), 'CA=', displayNames.of('CA'), 'US=', displayNames.of('US'));
}
NODE
```


Fetch:
```
cd /home/miguel/Projects/proprios/veterinary-clinic && node --input-type=module <<'NODE'
import fs from 'node:fs/promises';
import path from 'node:path';

const dataDir = 'src/lib/domain/geo/country-data';
const labelLocales = [
  'pt-BR', 'pt-PT', 'gn-PY',
  'ay-BO', 'ay-PE', 'ay-CL',
  'qu-PE', 'qu-BO', 'qu-EC',
  'chr-US', 'lkt-US', 'kl-GL',
  'en-US', 'en-GB', 'en-IE', 'en-MT', 'en-GI', 'en-CY', 'en-JE', 'en-GG', 'en-IM', 'en-CA', 'en-AU', 'en-NZ', 'en-ZA', 'en-IN', 'en-SG',
  'pt-AO', 'pt-MZ', 'pt-CV', 'pt-GW', 'pt-ST', 'pt-TL', 'pt-MO',
  'es-ES', 'es-419', 'es-AD', 'es-GI', 'es-AR', 'es-BO', 'es-BR', 'es-BZ', 'es-CL', 'es-CO', 'es-CR', 'es-CU', 'es-DO', 'es-EC', 'es-GT', 'es-HN', 'es-MX', 'es-NI', 'es-PA', 'es-PE', 'es-PR', 'es-PY', 'es-SV', 'es-US', 'es-UY', 'es-VE',
  'fr-FR', 'fr-BE', 'fr-CH', 'fr-LU', 'fr-MC', 'fr-AD', 'fr-CA',
  'it-IT', 'it-CH', 'it-SM', 'it-VA',
  'de-DE', 'de-AT', 'de-CH', 'de-BE', 'de-LI', 'de-LU',
  'nl-NL', 'nl-BE',
  'sv-SE', 'sv-FI',
  'da-DK',
  'nb-NO', 'nn-NO',
  'fi-FI',
  'is-IS',
  'fo-FO',
  'et-EE', 'lv-LV', 'lt-LT',
  'pl-PL', 'cs-CZ', 'sk-SK',
  'sl-SI', 'hr-HR', 'bs-BA', 'sr-RS', 'sr-BA', 'sr-ME', 'mk-MK', 'bg-BG',
  'be-BY', 'uk-UA', 'ru-RU',
  'el-GR', 'el-CY',
  'ro-RO', 'ro-MD',
  'hu-HU',
  'sq-AL', 'sq-XK',
  'mt-MT',
  'ga-IE', 'cy-GB', 'gd-GB',
  'lb-LU',
  'ca-ES', 'ca-AD', 'ca-FR', 'ca-IT',
  'eu-ES', 'eu-FR',
  'gl-ES',
  'tr-TR', 'tr-CY'
];
const nativeNameLocaleSources = new Map([
  ['gn-PY', 'grn'],
  ['ay-BO', 'aym'],
  ['ay-PE', 'aym'],
  ['ay-CL', 'aym'],
  ['qu-PE', 'que'],
  ['qu-BO', 'que'],
  ['qu-EC', 'que'],
  ['kl-GL', 'kal']
]);

const [countriesResponse, phoneMetadataResponse] = await Promise.all([
  fetch('https://restcountries.com/v3.1/all?fields=cca2,cca3,name,idd'),
  fetch('https://unpkg.com/libphonenumber-js@1.11.19/metadata.full.json')
]);
if (!countriesResponse.ok) throw new Error(`RestCountries fetch failed: ${countriesResponse.status}`);
if (!phoneMetadataResponse.ok) throw new Error(`libphonenumber-js metadata fetch failed: ${phoneMetadataResponse.status}`);

const sourceCountries = await countriesResponse.json();
const phoneMetadata = await phoneMetadataResponse.json();
const displayNames = new Map();
for (const locale of labelLocales.filter((locale) => Intl.DisplayNames.supportedLocalesOf([locale]).length > 0)) {
  displayNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
}

function labelForCountry(country, locale) {
  const nativeLanguageCode = nativeNameLocaleSources.get(locale);
  const nativeName = nativeLanguageCode ? country.name?.nativeName?.[nativeLanguageCode]?.common : null;
  if (nativeName) return nativeName;

  const displayName = displayNames.get(locale)?.of(country.cca2) ?? null;
  if (!displayName || displayName === country.cca2) return null;
  return displayName;
}

function callingCodeForCountry(country) {
  const root = typeof country.idd?.root === 'string' ? country.idd.root.replace(/\D/g, '') : '';
  if (!root) return null;

  const suffixes = Array.isArray(country.idd?.suffixes) ? country.idd.suffixes.map((suffix) => String(suffix).replace(/\D/g, '')).filter(Boolean) : [];
  if (root === '1' && suffixes.length <= 1) return `${root}${suffixes[0] ?? ''}`;
  if (root === '1' || root === '7') return root;
  return `${root}${suffixes[0] ?? ''}`;
}

function parseGroupLengths(pattern) {
  const groups = [];
  const regex = /\((\\d(?:\{(\d+)(?:,(\d*))?\})?)\)/g;
  let match;
  while ((match = regex.exec(pattern))) {
    const min = match[2] ? Number(match[2]) : 1;
    const max = match[3] === undefined ? min : (match[3] ? Number(match[3]) : Math.min(15, min + 4));
    groups.push({ min, max });
  }
  return groups;
}

function placeholderCount(mask) {
  return [...mask].filter((char) => char === '#').length;
}

function trimMaskPrefix(mask, placeholdersToRemove) {
  let removed = 0;
  let started = false;
  let result = '';

  for (const char of mask) {
    if (char === '#') {
      if (removed < placeholdersToRemove) {
        removed += 1;
        continue;
      }
      started = true;
      result += char;
      continue;
    }

    if (started) result += char;
  }

  return result.replace(/^[\s)\]}.\-/]+/, '').trim();
}

function maskFromFormat(format, groups, nationalPrefixRule) {
  let usableFormat = format;
  if (typeof nationalPrefixRule === 'string' && nationalPrefixRule.includes('$1') && !/\d/.test(nationalPrefixRule.replace('$1', ''))) {
    usableFormat = usableFormat.replace('$1', nationalPrefixRule);
  }

  let mask = usableFormat;
  for (const [index, group] of groups.entries()) {
    mask = mask.replaceAll(`$${index + 1}`, '#'.repeat(group.max));
  }

  return mask.replace(/\$\d/g, '').replace(/\s+/g, ' ').trim();
}

function defaultMask(length) {
  if (length <= 0) return '';
  if (length <= 4) return '#'.repeat(length);
  if (length === 7) return '###-####';
  if (length === 8) return '####-####';
  if (length === 9) return '### ### ###';
  if (length === 10) return '### ### ####';
  if (length === 11) return '### #### ####';

  const firstGroupLength = length % 3 || 3;
  const groups = ['#'.repeat(firstGroupLength)];
  let remaining = length - firstGroupLength;
  while (remaining > 0) {
    const groupLength = Math.min(3, remaining);
    groups.push('#'.repeat(groupLength));
    remaining -= groupLength;
  }
  return groups.join(' ');
}

function normalizeLeadingDigits(value) {
  if (!Array.isArray(value)) return undefined;
  const patterns = value.filter((item) => typeof item === 'string' && item.length > 0);
  return patterns.length > 0 ? patterns : undefined;
}

function phoneMasksForCountry(country, callingCode) {
  const entry = phoneMetadata.countries[country.cca2];
  if (!entry || !callingCode) return [];

  const metadataCallingCode = String(entry[0] ?? '').replace(/\D/g, '');
  const ownFormats = Array.isArray(entry[4]) ? entry[4] : [];
  const usingFallbackFormats = ownFormats.length === 0 && metadataCallingCode === '1' && Array.isArray(phoneMetadata.countries.US?.[4]);
  const formats = usingFallbackFormats ? phoneMetadata.countries.US[4] : ownFormats;
  const possibleLengths = Array.isArray(entry[3]) ? entry[3].filter((length) => Number.isInteger(length) && length > 0) : [];
  const prefixToStrip = callingCode.startsWith(metadataCallingCode) && callingCode.length > metadataCallingCode.length ? callingCode.length - metadataCallingCode.length : 0;
  const masks = [];

  for (const format of formats) {
    if (!Array.isArray(format) || typeof format[0] !== 'string' || typeof format[1] !== 'string') continue;

    const groups = parseGroupLengths(format[0]);
    if (groups.length === 0) continue;

    const originalLength = groups.reduce((total, group) => total + group.max, 0);
    if (usingFallbackFormats && possibleLengths.length > 0 && !possibleLengths.includes(originalLength)) continue;

    let mask = maskFromFormat(format[1], groups, format[3]);
    if (prefixToStrip) mask = trimMaskPrefix(mask, prefixToStrip);

    const length = placeholderCount(mask);
    if (length === 0) continue;

    const phoneMask = { mask, minLength: length, maxLength: length };
    const leadingDigits = normalizeLeadingDigits(format[2]);
    if (leadingDigits) phoneMask.leadingDigits = leadingDigits;
    masks.push(phoneMask);
  }

  for (const length of possibleLengths) {
    const localLength = Math.max(0, length - prefixToStrip);
    if (localLength > 0 && !masks.some((mask) => mask.maxLength === localLength)) {
      masks.push({ mask: defaultMask(localLength), minLength: localLength, maxLength: localLength });
    }
  }

  return [...new Map(masks.map((mask) => [`${mask.mask}:${mask.minLength}:${mask.maxLength}:${(mask.leadingDigits ?? []).join('|')}`, mask])).values()]
    .sort((left, right) => left.maxLength - right.maxLength || left.mask.localeCompare(right.mask));
}

const countries = sourceCountries
  .map((country) => {
    const labels = {};
    for (const locale of labelLocales) {
      const label = labelForCountry(country, locale);
      if (label) labels[locale] = label;
    }

    const countryRecord = { code: country.cca3, labels };
    const callingCode = callingCodeForCountry(country);
    if (callingCode) {
      countryRecord.callingCode = callingCode;
      const phoneMasks = phoneMasksForCountry(country, callingCode);
      if (phoneMasks.length > 0) countryRecord.phoneMasks = phoneMasks;
    }
    return countryRecord;
  })
  .filter((country) => /^[A-Z]{3}$/.test(country.code) && Object.keys(country.labels).length > 0)
  .sort((left, right) => {
    const leftLabel = left.labels['pt-BR'] ?? left.labels['en-US'] ?? left.code;
    const rightLabel = right.labels['pt-BR'] ?? right.labels['en-US'] ?? right.code;
    return leftLabel.localeCompare(rightLabel, 'pt-BR') || left.code.localeCompare(right.code);
  });

await fs.mkdir(dataDir, { recursive: true });

const typeUnion = labelLocales.map((locale) => `'${locale}'`).join(' | ');
await fs.writeFile(
  path.join(dataDir, 'types.ts'),
  `export const countryLabelLocales = ${JSON.stringify(labelLocales, null, '\t')} as const;\n\nexport type CountryLabelLocale = ${typeUnion};\n\nexport interface CountryPhoneMask {\n\tmask: string;\n\tminLength: number;\n\tmaxLength: number;\n\tleadingDigits?: string[];\n}\n\nexport interface Country {\n\tcode: string;\n\tlabels: Partial<Record<CountryLabelLocale, string>>;\n\tcallingCode?: string;\n\tphoneMasks?: CountryPhoneMask[];\n}\n`
);

for (const country of countries) {
  await fs.writeFile(
    path.join(dataDir, `${country.code}.ts`),
    `import type { Country } from './types.js';\n\nexport const ${country.code} = ${JSON.stringify(country, null, '\t')} satisfies Country;\n`
  );
}

const imports = countries.map((country) => `import { ${country.code} } from './${country.code}.js';`).join('\n');
const countryArray = countries.map((country) => `\t${country.code}`).join(',\n');
await fs.writeFile(
  path.join(dataDir, 'index.ts'),
  `export { countryLabelLocales } from './types.js';\nexport type { Country, CountryLabelLocale, CountryPhoneMask } from './types.js';\n\n${imports}\n\nexport const countries = [\n${countryArray}\n] satisfies import('./types.js').Country[];\n`
);

for (const code of ['BOL', 'PER', 'PRY', 'GRL', 'USA']) console.log(code, countries.find((country) => country.code === code)?.labels);
console.log({ countries: countries.length, labelLocales: labelLocales.length });
NODE
```