import { isBrazilCountry } from '$lib/domain/geo/location.js';

export interface CepAddress {
	postalCode: string;
	street: string;
	neighborhood: string;
	city: string;
	state: string;
}

interface ViaCepResponse {
	cep?: string;
	logradouro?: string;
	bairro?: string;
	localidade?: string;
	uf?: string;
	erro?: boolean;
}

export function isCountrySupportedForCepLookup(country: string): boolean {
	return isBrazilCountry(country);
}

export function normalizeCep(value: string): string {
	return value.replace(/\D/g, '');
}

export async function lookupCep(value: string, country: string): Promise<CepAddress | null> {
	if (!isCountrySupportedForCepLookup(country)) throw new Error('cep_country_unsupported');

	const cep = normalizeCep(value);
	if (cep.length !== 8) throw new Error('cep_invalid');

	const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
	if (!response.ok) throw new Error('cep_unavailable');

	const data = (await response.json()) as ViaCepResponse;
	if (data.erro) return null;

	return {
		postalCode: data.cep ?? value,
		street: data.logradouro ?? '',
		neighborhood: data.bairro ?? '',
		city: data.localidade ?? '',
		state: data.uf ?? ''
	};
}