import type { Locale } from '@vet/types/i18n/locales.js';
import { DEFAULT_LOCALE } from '@vet/types/i18n/locales.js';
import { normalizeSearchText, searchTermsForLocale } from '@vet/types/domain/shared/search-terms.js';

export type SearchFieldValue = string | null | undefined;
export type SearchTermMode = 'locale' | 'plain';

export interface SearchScoreFields {
	primary: readonly SearchFieldValue[];
	support?: readonly SearchFieldValue[];
	metadata?: readonly SearchFieldValue[];
	details?: readonly SearchFieldValue[];
}

export interface CollectionSearchFilter<Item> {
	isActive?: boolean;
	matches: (item: Item) => boolean;
}

export interface CollectionSearchHit<Item> {
	item: Item;
	score: number;
	index: number;
}

export interface CollectionSearchResult<Item> {
	items: Item[];
	hits: CollectionSearchHit<Item>[];
	terms: string[];
	totalCount: number;
}

export interface QueryCollectionSearchInput<Item> {
	query?: string;
	items: readonly Item[];
	fields: (item: Item) => SearchScoreFields;
	filters?: readonly CollectionSearchFilter<Item>[];
	limit?: number;
	locale?: Locale;
	termMode?: SearchTermMode;
	requireQueryMatch?: boolean;
	acceptsScore?: (score: number, terms: readonly string[]) => boolean;
	compare?: (first: Item, second: Item) => number;
}

export function queryCollectionSearch<Item>(input: QueryCollectionSearchInput<Item>): CollectionSearchResult<Item> {
	const locale = input.locale ?? DEFAULT_LOCALE;
	const query = input.query ?? '';
	const terms = searchTerms(query, locale, input.termMode ?? 'plain');
	const requireQueryMatch = input.requireQueryMatch ?? false;
	const activeFilters = (input.filters ?? []).filter((filter) => filter.isActive ?? true);
	const filteredItems = input.items.filter((item) => activeFilters.every((filter) => filter.matches(item)));

	if (terms.length === 0 && requireQueryMatch) {
		return { items: [], hits: [], terms, totalCount: filteredItems.length };
	}

	const acceptsScore = input.acceptsScore ?? ((score) => score > 0);
	const hits = filteredItems
		.map((item, index) => ({
			item,
			index,
			score: terms.length === 0 ? 0 : scoreSearchFields(input.fields(item), terms)
		}))
		.filter((hit) => terms.length === 0 || acceptsScore(hit.score, terms))
		.sort((first, second) => compareSearchHits(first, second, terms, input.compare));

	const limitedHits = limitSearchHits(hits, input.limit);

	return {
		items: limitedHits.map((hit) => hit.item),
		hits: limitedHits,
		terms,
		totalCount: filteredItems.length
	};
}

export function searchTerms(query: string, locale: Locale = DEFAULT_LOCALE, mode: SearchTermMode = 'plain'): string[] {
	if (mode === 'locale') return searchTermsForLocale(query, locale);

	const normalized = normalizeSearchText(query);
	if (normalized.length === 0) return [];
	return normalized.split(/\s+/).filter((term) => term.length > 0);
}

export function scoreSearchFields(fields: SearchScoreFields, terms: readonly string[]): number {
	if (terms.length === 0) return 0;

	let score = 0;
	for (const term of terms) {
		const termScore = Math.max(
			maxFieldScore(fields.primary, term, 100, 90, 75),
			maxFieldScore(fields.support, term, 80, 70, 55),
			maxFieldScore(fields.metadata, term, 35, 30, 20),
			maxFieldScore(fields.details, term, 20, 15, 10)
		);

		if (termScore === 0) return 0;
		score += termScore;
	}

	return score;
}

export function acceptsAverageScore(score: number, terms: readonly string[], input: { singleTermMinimum?: number; multiTermMinimum?: number } = {}): boolean {
	if (score <= 0 || terms.length === 0) return false;
	const averageScore = score / terms.length;
	return terms.length === 1 ? averageScore >= (input.singleTermMinimum ?? 55) : averageScore >= (input.multiTermMinimum ?? 25);
}

function scoreNormalizedField(value: SearchFieldValue, term: string, exactScore: number, prefixScore: number, containsScore: number): number {
	const normalized = normalizeSearchText(value ?? '');
	if (!normalized) return 0;

	const words = normalized.split(/\s+/);
	if (words.includes(term)) return exactScore;
	if (words.some((word) => word.startsWith(term))) return prefixScore;
	if (normalized.includes(term)) return containsScore;

	return 0;
}

function maxFieldScore(values: readonly SearchFieldValue[] | undefined, term: string, exactScore: number, prefixScore: number, containsScore: number): number {
	return Math.max(0, ...(values ?? []).map((value) => scoreNormalizedField(value, term, exactScore, prefixScore, containsScore)));
}

function compareSearchHits<Item>(first: CollectionSearchHit<Item>, second: CollectionSearchHit<Item>, terms: readonly string[], compare?: (first: Item, second: Item) => number): number {
	if (terms.length > 0) {
		const scoreCompare = second.score - first.score;
		if (scoreCompare !== 0) return scoreCompare;
	}

	const itemCompare = compare?.(first.item, second.item) ?? 0;
	if (itemCompare !== 0) return itemCompare;
	return first.index - second.index;
}

function limitSearchHits<Item>(hits: CollectionSearchHit<Item>[], limit: number | undefined): CollectionSearchHit<Item>[] {
	if (typeof limit !== 'number' || !Number.isFinite(limit)) return hits;
	return hits.slice(0, Math.max(0, Math.trunc(limit)));
}
