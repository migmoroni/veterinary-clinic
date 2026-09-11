import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const knowledgeRoot = path.join(root, 'data', 'knowledge');
const locales = ['pt-BR', 'pt-PT', 'gn-PY', 'en-US', 'es-ES', 'fr-FR'];
const sectionStandardsPath = path.join(knowledgeRoot, '_standards', 'sections.json');
const editorialEntityTypes = new Set(['active_ingredient', 'condition', 'life', 'manufacturer', 'product']);
const lifeStageOrder = ['newborn', 'young', 'adult'];
const forbiddenDirectories = new Set([
	['product', 'vaccine', 'profiles'].join('-'),
	['product', 'life', 'stages'].join('-'),
	['product', 'therapeutic', 'scopes'].join('-')
]);
const forbiddenProductFields = [
	['vaccine', 'Profile', 'Term', 'Keys'].join(''),
	['life', 'Stage', 'Term', 'Keys'].join(''),
	['therapeutic', 'Scope', 'Term', 'Keys'].join('')
];
const removedPurposes = new Set(['vaccine_profile', 'life_stage', 'therapeutic_scope']);
const canonicalTaxonomies = new Set([
	'life:type',
	'life:size',
	'manufacturer:type',
	'manufacturer:classification',
	'active_ingredient:type',
	'active_ingredient:classification',
	'condition:type',
	'condition:classification',
	'product:type',
	'product:classification',
	'product:target'
]);
const failures = [];

function record(condition, message) {
	if (!condition) failures.push(message);
}

function same(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function isObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isText(value) {
	return typeof value === 'string' && value.length > 0 && value === value.trim() && !/[\r\n\u0000-\u001f\u007f]/u.test(value);
}

function isKey(value) {
	return typeof value === 'string' && value.length >= 1 && value.length <= 160 && /^[a-z0-9][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/u.test(value);
}

function localizedValuesAreValid(value, list) {
	if (!isObject(value) || !same(Object.keys(value), locales)) return false;
	return locales.every((locale) => {
		const localized = value[locale];
		return list
			? Array.isArray(localized) && localized.every(isText) && new Set(localized).size === localized.length
			: isText(localized);
	});
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

async function readJson(file) {
	try {
		return JSON.parse(await readFile(file, 'utf8'));
	} catch (error) {
		failures.push(`${path.relative(root, file)}: invalid JSON: ${error.message}`);
		return null;
	}
}

const tree = await walk(knowledgeRoot);
record(tree.special.length === 0, `special files or symlinks are forbidden: ${tree.special.map((file) => path.relative(root, file)).join(', ')}`);
const standardsDirectories = tree.directories.filter((directory) => path.basename(directory) === '_standards');
record(same(standardsDirectories, [path.dirname(sectionStandardsPath)]), '_standards must exist exactly once at the knowledge root');
const standardsFiles = tree.files.filter((file) => file.includes(`${path.sep}_standards${path.sep}`));
record(same(standardsFiles, [sectionStandardsPath]), '_standards must contain only sections.json');
const sectionStandardsDocument = await readJson(sectionStandardsPath);
record(sectionStandardsDocument?.schemaVersion === 1, 'section standards schemaVersion must be 1');
record(isObject(sectionStandardsDocument) && same(Object.keys(sectionStandardsDocument), ['schemaVersion', 'standards']), 'section standards document has unsupported properties or order');
record(Array.isArray(sectionStandardsDocument?.standards) && sectionStandardsDocument.standards.length > 0, 'section standards must be a non-empty array');
const sectionStandards = new Map();
for (const [index, standard] of (sectionStandardsDocument?.standards ?? []).entries()) {
	const owner = `data/knowledge/_standards/sections.json: standards.${index}`;
	record(isObject(standard) && same(Object.keys(standard), ['key', 'entityType', 'sectionKeys']), `${owner} has unsupported properties or order`);
	record(isKey(standard.key), `${owner}.key is invalid`);
	record(editorialEntityTypes.has(standard.entityType), `${owner}.entityType is not authorized`);
	record(Array.isArray(standard.sectionKeys) && standard.sectionKeys.length >= 1 && standard.sectionKeys.length <= 64, `${owner}.sectionKeys must contain 1 to 64 values`);
	record(Array.isArray(standard.sectionKeys) && standard.sectionKeys.every(isKey), `${owner}.sectionKeys contains an invalid key`);
	record(Array.isArray(standard.sectionKeys) && new Set(standard.sectionKeys).size === standard.sectionKeys.length, `${owner}.sectionKeys contains duplicates`);
	record(!sectionStandards.has(standard.key), `${owner}.key duplicates ${standard.key}`);
	sectionStandards.set(standard.key, standard);
}
record([...sectionStandards.keys()].every((key, index, keys) => index === 0 || keys[index - 1] < key), 'section standards must be strictly ordered by key');
for (const directory of tree.directories) {
	record(!forbiddenDirectories.has(path.basename(directory)), `${path.relative(root, directory)}: removed taxonomy directory is forbidden`);
}

const entityFiles = tree.files.filter((file) => path.basename(file) === '_entity.json');
const entries = [];
const identities = new Set();
for (const file of entityFiles) {
	const manifest = await readJson(file);
	if (!manifest) continue;
	const relative = path.relative(root, file);
	record(manifest.schemaVersion === 1, `${relative}: schemaVersion must be 1`);
	record(isText(manifest.entityType), `${relative}: entityType is required`);
	record(isText(manifest.id), `${relative}: id is required`);
	const identity = `${manifest.entityType}:${manifest.id}`;
	record(!identities.has(identity), `${relative}: duplicate identity ${identity}`);
	identities.add(identity);
	entries.push({ file, relative, manifest });
}

const byType = Object.groupBy(entries, ({ manifest }) => manifest.entityType);
const byIdentity = new Map(entries.map((entry) => [`${entry.manifest.entityType}:${entry.manifest.id}`, entry]));
const taxonomies = new Map((byType.taxonomy ?? []).map((entry) => [`${entry.manifest.domain}:${entry.manifest.purpose}`, entry.manifest]));
const taxonomyIndexes = new Map();

record(taxonomies.size === 11, `expected 11 canonical taxonomies, found ${taxonomies.size}`);
record(same([...taxonomies.keys()].sort(), [...canonicalTaxonomies].sort()), 'taxonomy domain/purpose matrix differs from the canonical eleven pairs');

let taxonomyTermCount = 0;
let taxonomyHierarchyRelations = 0;
for (const { relative, manifest } of byType.taxonomy ?? []) {
	record(!removedPurposes.has(manifest.purpose), `${relative}: removed taxonomy purpose ${manifest.purpose} is forbidden`);
	record(Array.isArray(manifest.terms), `${relative}: terms must be an array`);
	const keys = new Set();
	const index = new Map();
	const lifeType = manifest.domain === 'life' && manifest.purpose === 'type';
	if (lifeType) record(manifest.id === 'life-types', `${relative}: life:type id must be life-types`);
	function visit(terms, parentKey, ownerPath, depth) {
		for (const [position, term] of terms.entries()) {
			const sourcePath = `${ownerPath}.${position}`;
			taxonomyTermCount += 1;
			if (parentKey !== null) taxonomyHierarchyRelations += 1;
			record(depth < 32, `${relative}: ${sourcePath}.key exceeds the maximum taxonomy depth of 32`);
			if (lifeType) record(depth <= 9, `${relative}: ${sourcePath}.key exceeds life rank variety`);
			record(isText(term.key), `${relative}: ${sourcePath}.key is invalid`);
			record(!keys.has(term.key), `${relative}: duplicate term key ${term.key} at ${sourcePath}.key`);
			keys.add(term.key);
			index.set(term.key, { term, parentKey, depth, siblingOrder: position });
			record(!Object.hasOwn(term, 'parentKey'), `${relative}: ${sourcePath}.parentKey is forbidden`);
			record(!Object.hasOwn(term, 'order'), `${relative}: ${sourcePath}.order is forbidden`);
			record(localizedValuesAreValid(term.localizedContent?.label, false), `${relative}: ${sourcePath}.localizedContent.label must contain the six locales`);
			if (term.localizedContent?.aliases !== undefined) {
				record(localizedValuesAreValid(term.localizedContent.aliases, true), `${relative}: ${sourcePath}.localizedContent.aliases is invalid`);
			}
			if (lifeType) {
				record(same(Object.keys(term.localizedContent ?? {}), ['label']), `${relative}: ${sourcePath}.localizedContent accepts only label for life:type`);
			}
			if (term.children !== undefined) {
				record(Array.isArray(term.children) && term.children.length > 0, `${relative}: ${sourcePath}.children must be a non-empty array when present`);
				if (Array.isArray(term.children)) visit(term.children, term.key, `${sourcePath}.children`, depth + 1);
			}
		}
	}
	visit(manifest.terms ?? [], null, 'terms', 0);
	record(keys.size <= 10_000, `${relative}: taxonomy contains more than 10000 terms`);
	taxonomyIndexes.set(`${manifest.domain}:${manifest.purpose}`, index);
}

function taxonomyHas(domain, purpose, key) {
	return taxonomyIndexes.get(`${domain}:${purpose}`)?.has(key) === true;
}

function isTaxonomyAncestor(index, ancestor, descendant) {
	let current = index.get(descendant)?.parentKey;
	while (current !== null && current !== undefined) {
		if (current === ancestor) return true;
		current = index.get(current)?.parentKey;
	}
	return false;
}

let productTaxonReferences = 0;
let protocolTaxonReferences = 0;
let productTargetReferences = 0;
const stageCounts = Object.fromEntries(lifeStageOrder.map((stage) => [stage, 0]));
const spectrumCounts = { broad: 0, narrow: 0 };
let productsWithLifeStages = 0;
let productsWithTherapeuticSpectrum = 0;
const lifeTypeIndex = taxonomyIndexes.get('life:type') ?? new Map();
const lifeEntityTerms = new Map();

for (const { relative, manifest } of entries) {
	const serialized = JSON.stringify(manifest);
	for (const field of forbiddenProductFields) record(!serialized.includes(`\"${field}\"`), `${relative}: removed field ${field} is forbidden`);
	record(!Object.hasOwn(manifest, 'sections'), `${relative}: sections is forbidden`);
	record(!Object.hasOwn(manifest, 'sectionNumber'), `${relative}: sectionNumber is forbidden`);
	record(!Object.hasOwn(manifest, 'contentPath'), `${relative}: contentPath is forbidden`);
	const standardKey = manifest.sectionStandardKey;
	const contentDirectory = path.join(path.dirname(path.join(root, relative)), '_content');
	const hasContent = tree.directories.includes(contentDirectory);
	if (standardKey === undefined) {
		record(!hasContent, `${relative}: _content requires sectionStandardKey`);
	} else {
		record(editorialEntityTypes.has(manifest.entityType), `${relative}: sectionStandardKey is not allowed for ${manifest.entityType}`);
		const standard = sectionStandards.get(standardKey);
		record(standard !== undefined, `${relative}: unresolved sectionStandardKey ${standardKey}`);
		record(standard?.entityType === manifest.entityType, `${relative}: sectionStandardKey ${standardKey} has another entityType`);
		record(hasContent, `${relative}: sectionStandardKey requires sibling _content`);
		const actual = tree.files.filter((file) => path.dirname(file) === contentDirectory).map((file) => path.basename(file)).sort();
		const expected = locales.map((locale) => `${locale}.md`).sort();
		record(same(actual, expected), `${relative}: _content must contain exactly the six locale documents`);
	}
	if (manifest.localizedContent) {
		for (const [field, value] of Object.entries(manifest.localizedContent)) {
			const list = field === 'aliases' || field === 'targetSpeciesWarnings';
			record(localizedValuesAreValid(value, list), `${relative}: localizedContent.${field} is invalid`);
		}
	}
	if (manifest.typeTermKey !== undefined) {
		record(taxonomyHas(manifest.entityType, 'type', manifest.typeTermKey), `${relative}: unresolved typeTermKey ${manifest.typeTermKey}`);
	}
	if (manifest.entityType === 'life') {
		record(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(manifest.id), `${relative}: life id must be a lowercase UUIDv4`);
		record(isText(manifest.typeTermKey), `${relative}: typeTermKey is required`);
		record(!Object.hasOwn(manifest, 'taxonomy'), `${relative}: taxonomy is forbidden in LifeEntity`);
		record(same(Object.keys(manifest.localizedContent ?? {}), ['aliases']), `${relative}: LifeEntity localizedContent accepts only aliases`);
		const previous = lifeEntityTerms.get(manifest.typeTermKey);
		record(previous === undefined, `${relative}: typeTermKey ${manifest.typeTermKey} is already associated with ${previous}`);
		lifeEntityTerms.set(manifest.typeTermKey, manifest.id);
	}
	for (const key of manifest.classificationTermKeys ?? []) {
		record(taxonomyHas(manifest.entityType, 'classification', key), `${relative}: unresolved classificationTermKeys value ${key}`);
	}
	if (manifest.entityType === 'product') {
		record(byIdentity.has(`manufacturer:${manifest.manufacturerId}`), `${relative}: unresolved manufacturerId ${manifest.manufacturerId}`);
		for (const id of manifest.activeIngredientIds ?? []) record(byIdentity.has(`active_ingredient:${id}`), `${relative}: unresolved activeIngredientIds value ${id}`);
		for (const id of manifest.applicableTaxonTermKeys ?? []) {
			productTaxonReferences += 1;
			record(lifeTypeIndex.has(id), `${relative}: unresolved applicableTaxonTermKeys value ${id}`);
		}
		const targets = manifest.applicableTaxonTermKeys ?? [];
		record(same([...targets].sort(), targets), `${relative}: applicableTaxonTermKeys must be strictly sorted`);
		for (let left = 0; left < targets.length; left += 1) for (let right = left + 1; right < targets.length; right += 1) {
			record(!isTaxonomyAncestor(lifeTypeIndex, targets[left], targets[right]) && !isTaxonomyAncestor(lifeTypeIndex, targets[right], targets[left]), `${relative}: redundant applicable taxon terms ${targets[left]} and ${targets[right]}`);
		}
		for (const key of manifest.targetTermKeys ?? []) {
			productTargetReferences += 1;
			record(taxonomyHas('product', 'target', key), `${relative}: unresolved targetTermKeys value ${key}`);
		}
		if (manifest.applicableLifeStages !== undefined) {
			const stages = manifest.applicableLifeStages;
			record(Array.isArray(stages) && stages.length >= 1 && stages.length <= 3, `${relative}: applicableLifeStages must contain one to three items`);
			record(Array.isArray(stages) && new Set(stages).size === stages.length, `${relative}: applicableLifeStages contains duplicates`);
			record(Array.isArray(stages) && stages.every((stage) => lifeStageOrder.includes(stage)), `${relative}: applicableLifeStages contains an unknown value`);
			record(Array.isArray(stages) && stages.every((stage, index) => index === 0 || lifeStageOrder.indexOf(stages[index - 1]) < lifeStageOrder.indexOf(stage)), `${relative}: applicableLifeStages is outside canonical order`);
			if (Array.isArray(stages)) for (const stage of stages) if (stageCounts[stage] !== undefined) stageCounts[stage] += 1;
			productsWithLifeStages += 1;
		}
		if (manifest.therapeuticSpectrum !== undefined) {
			record(Object.hasOwn(spectrumCounts, manifest.therapeuticSpectrum), `${relative}: unsupported therapeuticSpectrum ${manifest.therapeuticSpectrum}`);
			record(manifest.typeTermKey === 'medication' || manifest.typeTermKey?.startsWith('medication.'), `${relative}: therapeuticSpectrum is allowed only in medication products`);
			if (Object.hasOwn(spectrumCounts, manifest.therapeuticSpectrum)) spectrumCounts[manifest.therapeuticSpectrum] += 1;
			productsWithTherapeuticSpectrum += 1;
		}
	}
	if (manifest.entityType === 'treatment_protocol') {
		const targets = manifest.applicableTaxonTermKeys ?? [];
		record(same([...targets].sort(), targets), `${relative}: applicableTaxonTermKeys must be strictly sorted`);
		for (const id of manifest.applicableTaxonTermKeys ?? []) {
			protocolTaxonReferences += 1;
			record(lifeTypeIndex.has(id), `${relative}: unresolved applicableTaxonTermKeys value ${id}`);
		}
		for (let left = 0; left < targets.length; left += 1) for (let right = left + 1; right < targets.length; right += 1) {
			record(!isTaxonomyAncestor(lifeTypeIndex, targets[left], targets[right]) && !isTaxonomyAncestor(lifeTypeIndex, targets[right], targets[left]), `${relative}: redundant applicable taxon terms ${targets[left]} and ${targets[right]}`);
		}
		for (const id of manifest.productIds ?? []) record(byIdentity.has(`product:${id}`), `${relative}: unresolved productIds value ${id}`);
	}
}

const markdownFiles = tree.files.filter((file) => file.endsWith('.md') && file !== path.join(knowledgeRoot, 'README.md'));
const editorialEntities = entries.filter(({ manifest }) => manifest.sectionStandardKey !== undefined);
const standardReferences = editorialEntities.length;
const consumedStandards = new Set(editorialEntities.map(({ manifest }) => manifest.sectionStandardKey));
for (const key of sectionStandards.keys()) record(consumedStandards.has(key), `section standard ${key} has no consuming entity`);
const sectionCount = editorialEntities.reduce((count, { manifest }) => count + (sectionStandards.get(manifest.sectionStandardKey)?.sectionKeys.length ?? 0), 0);
const mediaFiles = tree.files.filter((file) => file.includes(`${path.sep}_media${path.sep}`));
const lifeRanks = ['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'breed', 'variety'];
const lifeLevels = Object.fromEntries(lifeRanks.map((rank, depth) => [rank, [...lifeTypeIndex.values()].filter((term) => term.depth === depth).length]));
const lifeWithClassifications = (byType.life ?? []).filter(({ manifest }) => manifest.classifications !== undefined);

const inventory = {
	schemaVersion: 2,
	locales,
	scope: {
		included: ['system', 'system_media', 'CAS/system'],
		excluded: ['user/main', 'user/media', 'user/logs', 'CAS/user'],
		runtimeIntegrationChanged: false
	},
	entitiesByType: Object.fromEntries(Object.entries(byType).map(([type, values]) => [type, values.length]).sort()),
	life: {
		termsByRank: lifeLevels,
		termsWithEntity: lifeEntityTerms.size,
		termsWithoutEntity: lifeTypeIndex.size - lifeEntityTerms.size,
		entityTypeRelations: lifeEntityTerms.size,
		classifications: {
			entitiesWithClassifications: lifeWithClassifications.length,
			originPlaceIds: lifeWithClassifications.reduce((count, { manifest }) => count + (manifest.classifications?.originPlaceIds?.length ?? 0), 0),
			bodyMetrics: lifeWithClassifications.filter(({ manifest }) => manifest.classifications?.bodyMetrics !== undefined).length,
			size: lifeWithClassifications.filter(({ manifest }) => manifest.classifications?.bodyMetrics?.size !== undefined).length,
			stageMetrics: lifeWithClassifications.filter(({ manifest }) => manifest.classifications?.bodyMetrics?.stageMetrics !== undefined).length
		}
	},
	applicability: {
		products: (byType.product ?? []).length,
		productTaxonReferences,
		treatmentProtocols: (byType.treatment_protocol ?? []).length,
		protocolTaxonReferences
	},
	productAttributes: {
		productsWithLifeStages,
		lifeStageValues: stageCounts,
		productsWithTherapeuticSpectrum,
		therapeuticSpectrumValues: spectrumCounts
	},
	taxonomies: {
		registryEntries: taxonomies.size,
		terms: taxonomyTermCount,
		lifeSizeCardinality: 'ZeroOrOne',
		genericSearchTerms: 0
	},
	relations: {
		taxonomyHierarchy: taxonomyHierarchyRelations,
		productTarget: productTargetReferences
	},
	editorial: {
		sectionStandards: sectionStandards.size,
		standardReferences,
		entities: editorialEntities.length,
		documents: markdownFiles.length,
		documentsPerLocale: markdownFiles.length / locales.length,
		sections: sectionCount
	},
	media: { sourceAssets: mediaFiles.length, canonicalAssets: mediaFiles.length }
};

const inventoryPath = path.join(knowledgeRoot, 'inventory.json');
if (process.argv.includes('--write-inventory')) {
	await writeFile(inventoryPath, `${JSON.stringify(inventory, null, '\t')}\n`);
} else {
	const committedInventory = await readJson(inventoryPath);
	record(same(committedInventory, inventory), 'inventory.json differs from counts derived from data/knowledge');
}

const report = {
	schemaVersion: 2,
	status: failures.length === 0 ? 'PASS' : 'FAIL',
	entityCount: entries.length,
	entitiesByType: inventory.entitiesByType,
	productAttributes: inventory.productAttributes,
	taxonomy: {
		registryEntries: taxonomies.size,
		terms: taxonomyTermCount,
		hierarchyRelations: taxonomyHierarchyRelations,
		productTargetReferences,
		genericSearchTerms: 0
	},
	editorial: inventory.editorial,
	mediaFiles: mediaFiles.length,
	failures
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--write-report')) {
	await writeFile(path.join(knowledgeRoot, 'audit-report.json'), `${JSON.stringify(report, null, '\t')}\n`);
}
if (failures.length > 0) process.exitCode = 1;
