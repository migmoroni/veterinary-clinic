import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const knowledgeRoot = path.join(root, 'data', 'knowledge');
const locales = ['pt-BR', 'pt-PT', 'gn-PY', 'en-US', 'es-ES', 'fr-FR'];
const failures = [];

function record(condition, message) {
	if (!condition) failures.push(message);
}

async function walk(directory) {
	const files = [];
	const directories = [];
	const special = [];
	for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
		const absolute = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			directories.push(absolute);
			const nested = await walk(absolute);
			files.push(...nested.files);
			directories.push(...nested.directories);
			special.push(...nested.special);
		} else if (entry.isFile()) files.push(absolute);
		else special.push(absolute);
	}
	return { files, directories, special };
}

async function json(file) {
	return JSON.parse(await readFile(file, 'utf8'));
}

async function jsonFiles(directory) {
	const result = [];
	for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
		const absolute = path.join(directory, entry.name);
		if (entry.isDirectory()) result.push(...await jsonFiles(absolute));
		else if (entry.name.endsWith('.json')) result.push(absolute);
	}
	return result;
}

async function sourceItems(directory) {
	return Promise.all((await jsonFiles(directory)).map(async (file) => ({ file, value: await json(file) })));
}

function decodeQuoted(source) {
	let result = '';
	for (let index = 1; index < source.length - 1; index += 1) {
		const character = source[index];
		if (character !== '\\') {
			result += character;
			continue;
		}
		const escaped = source[++index];
		const simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
		if (escaped === 'u') {
			result += String.fromCodePoint(Number.parseInt(source.slice(index + 1, index + 5), 16));
			index += 4;
		} else result += simple[escaped] ?? escaped;
	}
	return result;
}

async function translationMap(file) {
	const source = await readFile(file, 'utf8');
	const entries = new Map();
	for (const line of source.split('\n')) {
		const match = line.match(/^\s*('(?:\\.|[^'])*'):\s*(.+?)(?:,)?$/);
		if (!match) continue;
		const key = decodeQuoted(match[1]);
		const valueSource = match[2].trim().replace(/,$/, '');
		const values = [...valueSource.matchAll(/'(?:\\.|[^'])*'|"(?:\\.|[^"])*"/g)].map((item) => decodeQuoted(item[0]));
		if (valueSource.startsWith('[')) entries.set(key, values);
		else if (values.length === 1) entries.set(key, values[0]);
	}
	return entries;
}

function localized(value) {
	return Object.fromEntries(locales.map((locale) => [locale, value]));
}

function localizedWith(factory) {
	return Object.fromEntries(locales.map((locale) => [locale, factory(locale)]));
}

function isObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSimpleText(value) {
	return typeof value === 'string' && value.length > 0 && value === value.trim() && !/[\r\n\u0000-\u001f\u007f]/u.test(value) && !/(?:^|\s)#{1,6}\s|!\[[^\]]*\]\(|\[[^\]]+\]\([^)]*\)|<[^>]+>|[`*_]/u.test(value);
}

function hasLocaleKeys(value) {
	return isObject(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(locales);
}

function same(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function unique(values) {
	return [...new Set(values)];
}

function assertKeys(value, required, optional, label) {
	record(isObject(value), `${label}: expected an object`);
	if (!isObject(value)) return;
	const actual = Object.keys(value);
	const allowed = new Set([...required, ...optional]);
	for (const key of required) record(actual.includes(key), `${label}: missing ${key}`);
	for (const key of actual) record(allowed.has(key), `${label}: unexpected ${key}`);
}

let localizedFieldCount = 0;
let scalarLocaleValueCount = 0;
let localizedListItemCount = 0;
let entityAliasValueCount = 0;
let taxonomyLabelValueCount = 0;
let taxonomyAliasValueCount = 0;

function assertLocalizedField(value, kind, label, options = {}) {
	localizedFieldCount += 1;
	record(hasLocaleKeys(value), `${label}: expected exactly the six locales in canonical order`);
	if (!isObject(value)) return;
	let totalItems = 0;
	for (const locale of locales) {
		const localizedValue = value[locale];
		if (kind === 'text') {
			record(isSimpleText(localizedValue), `${label}.${locale}: expected non-empty simple text`);
			if (typeof localizedValue === 'string') scalarLocaleValueCount += 1;
			continue;
		}
		record(Array.isArray(localizedValue), `${label}.${locale}: expected an array`);
		if (!Array.isArray(localizedValue)) continue;
		record(localizedValue.every(isSimpleText), `${label}.${locale}: contains invalid simple text`);
		record(new Set(localizedValue).size === localizedValue.length, `${label}.${locale}: contains duplicate entries`);
		localizedListItemCount += localizedValue.length;
		totalItems += localizedValue.length;
	}
	if (options.optionalUnit) record(totalItems > 0, `${label}: optional list field must be omitted when empty in every locale`);
}

const entitySchemas = {
	product: {
		required: ['schemaVersion', 'entityType', 'id', 'typeTermKey', 'classificationTermKeys', 'species', 'regions', 'manufacturerId', 'activeIngredientIds', 'regulatoryIdentifiers', 'localizedContent', 'sections'],
		optional: ['contentPath', 'targetTermKeys', 'vaccineProfileTermKeys', 'lifeStageTermKeys', 'therapeuticScopeTermKeys'], localized: { name: 'text', aliases: 'list', commercialLine: 'text', presentationDosage: 'text', targetSpeciesWarnings: 'list' }, requiredLocalized: ['name', 'aliases']
	},
	manufacturer: {
		required: ['schemaVersion', 'entityType', 'id', 'typeTermKey', 'classificationTermKeys', 'regions', 'website', 'localizedContent', 'sections'],
		optional: ['contentPath'], localized: { name: 'text', aliases: 'list' }, requiredLocalized: ['name', 'aliases']
	},
	active_ingredient: {
		required: ['schemaVersion', 'entityType', 'id', 'typeTermKey', 'classificationTermKeys', 'regions', 'nomenclature', 'atcVetCode', 'localizedContent', 'sections'],
		optional: ['contentPath'], localized: { name: 'text', aliases: 'list', atcVetSystem: 'text' }, requiredLocalized: ['name', 'aliases']
	},
	condition: {
		required: ['schemaVersion', 'entityType', 'id', 'typeTermKey', 'classificationTermKeys', 'regions', 'localizedContent', 'sections'],
		optional: ['contentPath'], localized: { name: 'text', aliases: 'list' }, requiredLocalized: ['name', 'aliases']
	},
	breed: {
		required: ['schemaVersion', 'entityType', 'id', 'species', 'originPlaceIds', 'sizeTermKey', 'averageWeightKg', 'averageHeightCm', 'localizedContent', 'sections'],
		optional: ['contentPath'], localized: { name: 'text', aliases: 'list' }, requiredLocalized: ['name', 'aliases']
	},
	geo_place: {
		required: ['schemaVersion', 'entityType', 'id', 'placeType', 'countryCodes', 'parentPlaceId', 'centroid', 'localizedContent'],
		optional: [], localized: { name: 'text', aliases: 'list' }, requiredLocalized: ['name', 'aliases']
	},
	treatment_protocol: {
		required: ['schemaVersion', 'entityType', 'id', 'kind', 'species', 'productIds', 'doses', 'localizedContent'],
		optional: [], localized: { name: 'text', observation: 'text' }, requiredLocalized: ['name']
	},
	taxonomy: {
		required: ['schemaVersion', 'entityType', 'id', 'domain', 'purpose', 'terms'],
		optional: [], localized: {}, requiredLocalized: []
	}
};

const allowedSections = {
	product: new Set(['about', 'presentations', 'indications', 'administration', 'interactions', 'pharmacology', 'studies', 'videos', 'distributors', 'references']),
	manufacturer: new Set(['about', 'portfolio', 'support', 'references']),
	active_ingredient: new Set(['about', 'uses', 'safety', 'references']),
	condition: new Set(['about', 'clinicalSigns', 'diagnosis', 'management', 'prevention', 'references']),
	breed: new Set(['characteristics', 'morphology', 'behavior', 'diseases', 'references'])
};

const tree = await walk(knowledgeRoot);
record(tree.special.length === 0, `special files or symlinks are forbidden: ${tree.special.map((file) => path.relative(root, file)).join(', ')}`);
const localizedDirectories = tree.directories.filter((directory) => path.basename(directory) === 'localized');
record(localizedDirectories.length === 0, `localized directories are forbidden: ${localizedDirectories.map((directory) => path.relative(root, directory)).join(', ')}`);

const entityFiles = tree.files.filter((file) => path.basename(file) === 'entity.json');
const entities = [];
const entriesByIdentity = new Map();
const identities = new Set();
const referencedMarkdown = new Set();
const entityAliasOwners = new Map();
let sectionCount = 0;
let editorialEntityCount = 0;
let editorialDocumentCount = 0;
let doseCount = 0;
let taxonomyTermCount = 0;

async function assertSections(entry) {
	const { file, manifest } = entry;
	const relative = path.relative(root, file);
	const sections = manifest.sections ?? [];
	record(Array.isArray(sections), `${relative}: sections must be an array`);
	if (!Array.isArray(sections)) return;
	if (sections.length === 0) {
		record(manifest.contentPath === undefined, `${relative}: contentPath must be omitted without sections`);
		return;
	}
	editorialEntityCount += 1;
	record(manifest.contentPath === './content', `${relative}: contentPath must be ./content`);
	const entityDirectory = path.dirname(file);
	const absolute = path.resolve(entityDirectory, manifest.contentPath ?? '');
	record(absolute.startsWith(`${entityDirectory}${path.sep}`), `${relative}: contentPath escapes entity directory`);
	let names = [];
	try {
		names = (await readdir(absolute, { withFileTypes: true })).filter((item) => item.isFile()).map((item) => item.name).sort();
	} catch {
		failures.push(`${relative}: missing content directory`);
		return;
	}
	record(same(names, locales.map((locale) => `${locale}.md`).sort()), `${relative}: expected exactly six localized editorial documents`);
	entry.editorialBodies = {};
	const keys = new Set();
	for (const [index, section] of sections.entries()) {
		sectionCount += 1;
		assertKeys(section, ['sectionKey', 'sectionNumber'], [], `${relative} section`);
		record(allowedSections[manifest.entityType]?.has(section.sectionKey), `${relative}: unsupported sectionKey ${section.sectionKey}`);
		record(!keys.has(section.sectionKey), `${relative}: duplicate sectionKey ${section.sectionKey}`);
		keys.add(section.sectionKey);
		record(Number.isInteger(section.sectionNumber) && section.sectionNumber === index + 1, `${relative} ${section.sectionKey}: sectionNumber must be contiguous and ordered`);
	}
	for (const locale of locales) {
		const document = path.join(absolute, `${locale}.md`);
		referencedMarkdown.add(document);
		editorialDocumentCount += 1;
		const content = await readFile(document, 'utf8');
		const lines = content.split(/\r?\n/u);
		const delimiters = [];
		for (const [lineIndex, line] of lines.entries()) {
			if (!line.startsWith('# ')) continue;
			const match = line.match(/^# ([1-9]\d*)(?:\.(?:\s.*)?|\s.*)?$/u);
			record(Boolean(match), `${path.relative(root, document)}:${lineIndex + 1}: invalid level-one section delimiter`);
			if (match) delimiters.push({ lineIndex, sectionNumber: Number(match[1]) });
		}
		const firstLine = delimiters[0]?.lineIndex ?? lines.length;
		record(lines.slice(0, firstLine).every((line) => line.trim().length === 0), `${path.relative(root, document)}: content before first section`);
		record(same(delimiters.map(({ sectionNumber }) => sectionNumber), sections.map(({ sectionNumber }) => sectionNumber)), `${path.relative(root, document)}: section delimiters differ from manifest`);
		entry.editorialBodies[locale] = {};
		for (const [index, delimiter] of delimiters.entries()) {
			const next = delimiters[index + 1]?.lineIndex ?? lines.length;
			const section = sections[index];
			if (section) entry.editorialBodies[locale][section.sectionKey] = lines.slice(delimiter.lineIndex + 1, next).join('\n').trim();
		}
	}
}

for (const file of entityFiles) {
	const manifest = await json(file);
	const relative = path.relative(root, file);
	record(manifest.schemaVersion === 1, `${relative}: schemaVersion must be 1`);
	record(entitySchemas[manifest.entityType] !== undefined, `${relative}: unknown entityType ${manifest.entityType}`);
	record(typeof manifest.id === 'string' && manifest.id.length > 0, `${relative}: id is required`);
	const identity = `${manifest.entityType}:${manifest.id}`;
	record(!identities.has(identity), `${relative}: duplicate identity ${identity}`);
	identities.add(identity);
	const entry = { file, manifest };
	entities.push(entry);
	entriesByIdentity.set(identity, entry);
	const schema = entitySchemas[manifest.entityType];
	if (!schema) continue;
	assertKeys(manifest, schema.required, schema.optional, relative);
	if (manifest.entityType !== 'taxonomy') {
		const optionalLocalized = Object.keys(schema.localized).filter((key) => !schema.requiredLocalized.includes(key));
		for (const key of Object.keys(manifest.localizedContent ?? {})) if (manifest.entityType === 'active_ingredient' && key.startsWith('denomination_')) optionalLocalized.push(key);
		assertKeys(manifest.localizedContent, schema.requiredLocalized, optionalLocalized, `${relative} localizedContent`);
		for (const [key, value] of Object.entries(manifest.localizedContent ?? {})) {
			const kind = key.startsWith('denomination_') ? 'text' : schema.localized[key];
			record(kind !== undefined, `${relative}: unsupported localizedContent.${key}`);
			if (kind) assertLocalizedField(value, kind, `${relative} localizedContent.${key}`);
			if (key === 'aliases' && isObject(value)) {
				for (const locale of locales) for (const alias of value[locale] ?? []) {
					entityAliasValueCount += 1;
					const normalized = `${locale}:${alias.toLocaleLowerCase(locale)}`;
					const owners = entityAliasOwners.get(normalized) ?? new Set();
					owners.add(identity);
					entityAliasOwners.set(normalized, owners);
				}
			}
		}
		await assertSections(entry);
	}
	if (manifest.entityType === 'taxonomy') {
		record(Array.isArray(manifest.terms), `${relative}: terms must be an array`);
		const termKeys = new Set();
		for (const [index, term] of (manifest.terms ?? []).entries()) {
			taxonomyTermCount += 1;
			assertKeys(term, ['key', 'parentKey', 'order', 'localizedContent'], [], `${relative} term ${index}`);
			record(typeof term.key === 'string' && term.key.length > 0, `${relative}: term key is required`);
			record(!termKeys.has(term.key), `${relative}: duplicate term ${term.key}`);
			termKeys.add(term.key);
			record(term.order === index, `${relative} term ${term.key}: order must equal array position`);
			assertKeys(term.localizedContent, ['label'], ['aliases'], `${relative} term ${term.key} localizedContent`);
			assertLocalizedField(term.localizedContent?.label, 'text', `${relative} term ${term.key} label`);
			taxonomyLabelValueCount += locales.length;
			if (term.localizedContent?.aliases !== undefined) {
				const before = localizedListItemCount;
				assertLocalizedField(term.localizedContent.aliases, 'list', `${relative} term ${term.key} aliases`, { optionalUnit: true });
				taxonomyAliasValueCount += localizedListItemCount - before;
			}
		}
		for (const term of manifest.terms ?? []) {
			record(term.parentKey === null || termKeys.has(term.parentKey), `${relative} term ${term.key}: unresolved parent ${term.parentKey}`);
			const visited = new Set([term.key]);
			let parent = term.parentKey;
			while (parent !== null) {
				record(!visited.has(parent), `${relative} term ${term.key}: parent cycle`);
				if (visited.has(parent)) break;
				visited.add(parent);
				parent = manifest.terms.find(({ key }) => key === parent)?.parentKey ?? null;
			}
		}
	}
	for (const dose of manifest.doses ?? []) {
		doseCount += 1;
		assertKeys(dose, ['id', 'validityValue', 'validityUnit', 'localizedContent'], [], `${relative} dose ${dose.id}`);
		assertKeys(dose.localizedContent, ['label'], [], `${relative} dose ${dose.id} localizedContent`);
		assertLocalizedField(dose.localizedContent?.label, 'text', `${relative} dose ${dose.id} label`);
	}
	const serialized = JSON.stringify(manifest);
	for (const forbidden of ['labelKey', 'translationKey', 'tableName', 'columnName', 'casPath', 'contentHash', 'mediaKey', 'productType', 'typePath', 'sizeCategory']) {
		record(!serialized.includes(`\"${forbidden}\"`), `${relative}: forbidden field ${forbidden}`);
	}
	record(manifest.aliases === undefined && manifest.labels === undefined && manifest.classification === undefined, `${relative}: replaced top-level localized or classification field remains`);
	record(!serialized.includes('searchConcept'), `${relative}: searchConcept is forbidden`);
	if (manifest.entityType === 'taxonomy') record(!/search/u.test(manifest.purpose), `${relative}: generic search taxonomy purpose is forbidden`);
	if (manifest.entityType === 'product') for (const field of ['activeIngredientIds', 'targetTermKeys', 'vaccineProfileTermKeys', 'lifeStageTermKeys', 'therapeuticScopeTermKeys']) {
		const values = manifest[field];
		if (values === undefined) continue;
		record(Array.isArray(values), `${relative}: ${field} must be an array`);
		record(new Set(values).size === values.length, `${relative}: ${field} contains duplicates`);
		if (field !== 'activeIngredientIds') record(values.length > 0, `${relative}: empty optional ${field} must be omitted`);
	}
}

const markdownFiles = tree.files.filter((file) => file.endsWith('.md') && file !== path.join(knowledgeRoot, 'README.md'));
record(same([...markdownFiles].sort(), [...referencedMarkdown].sort()), 'Markdown files must be exactly the declared localized editorial documents');
for (const file of markdownFiles) {
	const content = await readFile(file, 'utf8');
	record(!content.startsWith('---\n'), `${path.relative(root, file)}: front matter is forbidden`);
}
const mediaFiles = tree.files.filter((file) => file.includes(`${path.sep}media${path.sep}`));
record(mediaFiles.length === 0, 'canonical media must be empty because the current public defaults contain no media');

for (const [alias, owners] of entityAliasOwners) record(owners.size === 1, `entity-owned alias ${alias} is duplicated by ${[...owners].join(', ')}`);

const byType = Object.groupBy(entities, ({ manifest }) => manifest.entityType);
const inventory = await json(path.join(knowledgeRoot, 'inventory.json'));
for (const [entityType, expected] of Object.entries(inventory.entitiesByType)) record((byType[entityType] ?? []).length === expected, `${entityType}: expected ${expected}, found ${(byType[entityType] ?? []).length}`);

const taxonomies = new Map((byType.taxonomy ?? []).map((entry) => [`${entry.manifest.domain}:${entry.manifest.purpose}`, entry.manifest]));
record(taxonomies.size === 13, 'expected one taxonomy for each domain and purpose pair');
let typeReferenceCount = 0;
let classificationReferenceCount = 0;
let sizeReferenceCount = 0;
const semanticReferenceCounts = { target: 0, vaccine_profile: 0, life_stage: 0, therapeutic_scope: 0 };
for (const { file, manifest } of entities) {
	const relative = path.relative(root, file);
	if (manifest.typeTermKey !== undefined) {
		typeReferenceCount += 1;
		const owner = taxonomies.get(`${manifest.entityType}:type`);
		record(owner?.terms.some(({ key }) => key === manifest.typeTermKey), `${relative}: unresolved or cross-domain typeTermKey ${manifest.typeTermKey}`);
	}
	if (manifest.classificationTermKeys !== undefined) {
		record(Array.isArray(manifest.classificationTermKeys), `${relative}: classificationTermKeys must be an array`);
		record(new Set(manifest.classificationTermKeys).size === manifest.classificationTermKeys.length, `${relative}: duplicate classificationTermKeys`);
		const owner = taxonomies.get(`${manifest.entityType}:classification`);
		for (const key of manifest.classificationTermKeys ?? []) {
			classificationReferenceCount += 1;
			record(owner?.terms.some((term) => term.key === key), `${relative}: unresolved or cross-domain classification ${key}`);
		}
	}
	if (manifest.sizeTermKey !== undefined) {
		sizeReferenceCount += 1;
		const owner = taxonomies.get('breed:size');
		record(owner?.terms.some(({ key }) => key === manifest.sizeTermKey), `${relative}: unresolved sizeTermKey ${manifest.sizeTermKey}`);
	}
	if (manifest.entityType === 'product') for (const [field, purpose] of [['targetTermKeys', 'target'], ['vaccineProfileTermKeys', 'vaccine_profile'], ['lifeStageTermKeys', 'life_stage'], ['therapeuticScopeTermKeys', 'therapeutic_scope']]) {
		const owner = taxonomies.get(`product:${purpose}`);
		for (const key of manifest[field] ?? []) {
			semanticReferenceCounts[purpose] += 1;
			record(owner?.terms.some((term) => term.key === key), `${relative}: unresolved or cross-domain ${field} value ${key}`);
		}
	}
}

const taxonomyLocalizedValues = new Map();
for (const taxonomy of byType.taxonomy ?? []) for (const term of taxonomy.manifest.terms) for (const locale of locales) {
	for (const value of [term.localizedContent.label[locale], ...(term.localizedContent.aliases?.[locale] ?? [])]) taxonomyLocalizedValues.set(`${locale}:${value.toLocaleLowerCase(locale)}`, `${taxonomy.manifest.id}:${term.key}`);
}
for (const [alias, owners] of entityAliasOwners) record(!taxonomyLocalizedValues.has(alias), `entity alias ${alias} duplicates taxonomy ${taxonomyLocalizedValues.get(alias)}`);

const sources = {
	product: await sourceItems(path.join(root, 'packages/types/src/catalog/defaults/products')),
	manufacturer: await sourceItems(path.join(root, 'packages/types/src/catalog/defaults/manufacturers')),
	active_ingredient: await sourceItems(path.join(root, 'packages/types/src/catalog/defaults/active-ingredients')),
	condition: await sourceItems(path.join(root, 'packages/types/src/catalog/defaults/conditions')),
	breed: await sourceItems(path.join(root, 'packages/types/src/domain/pet/defaults'))
};
for (const [entityType, items] of Object.entries(sources)) {
	const canonicalIds = new Set((byType[entityType] ?? []).map(({ manifest }) => manifest.id));
	const sourceIds = new Set(items.map(({ value }) => value.id));
	if (entityType === 'active_ingredient') record([...sourceIds].every((id) => canonicalIds.has(id)) && canonicalIds.size === 17, 'active_ingredient: source IDs must be preserved alongside 15 explicit product ingredients');
	else record(same([...canonicalIds].sort(), [...sourceIds].sort()), `${entityType}: canonical and source IDs differ`);
}

const translations = {};
for (const locale of locales) translations[locale] = {
	main: await translationMap(path.join(root, 'packages/core-local/src/i18n', `${locale}.ts`)),
	breed: await translationMap(path.join(root, 'packages/core-local/src/i18n/breeds', `${locale}.ts`)),
	catalogAlias: await translationMap(path.join(root, 'packages/core-local/src/i18n/catalog-aliases', `${locale}.ts`))
};
const aliasConceptsByValue = new Map();
for (const locale of locales) for (const [qualifiedKey, values] of translations[locale].catalogAlias) for (const value of values) {
	const concepts = aliasConceptsByValue.get(value) ?? new Set();
	concepts.add(qualifiedKey.replace(/^catalogAlias\./, ''));
	aliasConceptsByValue.set(value, concepts);
}
const directProductTypeConcepts = new Map([
	['endectocide', 'medication.antiparasitic.endectocide'],
	['ectoparasiticide', 'medication.antiparasitic.ectoparasiticide']
]);
const literalAliasConcepts = new Map([
	['Bordetella bronchiseptica', 'canineInfectiousTracheobronchitis'], ['FeLV', 'felineLeukemia'], ['FVRCP', 'felineTriple'], ['FVRCP+Ch', 'felineQuadruple'], ['FVRCP+Ch+FeLV', 'felineQuintuple'],
	['V3', 'felineV3'], ['V 3', 'felineV3'], ['V4', 'felineV4'], ['V 4', 'felineV4'], ['V5', 'felineV5'], ['V 5', 'felineV5'], ['V8', 'canineV8'], ['V 8', 'canineV8'], ['V10', 'canineV10'], ['V 10', 'canineV10']
]);
function analyzeProductAliases(source) {
	const concepts = [];
	const ownAliases = localizedWith(() => []);
	for (const alias of source.aliases) {
		const matches = literalAliasConcepts.has(alias) ? [literalAliasConcepts.get(alias)] : [...(aliasConceptsByValue.get(alias) ?? [])];
		record(matches.length <= 1, `source product ${source.id}: ambiguous alias ${alias}`);
		if (matches.length === 0) for (const locale of locales) ownAliases[locale].push(alias);
		else {
			const concept = matches[0];
			if (!concepts.includes(concept)) concepts.push(concept);
		}
	}
	return { concepts, ownAliases };
}

const productAnalyses = new Map(sources.product.map(({ value }) => [value.id, analyzeProductAliases(value)]));

const ingredientDefinitions = {
	afoxolaner: ['42ecd4a0-c4b3-4276-8122-693460cfe6a6', 'antiInfective.antiparasitic.isoxazolines'],
	milbemycinOxime: ['afda30e9-4ab0-4b35-a186-0e4891bd412d', 'antiInfective.antiparasitic.macrocyclicLactones'],
	emodepside: ['af5091cf-1fb6-4104-83fb-e65fd5c4d72f', 'antiInfective.antiparasitic.cyclooctadepsipeptides'],
	praziquantel: ['43e22778-1801-4c2a-ad8d-434de9654eaa', 'antiInfective.antiparasitic.isoquinolones'],
	febantel: ['dfc38256-ecf1-4f1e-8571-6647b678c3be', 'antiInfective.antiparasitic.benzimidazoles'],
	fenbendazole: ['e552d865-eb96-40f6-835c-5ced63404da3', 'antiInfective.antiparasitic.benzimidazoles'],
	fipronil: ['76a4b9e3-0a82-4ddd-8ce8-b0f5aeb5f558', 'antiInfective.antiparasitic.phenylpyrazoles'],
	fluralaner: ['7b689484-1ac8-453a-947a-93a9c7b50f61', 'antiInfective.antiparasitic.isoxazolines'],
	ivermectin: ['456d6f0e-e862-4c3c-ae30-15e96b5e7459', 'antiInfective.antiparasitic.macrocyclicLactones'],
	moxidectin: ['9aba4d14-23bb-4f25-bae1-6f0a6f3e37c5', 'antiInfective.antiparasitic.macrocyclicLactones'],
	imidacloprid: ['611f7516-b4da-4de8-ae4c-56dd407cb8da', 'antiInfective.antiparasitic.neonicotinoids'],
	nitenpyram: ['0a86ea8d-df19-4b1f-884e-2439685db3a8', 'antiInfective.antiparasitic.neonicotinoids'],
	pyrantelPamoate: ['1abdddb0-c611-4ef5-aabd-1c5026a286c6', 'antiInfective.antiparasitic.tetrahydropyrimidines'],
	sarolaner: ['7cce2524-d9ac-4d6e-97e2-18f7e488ee16', 'antiInfective.antiparasitic.isoxazolines'],
	selamectin: ['5a36d7e3-34c8-4bb4-9a0c-111391ccf6fc', 'antiInfective.antiparasitic.macrocyclicLactones']
};
const ingredientConcepts = {
	afoxolaner: ['afoxolaner'], afoxolanerMilbemycinOxime: ['afoxolaner', 'milbemycinOxime'], emodepsidePraziquantel: ['emodepside', 'praziquantel'], febantel: ['febantel'], fenbendazole: ['fenbendazole'], fipronil: ['fipronil'], fluralaner: ['fluralaner'], ivermectin: ['ivermectin'], milbemycinOximePraziquantel: ['milbemycinOxime', 'praziquantel'], moxidectinImidacloprid: ['moxidectin', 'imidacloprid'], nitenpyram: ['nitenpyram'], praziquantelPyrantelPamoate: ['praziquantel', 'pyrantelPamoate'], praziquantelPyrantelPamoateFebantel: ['praziquantel', 'pyrantelPamoate', 'febantel'], pyrantelPamoateFebantel: ['pyrantelPamoate', 'febantel'], sarolaner: ['sarolaner'], sarolanerMoxidectinPyrantel: ['sarolaner', 'moxidectin', 'pyrantelPamoate'], selamectin: ['selamectin']
};
const targetConcepts = {
	canineAdenovirusType2: ['pathogen.canineAdenovirusType2'], canineCoronavirus: ['disease.canineCoronavirusInfection', 'pathogen.canineCoronavirus'], canineDistemper: ['disease.canineDistemper'], canineHerpesvirus: ['pathogen.canineHerpesvirus'], canineInfectiousTracheobronchitis: ['disease.canineInfectiousTracheobronchitis', 'pathogen.bordetellaBronchiseptica'], canineLeptospirosis: ['disease.canineLeptospirosis'], canineParainfluenza: ['disease.canineParainfluenza'], canineParvovirus: ['disease.canineParvovirosis', 'pathogen.canineParvovirus'], endoparasites: ['parasite.endoparasite'], felineCalicivirosis: ['disease.felineCalicivirosis'], felineChlamydiosis: ['disease.felineChlamydiosis'], felineLeukemia: ['disease.felineLeukemia', 'pathogen.felineLeukemiaVirus'], felinePanleukopenia: ['disease.felinePanleukopenia'], felineRhinotracheitis: ['disease.felineRhinotracheitis'], fleaTreatment: ['parasite.flea'], giardia: ['parasite.giardia'], giardiasis: ['disease.giardiasis'], infectiousCanineHepatitis: ['disease.infectiousCanineHepatitis'], kalaAzar: ['disease.leishmaniasis'], kennelCough: ['disease.canineInfectiousTracheobronchitis'], leishmaniasis: ['disease.leishmaniasis'], nematodes: ['parasite.nematode'], rabies: ['disease.rabies'], roundworm: ['parasite.roundworm'], tapewormTreatment: ['parasite.tapeworm'], tickTreatment: ['parasite.tick']
};
const vaccineProfileConcepts = {
	canineMultiple: ['canine.multivalent'], polyvalent: ['canine.multivalent'], canineV8: ['canine.v8'], canineV10: ['canine.v10'], felineTriple: ['feline.trivalent'], felineV3: ['feline.trivalent'], felineQuadruple: ['feline.tetravalent'], felineV4: ['feline.tetravalent'], felineQuintuple: ['feline.pentavalent'], felineV5: ['feline.pentavalent']
};
const lifeStageConcepts = { puppy: ['puppy'] };
const therapeuticScopeConcepts = { broadSpectrumAntiparasitic: ['broadSpectrum'] };
const derivedConcepts = new Set(['topicalFelineAntiparasitic']);

function appendUnique(target, values) {
	for (const value of values) if (!target.includes(value)) target.push(value);
}

const taxonomyDefinitions = [
	['product-types', 'product', 'type', 'type-tree/product', 'product.type.'],
	['product-classifications', 'product', 'classification', 'classification/product', 'catalog.product.classification.'],
	['manufacturer-types', 'manufacturer', 'type', 'type-tree/manufacturer', 'catalog.manufacturer.type.'],
	['manufacturer-classifications', 'manufacturer', 'classification', 'classification/manufacturer', 'catalog.manufacturer.classification.'],
	['active-ingredient-types', 'active_ingredient', 'type', 'type-tree/active-ingredient', 'catalog.activeIngredient.type.'],
	['active-ingredient-classifications', 'active_ingredient', 'classification', 'classification/active-ingredient', 'catalog.activeIngredient.classification.'],
	['condition-types', 'condition', 'type', 'type-tree/condition', 'catalog.condition.type.'],
	['condition-classifications', 'condition', 'classification', 'classification/condition', 'catalog.condition.classification.']
];

for (const [id, domain, purpose, group, prefix] of taxonomyDefinitions) {
	const entry = entriesByIdentity.get(`taxonomy:${id}`);
	record(entry?.manifest.domain === domain && entry?.manifest.purpose === purpose, `taxonomy ${id}: domain or purpose mismatch`);
	if (!entry) continue;
	const maps = {};
	for (const locale of locales) maps[locale] = await translationMap(path.join(root, 'packages/core-local/src/i18n', group, `${locale}.ts`));
	const sourceKeys = [...maps['pt-BR'].keys()].sort();
	const extraTerms = id === 'active-ingredient-types' ? 1 : 0;
	record(entry.manifest.terms.length === sourceKeys.length + extraTerms, `taxonomy ${id}: term count mismatch`);
	for (const sourceKey of sourceKeys) {
		const key = sourceKey.startsWith(prefix) ? sourceKey.slice(prefix.length) : sourceKey;
		const term = entry.manifest.terms.find((candidate) => candidate.key === key);
		const possibleParent = key.includes('.') ? key.slice(0, key.lastIndexOf('.')) : null;
		const parentKey = sourceKeys.some((candidate) => (candidate.startsWith(prefix) ? candidate.slice(prefix.length) : candidate) === possibleParent) ? possibleParent : null;
		record(term?.key === key && term?.parentKey === parentKey, `taxonomy ${id}: structure mismatch for ${key}`);
		record(locales.every((locale) => term?.localizedContent.label[locale] === maps[locale].get(sourceKey)), `taxonomy ${id}: labels mismatch for ${key}`);
	}
	if (id === 'product-types') for (const [concept, key] of directProductTypeConcepts) {
		const term = entry.manifest.terms.find((candidate) => candidate.key === key);
		record(locales.every((locale) => same(term?.localizedContent.aliases?.[locale], translations[locale].catalogAlias.get(`catalogAlias.${concept}`))), `taxonomy ${id}: aliases mismatch for ${key}`);
	}
	if (id === 'active-ingredient-types') record(entry.manifest.terms.some(({ key, parentKey }) => key === 'antiInfective.antiparasitic.cyclooctadepsipeptides' && parentKey === 'antiInfective.antiparasitic'), 'active ingredient types: missing cyclooctadepsipeptides');
}

const semanticTaxonomyKeys = {
	'product-targets': ['disease', 'disease.canineDistemper', 'disease.infectiousCanineHepatitis', 'disease.canineCoronavirusInfection', 'disease.canineParainfluenza', 'disease.canineParvovirosis', 'disease.canineLeptospirosis', 'disease.canineInfectiousTracheobronchitis', 'disease.giardiasis', 'disease.leishmaniasis', 'disease.rabies', 'disease.felineRhinotracheitis', 'disease.felineCalicivirosis', 'disease.felinePanleukopenia', 'disease.felineChlamydiosis', 'disease.felineLeukemia', 'pathogen', 'pathogen.canineAdenovirusType2', 'pathogen.canineCoronavirus', 'pathogen.canineParvovirus', 'pathogen.canineHerpesvirus', 'pathogen.bordetellaBronchiseptica', 'pathogen.felineLeukemiaVirus', 'parasite', 'parasite.giardia', 'parasite.endoparasite', 'parasite.nematode', 'parasite.roundworm', 'parasite.tapeworm', 'parasite.flea', 'parasite.tick'],
	'product-vaccine-profiles': ['canine', 'canine.multivalent', 'canine.v8', 'canine.v10', 'feline', 'feline.trivalent', 'feline.tetravalent', 'feline.pentavalent'],
	'product-life-stages': ['puppy'],
	'product-therapeutic-scopes': ['broadSpectrum']
};
for (const [id, keys] of Object.entries(semanticTaxonomyKeys)) record(same(entriesByIdentity.get(`taxonomy:${id}`)?.manifest.terms.map(({ key }) => key), keys), `taxonomy ${id}: semantic term set or order mismatch`);
const targetTaxonomy = entriesByIdentity.get('taxonomy:product-targets')?.manifest;
const diseaseTracheobronchitis = targetTaxonomy?.terms.find(({ key }) => key === 'disease.canineInfectiousTracheobronchitis');
const bordetella = targetTaxonomy?.terms.find(({ key }) => key === 'pathogen.bordetellaBronchiseptica');
const felineLeukemia = targetTaxonomy?.terms.find(({ key }) => key === 'disease.felineLeukemia');
const felineLeukemiaVirus = targetTaxonomy?.terms.find(({ key }) => key === 'pathogen.felineLeukemiaVirus');
record(locales.every((locale) => !(diseaseTracheobronchitis?.localizedContent.aliases?.[locale] ?? []).includes('Bordetella bronchiseptica') && bordetella?.localizedContent.label[locale] === 'Bordetella bronchiseptica'), 'Bordetella must belong only to its pathogen term');
record(locales.every((locale) => !(felineLeukemia?.localizedContent.aliases?.[locale] ?? []).includes('FeLV') && (felineLeukemiaVirus?.localizedContent.aliases?.[locale] ?? []).includes('FeLV')), 'FeLV must belong only to its pathogen term');

const breedSize = entriesByIdentity.get('taxonomy:breed-sizes')?.manifest;
const breedSizeKeys = ['small', 'medium', 'large', 'giant'];
record(same(breedSize?.terms.map(({ key }) => key), breedSizeKeys), 'taxonomy breed-sizes: term order mismatch');
for (const term of breedSize?.terms ?? []) record(locales.every((locale) => term.localizedContent.label[locale] === translations[locale].main.get(`breedReference.size.${term.key}`)), `taxonomy breed-sizes: labels mismatch for ${term.key}`);

function terms(taxonomyId) {
	return entriesByIdentity.get(`taxonomy:${taxonomyId}`).manifest.terms;
}

function resolveLeaf(taxonomyId, leaf) {
	const matches = terms(taxonomyId).filter(({ key }) => key === leaf || key.endsWith(`.${leaf}`));
	record(matches.length === 1, `${taxonomyId}: cannot uniquely resolve ${leaf}`);
	return matches[0]?.key;
}

async function assertSourceSections(entry, sourceSections, label) {
	const expected = Object.entries(sourceSections ?? {});
	record(entry.manifest.sections.length === expected.length, `${label}: section count mismatch`);
	for (const [index, [sectionKey, body]] of expected.entries()) {
		const section = entry.manifest.sections[index];
		record(section?.sectionKey === sectionKey && section?.sectionNumber === index + 1, `${label}: section order or number mismatch at ${sectionKey}`);
		if (!section) continue;
		for (const locale of locales) record(entry.editorialBodies?.[locale]?.[sectionKey] === body, `${label}: ${sectionKey}.${locale} content mismatch`);
	}
}

for (const { value: source } of sources.product) {
	const entry = entriesByIdentity.get(`product:${source.id}`);
	if (!entry) continue;
	const manifest = entry.manifest;
	const analysis = productAnalyses.get(source.id);
	let expectedType = source.type.slice(1).filter(Boolean).join('.');
	if (expectedType === 'medication.antiparasitic') {
		const direct = analysis.concepts.filter((concept) => directProductTypeConcepts.has(concept));
		expectedType = direct.length === 1 ? directProductTypeConcepts.get(direct[0]) : 'medication.antiparasitic.endoparasiticide';
	}
	const classification = source.extension?.classification ?? {};
	const commercial = classification.commercialTherapeutic ?? {};
	const administration = classification.formAndAdministration ?? {};
	const expectedClassifications = [];
	if (commercial.compositionOrigin) expectedClassifications.push(`origin.${commercial.compositionOrigin}`);
	if (commercial.commercialCategory) expectedClassifications.push(`commercial.${commercial.commercialCategory}`);
	if (commercial.therapeuticAction) expectedClassifications.push(`therapeuticAction.${commercial.therapeuticAction}`);
	if (administration.pharmaceuticalForm) expectedClassifications.push(`pharmaceuticalForm.${administration.pharmaceuticalForm}`);
	for (const route of administration.administrationRoutes ?? []) expectedClassifications.push(`administrationRoute.${route}`);
	const expectedIngredientIds = [...(source.activeIngredientIds ?? [])];
	const expectedTargets = [];
	const expectedProfiles = [];
	const expectedLifeStages = [];
	const expectedScopes = [];
	for (const concept of analysis.concepts) {
		if (directProductTypeConcepts.has(concept)) continue;
		if (ingredientConcepts[concept]) appendUnique(expectedIngredientIds, ingredientConcepts[concept].map((key) => ingredientDefinitions[key][0]));
		else if (targetConcepts[concept]) appendUnique(expectedTargets, targetConcepts[concept]);
		else if (vaccineProfileConcepts[concept]) appendUnique(expectedProfiles, vaccineProfileConcepts[concept]);
		else if (lifeStageConcepts[concept]) appendUnique(expectedLifeStages, lifeStageConcepts[concept]);
		else if (therapeuticScopeConcepts[concept]) appendUnique(expectedScopes, therapeuticScopeConcepts[concept]);
		else if (derivedConcepts.has(concept)) appendUnique(expectedClassifications, ['administrationRoute.topical']);
		else record(false, `product ${source.id}: unclassified semantic concept ${concept}`);
	}
	record(manifest.typeTermKey === expectedType, `product ${source.id}: normalized type mismatch`);
	record(same(manifest.classificationTermKeys, expectedClassifications), `product ${source.id}: normalized classifications mismatch`);
	record(same(manifest.species, source.species) && same(manifest.regions, source.regions), `product ${source.id}: species or regions mismatch`);
	record(manifest.manufacturerId === source.manufacturerId && same(manifest.activeIngredientIds, expectedIngredientIds), `product ${source.id}: relations mismatch`);
	for (const [field, expected] of [['targetTermKeys', expectedTargets], ['vaccineProfileTermKeys', expectedProfiles], ['lifeStageTermKeys', expectedLifeStages], ['therapeuticScopeTermKeys', expectedScopes]]) record(expected.length === 0 ? manifest[field] === undefined : same(manifest[field], expected), `product ${source.id}: ${field} mismatch`);
	record(entriesByIdentity.has(`manufacturer:${manifest.manufacturerId}`), `product ${source.id}: unresolved manufacturer`);
	for (const id of manifest.activeIngredientIds) record(entriesByIdentity.has(`active_ingredient:${id}`), `product ${source.id}: unresolved active ingredient ${id}`);
	record(same(manifest.localizedContent.name, localized(source.name)), `product ${source.id}: name mismatch`);
	record(same(manifest.localizedContent.aliases, analysis.ownAliases), `product ${source.id}: entity-owned aliases mismatch`);
	record(same(manifest.regulatoryIdentifiers, {
		brazilMapa: classification.regulatoryIdentifiers?.brazilMapa ?? null,
		unitedStatesNada: classification.regulatoryIdentifiers?.unitedStatesNada ?? null,
		unitedStatesAnada: classification.regulatoryIdentifiers?.unitedStatesAnada ?? null,
		gtinEan: classification.regulatoryIdentifiers?.gtinEan ?? null
	}), `product ${source.id}: regulatory identifiers mismatch`);
	const expectedOptional = {
		commercialLine: source.extension?.commercialLine || undefined,
		presentationDosage: administration.presentationDosage || undefined,
		targetSpeciesWarnings: (classification.targetSpecies?.warnings ?? []).length > 0 ? classification.targetSpecies.warnings : undefined
	};
	for (const [key, value] of Object.entries(expectedOptional)) record(value === undefined ? manifest.localizedContent[key] === undefined : same(manifest.localizedContent[key], localized(value)), `product ${source.id}: localized ${key} mismatch`);
	await assertSourceSections(entry, source.extension?.sections, `product ${source.id}`);
}

for (const entityType of ['manufacturer', 'condition']) for (const { value: source } of sources[entityType]) {
	const entry = entriesByIdentity.get(`${entityType}:${source.id}`);
	if (!entry) continue;
	const taxonomyPrefix = entityType === 'manufacturer' ? 'manufacturer' : 'condition';
	const expectedType = source.type.slice(1).filter(Boolean).join('.');
	const expectedClassifications = (source.extension?.classification ?? []).map((leaf) => resolveLeaf(`${taxonomyPrefix}-classifications`, leaf));
	record(entry.manifest.typeTermKey === expectedType, `${entityType} ${source.id}: type mismatch`);
	record(same(entry.manifest.classificationTermKeys, expectedClassifications), `${entityType} ${source.id}: classifications mismatch`);
	record(same(entry.manifest.regions, source.regions), `${entityType} ${source.id}: regions mismatch`);
	record(same(entry.manifest.localizedContent, { name: localized(source.name), aliases: localized(source.aliases) }), `${entityType} ${source.id}: localized content mismatch`);
	if (entityType === 'manufacturer') record(entry.manifest.website === (source.extension?.website ?? null), `manufacturer ${source.id}: website mismatch`);
	await assertSourceSections(entry, source.extension?.sections, `${entityType} ${source.id}`);
}

for (const { value: source } of sources.active_ingredient) {
	const entry = entriesByIdentity.get(`active_ingredient:${source.id}`);
	if (!entry) continue;
	const classification = source.extension?.classification ?? {};
	const expectedClassifications = Object.entries(classification.regulatoryControl ?? {}).map(([region, value]) => `regulatory.${region}.${value}`);
	if (classification.veterinaryRestriction) expectedClassifications.push(`veterinaryRestriction.${classification.veterinaryRestriction}`);
	record(entry.manifest.typeTermKey === source.type.slice(1).filter(Boolean).join('.'), `active ingredient ${source.id}: type mismatch`);
	record(same(entry.manifest.classificationTermKeys, expectedClassifications), `active ingredient ${source.id}: classifications mismatch`);
	record(same(entry.manifest.regions, source.regions), `active ingredient ${source.id}: regions mismatch`);
	record(same(entry.manifest.nomenclature, {
		scientificName: classification.nomenclature?.scientificName ?? null,
		casNumber: classification.nomenclature?.casNumber ?? null,
		denominationStandards: (classification.nomenclature?.denominations ?? []).map(({ standard }) => standard)
	}), `active ingredient ${source.id}: nomenclature mismatch`);
	record(entry.manifest.atcVetCode === (classification.atcVet?.code ?? null), `active ingredient ${source.id}: ATC Vet code mismatch`);
	record(same(entry.manifest.localizedContent.name, localized(source.name)) && same(entry.manifest.localizedContent.aliases, localized(source.aliases)), `active ingredient ${source.id}: names or aliases mismatch`);
	if (classification.atcVet?.system) record(same(entry.manifest.localizedContent.atcVetSystem, classification.atcVet.system), `active ingredient ${source.id}: ATC Vet system mismatch`);
	for (const denomination of classification.nomenclature?.denominations ?? []) {
		const defaultValue = denomination['pt-BR'] ?? Object.values(denomination).find((value) => typeof value === 'string' && value !== denomination.standard);
		const expected = localizedWith((locale) => denomination[locale] ?? defaultValue);
		record(same(entry.manifest.localizedContent[`denomination_${denomination.standard}`], expected), `active ingredient ${source.id}: denomination ${denomination.standard} mismatch`);
	}
	await assertSourceSections(entry, source.extension?.sections, `active ingredient ${source.id}`);
}

for (const [key, [id, expectedType]] of Object.entries(ingredientDefinitions)) {
	const entry = entriesByIdentity.get(`active_ingredient:${id}`);
	record(Boolean(entry), `active ingredient ${key}: missing stable entity ${id}`);
	if (!entry) continue;
	record(/^([0-9a-f]{8})-([0-9a-f]{4})-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-([0-9a-f]{12})$/u.test(id), `active ingredient ${key}: ID is not UUIDv4`);
	record(entry.manifest.typeTermKey === expectedType, `active ingredient ${key}: pharmacological type mismatch`);
	record(same(entry.manifest.classificationTermKeys, []) && same(entry.manifest.regions, []), `active ingredient ${key}: unknown classifications or regions must remain empty`);
	record(same(entry.manifest.nomenclature, { scientificName: null, casNumber: null, denominationStandards: [] }) && entry.manifest.atcVetCode === null, `active ingredient ${key}: unknown nomenclature facts must remain null or empty`);
	record(entry.manifest.sections.length === 0 && entry.manifest.contentPath === undefined, `active ingredient ${key}: artificial editorial content is forbidden`);
	for (const locale of locales) record(isSimpleText(entry.manifest.localizedContent.name[locale]), `active ingredient ${key}: missing ${locale} name`);
}

for (const { manifest } of byType.product ?? []) for (const locale of locales) {
	const relatedValues = new Set(manifest.activeIngredientIds.flatMap((id) => {
		const ingredient = entriesByIdentity.get(`active_ingredient:${id}`)?.manifest;
		return ingredient ? [ingredient.localizedContent.name[locale], ...(ingredient.localizedContent.aliases[locale] ?? [])].map((value) => value.toLocaleLowerCase(locale)) : [];
	}));
	for (const alias of manifest.localizedContent.aliases[locale]) record(!relatedValues.has(alias.toLocaleLowerCase(locale)), `product ${manifest.id}: ingredient name duplicated in ${locale} aliases`);
}

const origins = new Map();
for (const { value: source } of sources.breed) {
	origins.set(source.origin.id, source.origin);
	const entry = entriesByIdentity.get(`breed:${source.id}`);
	if (!entry) continue;
	record(same(entry.manifest.species, [source.species]) && same(entry.manifest.originPlaceIds, [source.origin.id]), `breed ${source.id}: species or origin mismatch`);
	record(entry.manifest.sizeTermKey === source.sizeCategory, `breed ${source.id}: size mismatch`);
	record(same(entry.manifest.averageWeightKg, source.averageWeightKg) && same(entry.manifest.averageHeightCm, source.averageHeightCm), `breed ${source.id}: measurements mismatch`);
	record(locales.every((locale) => entry.manifest.localizedContent.name[locale] === translations[locale].breed.get(source.labelKey)), `breed ${source.id}: name mismatch`);
	record(locales.every((locale) => same(entry.manifest.localizedContent.aliases[locale], [])), `breed ${source.id}: aliases must be empty`);
	record(entriesByIdentity.has(`geo_place:${source.origin.id}`), `breed ${source.id}: unresolved origin ${source.origin.id}`);
	await assertSourceSections(entry, source.extension?.sections, `breed ${source.id}`);
}
record((byType.geo_place ?? []).length === origins.size, `geo_place: expected ${origins.size} unique places`);
for (const origin of origins.values()) {
	const entry = entriesByIdentity.get(`geo_place:${origin.id}`);
	if (!entry) continue;
	const expectedNames = localizedWith((locale) => origin.countryCode ? new Intl.DisplayNames([locale], { type: 'region' }).of(origin.countryCode) : translations[locale].main.get(origin.labelKey));
	record(entry.manifest.placeType === (origin.countryCode ? 'country' : origin.id === 'varied' ? 'variable_origin' : 'region'), `geo place ${origin.id}: placeType mismatch`);
	record(same(entry.manifest.countryCodes, origin.countryCode ? [origin.countryCode] : []), `geo place ${origin.id}: country codes mismatch`);
	record(entry.manifest.parentPlaceId === null && same(entry.manifest.centroid, { latitude: origin.latitude, longitude: origin.longitude }), `geo place ${origin.id}: hierarchy or centroid mismatch`);
	record(same(entry.manifest.localizedContent, { name: expectedNames, aliases: localizedWith(() => []) }), `geo place ${origin.id}: localized content mismatch`);
}

const protocolSources = [
	['vaccine', path.join(root, 'packages/types/src/domain/treatment/defaults/vaccine-protocols.json')],
	['antiparasitic', path.join(root, 'packages/types/src/domain/treatment/defaults/antiparasitic-protocols.json')]
];
const protocolIds = new Set();
for (const [kind, file] of protocolSources) for (const source of await json(file)) {
	protocolIds.add(source.id);
	const entry = entriesByIdentity.get(`treatment_protocol:${source.id}`);
	if (!entry) continue;
	record(entry.manifest.kind === kind && same(entry.manifest.species, source.species), `protocol ${source.id}: kind or species mismatch`);
	record(same(entry.manifest.productIds, source.catalogItemIds), `protocol ${source.id}: products mismatch`);
	for (const id of entry.manifest.productIds) record(entriesByIdentity.has(`product:${id}`), `protocol ${source.id}: unresolved product ${id}`);
	const expectedDoses = source.doses.map((dose, index) => ({ id: `dose-${index + 1}`, validityValue: dose.validityValue, validityUnit: dose.validityUnit, localizedContent: { label: localized(dose.dose) } }));
	record(same(entry.manifest.doses, expectedDoses), `protocol ${source.id}: doses mismatch`);
	const expectedLocalized = { name: localized(source.name) };
	if (source.observation) expectedLocalized.observation = localized(source.observation);
	record(same(entry.manifest.localizedContent, expectedLocalized), `protocol ${source.id}: localized content mismatch`);
}
record(same([...(byType.treatment_protocol ?? []).map(({ manifest }) => manifest.id)].sort(), [...protocolIds].sort()), 'protocol IDs differ from sources');

const projectionCounts = {
	product: 0,
	manufacturer: 0,
	activeIngredients: 0,
	targets: 0,
	vaccineProfiles: 0,
	lifeStages: 0,
	therapeuticScopes: 0,
	typesAndClassifications: 0
};
const projectionByProductLocale = new Map();

function localizedTermValues(taxonomy, keys, locale) {
	return keys.flatMap((key) => {
		const term = taxonomy?.terms.find((candidate) => candidate.key === key);
		return term ? [term.localizedContent.label[locale], ...(term.localizedContent.aliases?.[locale] ?? [])] : [];
	});
}

for (const { manifest } of byType.product ?? []) for (const locale of locales) {
	const manufacturer = entriesByIdentity.get(`manufacturer:${manifest.manufacturerId}`)?.manifest;
	const categories = {
		product: [manifest.localizedContent.name[locale], ...manifest.localizedContent.aliases[locale]],
		manufacturer: manufacturer ? [manufacturer.localizedContent.name[locale], ...manufacturer.localizedContent.aliases[locale]] : [],
		activeIngredients: manifest.activeIngredientIds.flatMap((id) => {
			const ingredient = entriesByIdentity.get(`active_ingredient:${id}`)?.manifest;
			if (!ingredient) return [];
			return [ingredient.localizedContent.name[locale], ...ingredient.localizedContent.aliases[locale], ...Object.entries(ingredient.localizedContent).filter(([key]) => key.startsWith('denomination_')).map(([, values]) => values[locale])];
		}),
		targets: localizedTermValues(taxonomies.get('product:target'), manifest.targetTermKeys ?? [], locale),
		vaccineProfiles: localizedTermValues(taxonomies.get('product:vaccine_profile'), manifest.vaccineProfileTermKeys ?? [], locale),
		lifeStages: localizedTermValues(taxonomies.get('product:life_stage'), manifest.lifeStageTermKeys ?? [], locale),
		therapeuticScopes: localizedTermValues(taxonomies.get('product:therapeutic_scope'), manifest.therapeuticScopeTermKeys ?? [], locale),
		typesAndClassifications: [
			...localizedTermValues(taxonomies.get('product:type'), [manifest.typeTermKey], locale),
			...localizedTermValues(taxonomies.get('product:classification'), manifest.classificationTermKeys, locale)
		]
	};
	for (const [category, values] of Object.entries(categories)) {
		categories[category] = unique(values.filter(Boolean));
		projectionCounts[category] += categories[category].length;
	}
	projectionByProductLocale.set(`${manifest.id}:${locale}`, categories);
}

for (const { value: source } of sources.product) {
	const analysis = productAnalyses.get(source.id);
	for (const locale of locales) {
		const projection = projectionByProductLocale.get(`${source.id}:${locale}`);
		for (const concept of analysis.concepts) {
			if (ingredientConcepts[concept]) {
				for (const ingredientKey of ingredientConcepts[concept]) {
					const id = ingredientDefinitions[ingredientKey][0];
					const name = entriesByIdentity.get(`active_ingredient:${id}`).manifest.localizedContent.name[locale];
					record(projection.activeIngredients.includes(name), `product ${source.id}: ${locale} projection misses ingredient ${ingredientKey}`);
				}
				continue;
			}
			if (derivedConcepts.has(concept)) continue;
			const category = directProductTypeConcepts.has(concept) ? 'typesAndClassifications' : targetConcepts[concept] ? 'targets' : vaccineProfileConcepts[concept] ? 'vaccineProfiles' : lifeStageConcepts[concept] ? 'lifeStages' : therapeuticScopeConcepts[concept] ? 'therapeuticScopes' : null;
			record(category !== null, `product ${source.id}: ${concept} has no projection category`);
			if (!category) continue;
			const expectedValues = translations[locale].catalogAlias.get(`catalogAlias.${concept}`) ?? [];
			const projected = new Set(projection[category].map((value) => value.toLocaleLowerCase(locale)));
			for (const value of expectedValues) record(projected.has(value.toLocaleLowerCase(locale)), `product ${source.id}: ${locale} projection misses ${concept} value ${value}`);
		}
		for (const alias of source.aliases) if (literalAliasConcepts.has(alias)) {
			const concept = literalAliasConcepts.get(alias);
			const category = targetConcepts[concept] ? 'targets' : vaccineProfileConcepts[concept] ? 'vaccineProfiles' : null;
			record(category !== null && projection[category].some((value) => value.toLocaleLowerCase(locale) === alias.toLocaleLowerCase(locale)), `product ${source.id}: ${locale} projection misses shared alias ${alias}`);
		}
	}
}

const counts = {
	localizedFields: localizedFieldCount,
	scalarLocaleValues: scalarLocaleValueCount,
	localizedListItems: localizedListItemCount,
	entityAliasValues: entityAliasValueCount,
	taxonomyLabelValues: taxonomyLabelValueCount,
	taxonomyAliasValues: taxonomyAliasValueCount,
	editorialDocuments: editorialDocumentCount,
	markdownFragments: markdownFiles.length
};
record(same(inventory.localization.counts, counts), 'inventory: localization counts differ from canonical source');
record(same(inventory.editorial, { entities: editorialEntityCount, documents: editorialDocumentCount, documentsPerLocale: Object.fromEntries(locales.map((locale) => [locale, editorialEntityCount])), sections: sectionCount }), 'inventory: editorial counts differ');
record(same(inventory.taxonomies, {
	terms: taxonomyTermCount,
	semanticTerms: {
		productTargets: semanticTaxonomyKeys['product-targets'].length,
		productVaccineProfiles: semanticTaxonomyKeys['product-vaccine-profiles'].length,
		productLifeStages: semanticTaxonomyKeys['product-life-stages'].length,
		productTherapeuticScopes: semanticTaxonomyKeys['product-therapeutic-scopes'].length
	},
	genericSearchTerms: 0
}), 'inventory: taxonomy counts differ');
record(same(inventory.relations, {
	productManufacturer: sources.product.filter(({ value }) => value.manufacturerId).length,
	productActiveIngredient: (byType.product ?? []).reduce((count, { manifest }) => count + manifest.activeIngredientIds.length, 0),
	productTarget: semanticReferenceCounts.target,
	productVaccineProfile: semanticReferenceCounts.vaccine_profile,
	productLifeStage: semanticReferenceCounts.life_stage,
	productTherapeuticScope: semanticReferenceCounts.therapeutic_scope,
	breedOriginPlace: sources.breed.length,
	protocolProduct: [...protocolIds].reduce((count, id) => count + entriesByIdentity.get(`treatment_protocol:${id}`).manifest.productIds.length, 0),
	taxonomyType: typeReferenceCount,
	taxonomyClassification: classificationReferenceCount,
	taxonomySize: sizeReferenceCount
}), 'inventory: relation counts differ');
record(same(inventory.searchProjectionValues, projectionCounts), 'inventory: searchable projection counts differ');
record(inventory.media.sourceAssets === 0 && inventory.media.canonicalAssets === mediaFiles.length, 'inventory: media counts differ');

const report = {
	schemaVersion: 1,
	status: failures.length === 0 ? 'PASS' : 'FAIL',
	entitiesByType: Object.fromEntries(Object.entries(byType).map(([type, values]) => [type, values.length]).sort()),
	entityCount: entities.length,
	localizedJson: {
		fields: localizedFieldCount,
		scalarLocaleValues: scalarLocaleValueCount,
		listItems: localizedListItemCount,
		entityAliasValues: entityAliasValueCount,
		taxonomyLabelValues: taxonomyLabelValueCount,
		taxonomyAliasValues: taxonomyAliasValueCount
	},
	taxonomy: {
		terms: taxonomyTermCount,
		typeReferences: typeReferenceCount,
		classificationReferences: classificationReferenceCount,
		sizeReferences: sizeReferenceCount,
		semanticReferences: semanticReferenceCounts,
		genericSearchTerms: 0
	},
	activeIngredients: {
		entities: (byType.active_ingredient ?? []).length,
		productRelations: (byType.product ?? []).reduce((count, { manifest }) => count + manifest.activeIngredientIds.length, 0)
	},
	editorial: { entities: editorialEntityCount, documents: editorialDocumentCount, sections: sectionCount },
	searchProjectionValues: projectionCounts,
	mediaFiles: mediaFiles.length,
	failures
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--write-report')) await writeFile(path.join(knowledgeRoot, 'audit-report.json'), `${JSON.stringify(report, null, '\t')}\n`);
if (failures.length > 0) process.exitCode = 1;
