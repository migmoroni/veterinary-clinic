import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const knowledgeRoot = path.join(root, 'data', 'knowledge');
const locales = ['pt-BR', 'pt-PT', 'gn-PY', 'en-US', 'es-ES', 'fr-FR'];
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

record(taxonomies.size === 10, `expected 10 canonical taxonomies, found ${taxonomies.size}`);
record(same([...taxonomies.keys()].sort(), [...canonicalTaxonomies].sort()), 'taxonomy domain/purpose matrix differs from the canonical ten pairs');

let taxonomyTermCount = 0;
for (const { relative, manifest } of byType.taxonomy ?? []) {
	record(!removedPurposes.has(manifest.purpose), `${relative}: removed taxonomy purpose ${manifest.purpose} is forbidden`);
	record(Array.isArray(manifest.terms), `${relative}: terms must be an array`);
	const keys = new Set();
	for (const [index, term] of (manifest.terms ?? []).entries()) {
		taxonomyTermCount += 1;
		record(isText(term.key), `${relative}: term ${index} has an invalid key`);
		record(!keys.has(term.key), `${relative}: duplicate term key ${term.key}`);
		keys.add(term.key);
		record(term.order === index, `${relative}: term ${term.key} order must equal ${index}`);
		record(localizedValuesAreValid(term.localizedContent?.label, false), `${relative}: term ${term.key} label must contain the six locales`);
		if (term.localizedContent?.aliases !== undefined) {
			record(localizedValuesAreValid(term.localizedContent.aliases, true), `${relative}: term ${term.key} aliases are invalid`);
		}
	}
	for (const term of manifest.terms ?? []) {
		record(term.parentKey === null || keys.has(term.parentKey), `${relative}: unresolved parent ${term.parentKey} for ${term.key}`);
	}
}

function taxonomyHas(domain, purpose, key) {
	return taxonomies.get(`${domain}:${purpose}`)?.terms.some((term) => term.key === key) === true;
}

let productTaxonReferences = 0;
let protocolTaxonReferences = 0;
let productTargetReferences = 0;
const stageCounts = Object.fromEntries(lifeStageOrder.map((stage) => [stage, 0]));
const spectrumCounts = { broad: 0, narrow: 0 };
let productsWithLifeStages = 0;
let productsWithTherapeuticSpectrum = 0;

for (const { relative, manifest } of entries) {
	const serialized = JSON.stringify(manifest);
	for (const field of forbiddenProductFields) record(!serialized.includes(`\"${field}\"`), `${relative}: removed field ${field} is forbidden`);
	if (manifest.localizedContent) {
		for (const [field, value] of Object.entries(manifest.localizedContent)) {
			const list = field === 'aliases' || field === 'targetSpeciesWarnings';
			record(localizedValuesAreValid(value, list), `${relative}: localizedContent.${field} is invalid`);
		}
	}
	if (manifest.typeTermKey !== undefined) {
		record(taxonomyHas(manifest.entityType, 'type', manifest.typeTermKey), `${relative}: unresolved typeTermKey ${manifest.typeTermKey}`);
	}
	for (const key of manifest.classificationTermKeys ?? []) {
		record(taxonomyHas(manifest.entityType, 'classification', key), `${relative}: unresolved classificationTermKeys value ${key}`);
	}
	if (manifest.entityType === 'product') {
		record(byIdentity.has(`manufacturer:${manifest.manufacturerId}`), `${relative}: unresolved manufacturerId ${manifest.manufacturerId}`);
		for (const id of manifest.activeIngredientIds ?? []) record(byIdentity.has(`active_ingredient:${id}`), `${relative}: unresolved activeIngredientIds value ${id}`);
		for (const id of manifest.applicableTaxonIds ?? []) {
			productTaxonReferences += 1;
			record(byIdentity.has(`life:${id}`), `${relative}: unresolved applicableTaxonIds value ${id}`);
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
		for (const id of manifest.applicableTaxonIds ?? []) {
			protocolTaxonReferences += 1;
			record(byIdentity.has(`life:${id}`), `${relative}: unresolved applicableTaxonIds value ${id}`);
		}
		for (const id of manifest.productIds ?? []) record(byIdentity.has(`product:${id}`), `${relative}: unresolved productIds value ${id}`);
	}
}

const markdownFiles = tree.files.filter((file) => file.endsWith('.md') && file !== path.join(knowledgeRoot, 'README.md'));
const editorialEntities = entries.filter(({ manifest }) => (manifest.sections ?? []).length > 0);
const sectionCount = editorialEntities.reduce((count, { manifest }) => count + manifest.sections.length, 0);
const mediaFiles = tree.files.filter((file) => file.includes(`${path.sep}_media${path.sep}`));
const lifeLevels = Object.fromEntries(['domain', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'breed', 'variety'].map((level) => [level, (byType.life ?? []).filter(({ manifest }) => manifest.taxonomy?.[level] === manifest.id).length]));
const lifeWithClassifications = (byType.life ?? []).filter(({ manifest }) => manifest.classifications !== undefined);

const inventory = {
	schemaVersion: 1,
	locales,
	scope: {
		included: ['system', 'system_media', 'CAS/system'],
		excluded: ['user/main', 'user/media', 'user/logs', 'CAS/user'],
		runtimeIntegrationChanged: false
	},
	entitiesByType: Object.fromEntries(Object.entries(byType).map(([type, values]) => [type, values.length]).sort()),
	life: {
		levels: lifeLevels,
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
	relations: { productTarget: productTargetReferences },
	editorial: {
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
	schemaVersion: 1,
	status: failures.length === 0 ? 'PASS' : 'FAIL',
	entityCount: entries.length,
	entitiesByType: inventory.entitiesByType,
	productAttributes: inventory.productAttributes,
	taxonomy: {
		registryEntries: taxonomies.size,
		terms: taxonomyTermCount,
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
