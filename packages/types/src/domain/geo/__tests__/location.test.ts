import { describe, expect, it } from 'vitest';
import { countryLabelLocales } from '../country-data/index.js';
import { brazilCityOptions, countryCallingCode, countryCallingCodes, countryOptions, countryPhoneFormat, countryPhoneFormats, normalizeLocationKey, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '../location.js';

describe('offline location catalog', () => {
	it('normalizes country codes from the offline catalog', () => {
		expect(countryOptions().some((option) => option.value === 'BRA')).toBe(true);
		expect(countryOptions().some((option) => option.value === 'PRT')).toBe(true);
		expect(countryOptions('gn-PY').find((option) => option.value === 'PRY')?.label).toBe('Paraguái');
		expect(countryOptions('gn-PY').find((option) => option.value === 'DEU')?.label).toBe('Alemania');
		expect(countryOptions('es-MX').find((option) => option.value === 'DEU')?.label).toBe('Alemania');
		expect(countryOptions('fr-CA').find((option) => option.value === 'DEU')?.label).toBe('Allemagne');
		expect(countryOptions('it-CH').find((option) => option.value === 'DEU')?.label).toBe('Germania');
		expect(countryOptions('de-AT').find((option) => option.value === 'DEU')?.label).toBe('Deutschland');
		expect(countryOptions('nl-BE').find((option) => option.value === 'DEU')?.label).toBe('Duitsland');
		expect(countryOptions('sv-FI').find((option) => option.value === 'DEU')?.label).toBe('Tyskland');
		expect(countryOptions('cs-CZ').find((option) => option.value === 'DEU')?.label).toBe('Německo');
		expect(countryOptions('uk-UA').find((option) => option.value === 'DEU')?.label).toBe('Німеччина');
		expect(countryOptions('ca-AD').find((option) => option.value === 'DEU')?.label).toBe('Alemanya');
		expect(countryOptions('ga-IE').find((option) => option.value === 'DEU')?.label).toBe('an Ghearmáin');
		expect(countryOptions('no-NO').find((option) => option.value === 'DEU')?.label).toBe('Tyskland');
		expect(countryOptions('ay-BO').find((option) => option.value === 'BOL')?.label).toBe('Wuliwya');
		expect(countryOptions('ay-BO').find((option) => option.value === 'DEU')?.label).toBe('Alemania');
		expect(countryOptions('qu-PE').find((option) => option.value === 'PER')?.label).toBe('Piruw');
		expect(countryOptions('chr-US').find((option) => option.value === 'USA')?.label).toBe('ᏌᏊ ᎢᏳᎾᎵᏍᏔᏅ ᏍᎦᏚᎩ');
		expect(countryOptions('lkt-US').find((option) => option.value === 'USA')?.label).toBe('Mílahaŋska Tȟamákȟočhe');
		expect(countryOptions('kl-GL').find((option) => option.value === 'GRL')?.label).toBe('Kalaallit Nunaat');
		expect(countryOptions('hi-IN').find((option) => option.value === 'IND')?.label).toBe('भारत');
		expect(countryOptions('bn-BD').find((option) => option.value === 'BGD')?.label).toBe('বাংলাদেশ');
		expect(countryOptions('ta-SG').find((option) => option.value === 'SGP')?.label).toBe('சிங்கப்பூர்');
		expect(countryOptions('ja-JP').find((option) => option.value === 'JPN')?.label).toBe('日本');
		expect(countryOptions('ko-KR').find((option) => option.value === 'KOR')?.label).toBe('대한민국');
		expect(countryOptions('zh-Hant-SG').find((option) => option.value === 'CHN')?.label).toBe('中國');
		expect(countryOptions('th-TH').find((option) => option.value === 'THA')?.label).toBe('ไทย');
		expect(countryOptions('ar-SA').find((option) => option.value === 'SAU')?.label).toBe('المملكة العربية السعودية');
		expect(countryLabelLocales).toEqual(expect.arrayContaining(['gn-PY', 'ay-BO', 'qu-PE', 'chr-US', 'lkt-US', 'kl-GL', 'hi-IN', 'ta-SG', 'ja-JP', 'ko-KR', 'zh-CN', 'th-TH', 'ar-SA', 'en-GB', 'pt-AO', 'nl-NL', 'tr-CY']));
		expect(normalizeOwnerCountry('BRA')).toBe('BRA');
		expect(normalizeOwnerCountry(' bra ')).toBe('BRA');
		expect(normalizeOwnerCountry('PRT')).toBe('PRT');
		expect(normalizeOwnerCountry('BR')).toBeNull();
		expect(normalizeOwnerCountry('Brazil')).toBeNull();
		expect(normalizeOwnerCountry('BRA<script>')).toBeNull();
	});

	it('normalizes location lookup keys by removing accents and punctuation', () => {
		expect(normalizeLocationKey('  São\tJosé!!! 123  ')).toBe('sao jose 123');
		expect(normalizeLocationKey('<script>alert(1)</script>')).toBe('script alert 1 script');
	});

	it('returns country calling codes from the offline catalog', () => {
		expect(countryCallingCode('BRA')).toBe('55');
		expect(countryCallingCode('PRT')).toBe('351');
		expect(countryCallingCode('USA')).toBe('1');
		expect(countryCallingCode('CYM')).toBe('1345');
		expect(countryCallingCodes()).toEqual(expect.arrayContaining(['1', '55', '351', '1345']));
		expect(countryCallingCode('BR')).toBeNull();
	});

	it('returns phone masks from the offline geo catalog', () => {
		expect(countryPhoneFormat('BRA')?.phoneMasks).toEqual(expect.arrayContaining([expect.objectContaining({ mask: '(##) #####-####', maxLength: 11 })]));
		expect(countryPhoneFormat('USA')?.phoneMasks).toEqual(expect.arrayContaining([expect.objectContaining({ mask: '(###) ###-####', maxLength: 10 })]));
		expect(countryPhoneFormat('PRT')?.phoneMasks).toEqual(expect.arrayContaining([expect.objectContaining({ mask: '### ### ###', maxLength: 9 })]));
		expect(countryPhoneFormat('CYM')?.phoneMasks).toEqual(expect.arrayContaining([expect.objectContaining({ mask: '###-####', maxLength: 7 })]));
		expect(countryPhoneFormats()).toEqual(expect.arrayContaining([expect.objectContaining({ countryCode: 'BRA', callingCode: '55' })]));
		expect(countryPhoneFormat('BR')).toBeNull();
	});

	it('normalizes state and city from the offline Brazilian catalog', () => {
		expect(normalizeOwnerState('SP')).toBe('SP');
		expect(normalizeOwnerState(' sp ')).toBe('SP');
		expect(normalizeOwnerCity('Araraquara', 'BRA', 'SP')).toBe('Araraquara');
		expect(normalizeOwnerCity('  Américo\tBrasiliense  ', 'BRA', 'SP')).toBe('Américo Brasiliense');
		expect(normalizeOwnerCity('Araraquara', 'BRA', 'RJ')).toBeNull();
		expect(normalizeOwnerCity('x'.repeat(10_000), 'BRA')).toBeNull();
	});

	it('keeps state and city free for countries without offline subdivision data', () => {
		const largeCity = 'x'.repeat(10_000);

		expect(normalizeOwnerState('California', 'USA')).toBe('California');
		expect(normalizeOwnerCity('San Diego', 'USA', 'California')).toBe('San Diego');
		expect(normalizeOwnerCity(` ${largeCity} `, 'USA', 'California')).toBe(largeCity);
	});

	it('infers state from a known city when legacy data has no state', () => {
		expect(normalizeOwnerState('', 'BRA', 'Américo Brasiliense')).toBe('SP');
		expect(normalizeOwnerCity('Alcinópolis - MS', 'BRA')).toBe('Alcinópolis');
		expect(normalizeOwnerState('', 'BRA', 'Alcinópolis - MS')).toBe('MS');
	});

	it('lists cities only after a state is selected', () => {
		expect(brazilCityOptions('').length).toBe(0);
		expect(brazilCityOptions('SP').some((option) => option.value === 'Américo Brasiliense')).toBe(true);
	});
});
