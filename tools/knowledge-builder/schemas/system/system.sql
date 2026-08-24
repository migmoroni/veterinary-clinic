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

CREATE TABLE product_target_terms (
    term_key TEXT PRIMARY KEY CHECK(length(trim(term_key)) > 0),
    parent_term_key TEXT,
    label TEXT NOT NULL CHECK(length(trim(label)) > 0),
    normalized_label TEXT NOT NULL CHECK(length(trim(normalized_label)) > 0),
    aliases_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    sort_order INTEGER NOT NULL UNIQUE CHECK(sort_order >= 0),
    FOREIGN KEY(parent_term_key) REFERENCES product_target_terms(term_key)
);

CREATE TABLE product_vaccine_profile_terms (
    term_key TEXT PRIMARY KEY CHECK(length(trim(term_key)) > 0),
    parent_term_key TEXT,
    label TEXT NOT NULL CHECK(length(trim(label)) > 0),
    normalized_label TEXT NOT NULL CHECK(length(trim(normalized_label)) > 0),
    aliases_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    sort_order INTEGER NOT NULL UNIQUE CHECK(sort_order >= 0),
    FOREIGN KEY(parent_term_key) REFERENCES product_vaccine_profile_terms(term_key)
);

CREATE TABLE product_life_stage_terms (
    term_key TEXT PRIMARY KEY CHECK(length(trim(term_key)) > 0),
    parent_term_key TEXT,
    label TEXT NOT NULL CHECK(length(trim(label)) > 0),
    normalized_label TEXT NOT NULL CHECK(length(trim(normalized_label)) > 0),
    aliases_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    sort_order INTEGER NOT NULL UNIQUE CHECK(sort_order >= 0),
    FOREIGN KEY(parent_term_key) REFERENCES product_life_stage_terms(term_key)
);

CREATE TABLE product_therapeutic_scope_terms (
    term_key TEXT PRIMARY KEY CHECK(length(trim(term_key)) > 0),
    parent_term_key TEXT,
    label TEXT NOT NULL CHECK(length(trim(label)) > 0),
    normalized_label TEXT NOT NULL CHECK(length(trim(normalized_label)) > 0),
    aliases_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    sort_order INTEGER NOT NULL UNIQUE CHECK(sort_order >= 0),
    FOREIGN KEY(parent_term_key) REFERENCES product_therapeutic_scope_terms(term_key)
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

CREATE TABLE breed_reference_items (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    species_json TEXT NOT NULL CHECK(json_valid(species_json) AND json_type(species_json) = 'array'),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    size_term_key TEXT NOT NULL CHECK(length(trim(size_term_key)) > 0),
    average_weight_kg_json TEXT NOT NULL CHECK(json_valid(average_weight_kg_json)),
    average_height_cm_json TEXT NOT NULL CHECK(json_valid(average_height_cm_json)),
    content_json TEXT NOT NULL CHECK(json_valid(content_json))
);

CREATE TABLE breed_origin_places (
    breed_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(breed_id, place_id),
    UNIQUE(breed_id, sort_order),
    FOREIGN KEY(breed_id) REFERENCES breed_reference_items(id) ON DELETE CASCADE,
    FOREIGN KEY(place_id) REFERENCES geo_places(id) ON DELETE RESTRICT
);

CREATE TABLE manufacturer_catalog_items (
    id TEXT PRIMARY KEY,
    type_term_key TEXT NOT NULL,
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
    type_term_key TEXT NOT NULL,
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
    type_term_key TEXT NOT NULL,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    regions_json TEXT NOT NULL CHECK(json_valid(regions_json) AND json_type(regions_json) = 'array'),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    UNIQUE(normalized_name)
);

CREATE TABLE product_catalog_items (
    id TEXT PRIMARY KEY,
    type_term_key TEXT NOT NULL,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    species_json TEXT NOT NULL CHECK(json_valid(species_json) AND json_type(species_json) = 'array'),
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
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    taxonomy_id TEXT NOT NULL,
    term_key TEXT NOT NULL,
    relation_kind TEXT NOT NULL CHECK(relation_kind IN ('type','classification','size')),
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, relation_kind, term_key),
    UNIQUE(entity_type, entity_id, relation_kind, sort_order),
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

CREATE TABLE product_targets (
    product_id TEXT NOT NULL, term_key TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(product_id, term_key), UNIQUE(product_id, sort_order),
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
    FOREIGN KEY(term_key) REFERENCES product_target_terms(term_key) ON DELETE RESTRICT
);

CREATE TABLE product_vaccine_profiles (
    product_id TEXT NOT NULL, term_key TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(product_id, term_key), UNIQUE(product_id, sort_order),
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
    FOREIGN KEY(term_key) REFERENCES product_vaccine_profile_terms(term_key) ON DELETE RESTRICT
);

CREATE TABLE product_life_stages (
    product_id TEXT NOT NULL, term_key TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(product_id, term_key), UNIQUE(product_id, sort_order),
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
    FOREIGN KEY(term_key) REFERENCES product_life_stage_terms(term_key) ON DELETE RESTRICT
);

CREATE TABLE product_therapeutic_scopes (
    product_id TEXT NOT NULL, term_key TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(product_id, term_key), UNIQUE(product_id, sort_order),
    FOREIGN KEY(product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
    FOREIGN KEY(term_key) REFERENCES product_therapeutic_scope_terms(term_key) ON DELETE RESTRICT
);

CREATE TABLE treatment_protocols (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('vaccine','antiparasitic')),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0), normalized_name TEXT NOT NULL,
    species_json TEXT NOT NULL CHECK(json_valid(species_json) AND json_type(species_json) = 'array'), observation TEXT
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
    entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, value TEXT NOT NULL,
    normalized_value TEXT NOT NULL, provenance TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, provenance, normalized_value),
    UNIQUE(entity_type, entity_id, sort_order)
);

CREATE TABLE entity_media_references (
    entity_type TEXT NOT NULL CHECK(entity_type IN ('breed','product','manufacturer','active_ingredient','condition')),
    entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
    role TEXT NOT NULL CHECK(role IN ('cover', 'gallery')),
    media_key TEXT NOT NULL CHECK(length(trim(media_key)) > 0),
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, role, sort_order),
    UNIQUE(entity_type, entity_id, role, media_key)
);

CREATE INDEX idx_taxonomy_terms_label ON taxonomy_terms(taxonomy_id, normalized_label);
CREATE INDEX idx_geo_places_parent ON geo_places(parent_place_id);
CREATE INDEX idx_breed_origin_place ON breed_origin_places(place_id, breed_id);
CREATE INDEX idx_product_manufacturer ON product_catalog_items(manufacturer_id);
CREATE INDEX idx_product_active_ingredient ON product_active_ingredients(active_ingredient_id, product_id);
CREATE INDEX idx_product_targets_term_key ON product_targets(term_key, product_id);
CREATE INDEX idx_product_vaccine_profiles_term_key ON product_vaccine_profiles(term_key, product_id);
CREATE INDEX idx_product_life_stages_term_key ON product_life_stages(term_key, product_id);
CREATE INDEX idx_product_therapeutic_scopes_term_key ON product_therapeutic_scopes(term_key, product_id);
CREATE INDEX idx_search_normalized ON entity_search_terms(normalized_value, entity_type, entity_id);
CREATE INDEX idx_entity_media_key ON entity_media_references(media_key, entity_type, entity_id);
