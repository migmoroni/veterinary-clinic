import { describe, expect, it } from 'vitest';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
import { localizedPreventiveAliases } from '$lib/i18n/preventive-aliases/index.js';
import { defaultPreventiveCatalogItems } from '../default-catalog.js';

function vaccine(name: string) {
	const item = defaultPreventiveCatalogItems.find((candidate) => candidate.kind === 'vaccine' && candidate.name === name);
	if (!item) throw new Error(`Default vaccine not found: ${name}`);
	return item;
}

function antiparasitic(name: string) {
	const item = defaultPreventiveCatalogItems.find((candidate) => candidate.kind === 'antiparasitic' && candidate.name === name);
	if (!item) throw new Error(`Default antiparasitic not found: ${name}`);
	return item;
}

function normalize(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

describe('default preventive catalog', () => {
	it('allows general search aliases to be shared by multiple products', () => {
		const recombitek = vaccine('Recombitek C6');
		const vanguard = vaccine('Vanguard Plus');

		expect(recombitek.aliases).toContain('V10');
		expect(vanguard.aliases).toContain('V10');
		expect(recombitek.aliases).toContain('polivalente');
		expect(vanguard.aliases).toContain('polivalente');
	});

	it('expands localized aliases while preserving language-independent aliases', () => {
		const vanguard = vaccine('Vanguard Plus');
		const localizedPolyvalentAliases = localizedPreventiveAliases('preventiveAlias.polyvalent');

		expect(vanguard.aliases).toEqual(expect.arrayContaining(localizedPolyvalentAliases));
		expect(vanguard.aliases).toContain('V10');
		expect(new Set(vanguard.aliases).size).toBe(vanguard.aliases.length);
	});

	it('uses one canonical catalog entry per kind and normalized name', () => {
		const keys = defaultPreventiveCatalogItems.map((item) => `${item.kind}:${item.name.toLocaleLowerCase()}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('uses commercial products instead of generic legacy descriptions', () => {
		const names = new Set(defaultPreventiveCatalogItems.map((item) => item.name));
		const legacyDescriptions = [
			'DHPPI',
			'Giardia inativada',
			'Traqueobronquite infecciosa canina',
			'Leishmaniose canina',
			'Antirrábica inativada',
			'Tríplice felina FVRCP',
			'Quádrupla felina FVRCP+Ch',
			'Quíntupla felina FVRCP+Ch+FeLV',
			'FeLV recombinante',
			'Praziquantel + Pamoato de pirantel + Febantel',
			'Fenbendazol',
			'Selamectina'
		];

		for (const description of legacyDescriptions) expect(names).not.toContain(description);
		for (const product of [
			'Nobivac Puppy DP',
			'Nobivac Raiva',
			'Duramune Max 5-CvK/4L',
			'Canigen MHA2PPi/L',
			'Imunocan V8',
			'Versican Plus DHPPi/L4R',
			'Eurican Herpes 205',
			'Purevax RCP',
			'Purevax RCPCh',
			'Purevax RCPCh FeLV',
			'Purevax Rabies',
			'Leucogen',
			'Drontal Plus',
			'Panacur 10%',
			'Bravecto',
			'NexGard',
			'Simparic',
			'Capstar',
			'Effipro',
			'Fiprolex',
			'Frontline'
		])
			expect(names).toContain(product);
	});

	it('describes commercial vaccines by their classifications and protected diseases', () => {
		expect(vaccine('Duramune Max 5-CvK/4L').aliases).toEqual(
			expect.arrayContaining(['V10', 'cinomose canina', 'coronavirose canina', 'leptospirose canina'])
		);
		expect(vaccine('Versican Plus DHPPi/L4R').aliases).toEqual(
			expect.arrayContaining(['DHPPi/L4R', 'parvovirose canina', 'raiva'])
		);
		expect(vaccine('Purevax RCPCh FeLV').aliases).toEqual(
			expect.arrayContaining(['V5', 'clamidiose felina', 'leucemia felina'])
		);
		expect(vaccine('Eurican Herpes 205').aliases).toContain('herpesvírus canino');
		expect(vaccine('Leucogen').aliases).toEqual(expect.arrayContaining(['FeLV', 'leucemia felina']));
	});

	it('keeps product names out of aliases', () => {
		const normalizedProductNames = new Set(defaultPreventiveCatalogItems.map((item) => normalize(item.name)));

		for (const item of defaultPreventiveCatalogItems) {
			for (const alias of item.aliases) expect(normalizedProductNames).not.toContain(normalize(alias));
		}
	});

	it('describes antiparasitics by composition instead of storing brands as aliases', () => {
		const drontalPlus = antiparasitic('Drontal Plus');

		expect(drontalPlus.aliases).toContain('praziquantel pamoato de pirantel febantel');
		expect(drontalPlus.aliases).toContain('praziquantel pyrantel pamoate febantel');
		expect(drontalPlus.aliases).not.toContain('Endogard');
		expect(drontalPlus.aliases).not.toContain('Canex Premium');
	});

	it('distinguishes commercial ectoparasitic products by active ingredient', () => {
		expect(antiparasitic('Bravecto').aliases).toContain('fluralaner');
		expect(antiparasitic('NexGard').aliases).toContain('afoxolaner');
		expect(antiparasitic('Simparic').aliases).toContain('sarolaner');
		expect(antiparasitic('Capstar').aliases).toContain('nitenpiram');
		expect(antiparasitic('Effipro').aliases).toContain('fipronil');
		expect(antiparasitic('Bravecto').aliases).toContain('carrapaticida');
	});

	it('keeps every persisted alias payload within the database limits', () => {
		for (const item of defaultPreventiveCatalogItems) {
			expect(item.aliases.every((alias) => alias.length <= FIELD_LIMITS.preventiveAlias)).toBe(true);
			expect(item.aliases.every((alias) => !alias.includes(','))).toBe(true);
			expect(JSON.stringify(item.aliases).length).toBeLessThanOrEqual(FIELD_LIMITS.preventiveAliasesJson);
		}
	});
});
