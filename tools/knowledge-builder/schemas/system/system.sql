-- Canonical schema for the localized public knowledge database produced by the builder.

CREATE TABLE knowledge_build_metadata (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    build_version INTEGER NOT NULL CHECK(build_version > 0),
    builder_version TEXT NOT NULL CHECK(length(trim(builder_version)) > 0),
    build_result_schema_version INTEGER NOT NULL CHECK(build_result_schema_version > 0),
    source_digest_sha256 BLOB NOT NULL CHECK(length(source_digest_sha256) = 32),
    locale TEXT NOT NULL CHECK(locale IN ('pt-BR','pt-PT','gn-PY','en-US','es-ES','fr-FR'))
);

CREATE TABLE knowledge_release_metadata (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    release_id TEXT NOT NULL CHECK(length(trim(release_id)) > 0),
    generation INTEGER NOT NULL CHECK(generation > 0),
    revision INTEGER NOT NULL CHECK(revision > 0),
    locale TEXT NOT NULL CHECK(locale IN ('pt-BR','pt-PT','gn-PY','en-US','es-ES','fr-FR'))
);

CREATE TABLE taxonomy_registry (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    domain TEXT NOT NULL CHECK(length(trim(domain)) > 0),
    purpose TEXT NOT NULL CHECK(length(trim(purpose)) > 0),
    UNIQUE(domain, purpose)
);

CREATE TABLE taxonomy_terms (
    taxonomy_id TEXT NOT NULL,
    term_key TEXT NOT NULL CHECK(length(trim(term_key)) > 0),
    parent_term_key TEXT,
    label TEXT NOT NULL CHECK(length(trim(label)) > 0),
    normalized_label TEXT NOT NULL CHECK(length(trim(normalized_label)) > 0),
    aliases_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(taxonomy_id, term_key),
    UNIQUE(taxonomy_id, sort_order),
    FOREIGN KEY(taxonomy_id) REFERENCES taxonomy_registry(id) ON DELETE CASCADE,
    FOREIGN KEY(taxonomy_id, parent_term_key) REFERENCES taxonomy_terms(taxonomy_id, term_key)
);

CREATE TABLE geo_places (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    place_type TEXT NOT NULL CHECK(length(trim(place_type)) > 0),
    parent_place_id TEXT,
    country_codes_json TEXT NOT NULL CHECK(json_valid(country_codes_json) AND json_type(country_codes_json) = 'array'),
    latitude REAL CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude REAL CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    FOREIGN KEY(parent_place_id) REFERENCES geo_places(id) ON DELETE RESTRICT,
    CHECK((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

CREATE TABLE life_reference_items (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    domain_id TEXT NOT NULL CHECK(length(trim(domain_id)) > 0),
    kingdom_id TEXT CHECK(kingdom_id IS NULL OR length(trim(kingdom_id)) > 0),
    phylum_id TEXT CHECK(phylum_id IS NULL OR length(trim(phylum_id)) > 0),
    class_id TEXT CHECK(class_id IS NULL OR length(trim(class_id)) > 0),
    order_id TEXT CHECK(order_id IS NULL OR length(trim(order_id)) > 0),
    family_id TEXT CHECK(family_id IS NULL OR length(trim(family_id)) > 0),
    genus_id TEXT CHECK(genus_id IS NULL OR length(trim(genus_id)) > 0),
    species_id TEXT CHECK(species_id IS NULL OR length(trim(species_id)) > 0),
    breed_id TEXT CHECK(breed_id IS NULL OR length(trim(breed_id)) > 0),
    variety_id TEXT CHECK(variety_id IS NULL OR length(trim(variety_id)) > 0),
    size_term_key TEXT CHECK(size_term_key IS NULL OR length(trim(size_term_key)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    stage_metrics_json TEXT CHECK(stage_metrics_json IS NULL OR (json_valid(stage_metrics_json) AND json_type(stage_metrics_json) = 'object')),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    FOREIGN KEY(domain_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(kingdom_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(phylum_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(class_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(order_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(family_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(genus_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(species_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(breed_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(variety_id) REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    CHECK(kingdom_id IS NOT NULL OR phylum_id IS NULL),
    CHECK(phylum_id IS NOT NULL OR class_id IS NULL),
    CHECK(class_id IS NOT NULL OR order_id IS NULL),
    CHECK(order_id IS NOT NULL OR family_id IS NULL),
    CHECK(family_id IS NOT NULL OR genus_id IS NULL),
    CHECK(genus_id IS NOT NULL OR species_id IS NULL),
    CHECK(species_id IS NOT NULL OR breed_id IS NULL),
    CHECK(breed_id IS NOT NULL OR variety_id IS NULL),
    CHECK(CASE
        WHEN kingdom_id IS NULL THEN id = domain_id
        WHEN phylum_id IS NULL THEN id = kingdom_id
        WHEN class_id IS NULL THEN id = phylum_id
        WHEN order_id IS NULL THEN id = class_id
        WHEN family_id IS NULL THEN id = order_id
        WHEN genus_id IS NULL THEN id = family_id
        WHEN species_id IS NULL THEN id = genus_id
        WHEN breed_id IS NULL THEN id = species_id
        WHEN variety_id IS NULL THEN id = breed_id
        ELSE id = variety_id
    END)
);

CREATE TABLE life_origin_places (
    life_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(life_id, place_id),
    UNIQUE(life_id, sort_order),
    FOREIGN KEY(life_id) REFERENCES life_reference_items(id) ON DELETE CASCADE,
    FOREIGN KEY(place_id) REFERENCES geo_places(id) ON DELETE RESTRICT
);

CREATE TABLE manufacturer_catalog_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    regions_json TEXT NOT NULL CHECK(json_valid(regions_json) AND json_type(regions_json) = 'array'),
    website TEXT,
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    UNIQUE(normalized_name)
);

CREATE TABLE active_ingredient_catalog_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    regions_json TEXT NOT NULL CHECK(json_valid(regions_json) AND json_type(regions_json) = 'array'),
    nomenclature_json TEXT NOT NULL CHECK(json_valid(nomenclature_json)),
    atc_vet_code TEXT,
    atc_vet_system TEXT,
    denominations_json TEXT NOT NULL CHECK(json_valid(denominations_json)),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    UNIQUE(normalized_name)
);

CREATE TABLE condition_catalog_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    regions_json TEXT NOT NULL CHECK(json_valid(regions_json) AND json_type(regions_json) = 'array'),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    UNIQUE(normalized_name)
);

CREATE TABLE product_catalog_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    applicable_taxon_ids_json TEXT NOT NULL CHECK(json_valid(applicable_taxon_ids_json) AND json_type(applicable_taxon_ids_json) = 'array' AND json_array_length(applicable_taxon_ids_json) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    manufacturer_id TEXT NOT NULL,
    regions_json TEXT NOT NULL CHECK(json_valid(regions_json) AND json_type(regions_json) = 'array'),
    regulatory_identifiers_json TEXT NOT NULL CHECK(json_valid(regulatory_identifiers_json)),
    commercial_line TEXT,
    presentation_dosage TEXT,
    target_species_warnings_json TEXT NOT NULL CHECK(json_valid(target_species_warnings_json) AND json_type(target_species_warnings_json) = 'array'),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    UNIQUE(normalized_name),
    FOREIGN KEY(manufacturer_id) REFERENCES manufacturer_catalog_items(id) ON DELETE RESTRICT
);

CREATE TABLE entity_taxonomy_terms (
    entity_type TEXT NOT NULL CHECK(entity_type IN ('manufacturer','active_ingredient','condition','product')),
    entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
    taxonomy_id TEXT NOT NULL,
    term_key TEXT NOT NULL CHECK(length(trim(term_key)) > 0),
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, taxonomy_id, term_key),
    UNIQUE(entity_type, entity_id, taxonomy_id, sort_order),
    FOREIGN KEY(taxonomy_id, term_key) REFERENCES taxonomy_terms(taxonomy_id, term_key) ON DELETE RESTRICT
);

CREATE TABLE product_active_ingredients (
    product_id TEXT NOT NULL,
    active_ingredient_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(product_id, active_ingredient_id),
    UNIQUE(product_id, sort_order),
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
    FOREIGN KEY(active_ingredient_id) REFERENCES active_ingredient_catalog_items(id) ON DELETE RESTRICT
);

CREATE TABLE treatment_protocols (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('vaccine','antiparasitic')),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0), normalized_name TEXT NOT NULL,
    applicable_taxon_ids_json TEXT NOT NULL CHECK(json_valid(applicable_taxon_ids_json) AND json_type(applicable_taxon_ids_json) = 'array' AND json_array_length(applicable_taxon_ids_json) > 0), observation TEXT
);

CREATE TABLE treatment_protocol_items (
    protocol_id TEXT NOT NULL, product_id TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(protocol_id, product_id), UNIQUE(protocol_id, sort_order),
    FOREIGN KEY(protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(id) ON DELETE RESTRICT
);

CREATE TABLE treatment_protocol_doses (
    protocol_id TEXT NOT NULL, dose_id TEXT NOT NULL, label TEXT NOT NULL,
    validity_value INTEGER NOT NULL CHECK(validity_value > 0), validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days','months','years')),
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0), PRIMARY KEY(protocol_id, dose_id), UNIQUE(protocol_id, sort_order),
    FOREIGN KEY(protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE
);

CREATE TABLE entity_search_terms (
    entity_type TEXT NOT NULL CHECK(entity_type IN ('life','product','manufacturer','active_ingredient','condition','geo_place','treatment_protocol')), entity_id TEXT NOT NULL, value TEXT NOT NULL,
    normalized_value TEXT NOT NULL, provenance TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, provenance, normalized_value),
    UNIQUE(entity_type, entity_id, sort_order)
);

CREATE TABLE entity_media_references (
    entity_type TEXT NOT NULL CHECK(entity_type IN ('life','product','manufacturer','active_ingredient','condition')),
    entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
    role TEXT NOT NULL CHECK(role IN ('cover', 'gallery')),
    media_key TEXT NOT NULL CHECK(length(trim(media_key)) > 0),
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, role, sort_order),
    UNIQUE(entity_type, entity_id, role, media_key)
);

CREATE INDEX idx_taxonomy_terms_label ON taxonomy_terms(taxonomy_id, normalized_label);
CREATE INDEX idx_geo_places_parent ON geo_places(parent_place_id);
CREATE INDEX idx_life_taxonomy ON life_reference_items(domain_id, kingdom_id, phylum_id, class_id, order_id, family_id, genus_id, species_id, breed_id, variety_id, normalized_name, id);
CREATE INDEX idx_life_kingdom_items ON life_reference_items(kingdom_id, phylum_id, class_id, normalized_name, id);
CREATE INDEX idx_life_phylum_items ON life_reference_items(phylum_id, class_id, order_id, normalized_name, id);
CREATE INDEX idx_life_class_items ON life_reference_items(class_id, order_id, family_id, normalized_name, id);
CREATE INDEX idx_life_order_items ON life_reference_items(order_id, family_id, genus_id, normalized_name, id);
CREATE INDEX idx_life_family_items ON life_reference_items(family_id, genus_id, species_id, normalized_name, id);
CREATE INDEX idx_life_genus_items ON life_reference_items(genus_id, species_id, breed_id, normalized_name, id);
CREATE INDEX idx_life_species_items ON life_reference_items(species_id, breed_id, variety_id, normalized_name, id);
CREATE INDEX idx_life_breed_items ON life_reference_items(breed_id, variety_id, normalized_name, id);
CREATE INDEX idx_life_size ON life_reference_items(size_term_key, id);
CREATE INDEX idx_life_origin_place ON life_origin_places(place_id, life_id);
CREATE INDEX idx_product_manufacturer ON product_catalog_items(manufacturer_id);
CREATE INDEX idx_product_active_ingredient ON product_active_ingredients(active_ingredient_id, product_id);
CREATE INDEX idx_entity_taxonomy_filter ON entity_taxonomy_terms(taxonomy_id, term_key, entity_type, entity_id);
CREATE INDEX idx_entity_taxonomy_entity ON entity_taxonomy_terms(entity_type, entity_id, taxonomy_id, sort_order);
CREATE INDEX idx_search_normalized ON entity_search_terms(normalized_value, entity_type, entity_id);
CREATE INDEX idx_entity_media_key ON entity_media_references(media_key, entity_type, entity_id);
