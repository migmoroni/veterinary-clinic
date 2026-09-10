//! Canonical read queries for the compiled `life:type` taxonomy.

/// Resolves a life profile, its type term, localized name, and rank depth.
pub const ENTITY_WITH_TYPE: &str = r#"
WITH RECURSIVE ranked(term_key, parent_term_key, label, depth) AS (
    SELECT term_key, parent_term_key, label, 0
    FROM taxonomy_terms
    WHERE taxonomy_id = 'life-types' AND parent_term_key IS NULL
    UNION ALL
    SELECT child.term_key, child.parent_term_key, child.label, parent.depth + 1
    FROM taxonomy_terms child
    JOIN ranked parent ON child.parent_term_key = parent.term_key
    WHERE child.taxonomy_id = 'life-types' AND child.parent_term_key IS NOT NULL
)
SELECT life.id, relation.term_key, ranked.label, ranked.depth,
       life.size_term_key, life.aliases_json, life.stage_metrics_json, life.content_json
FROM life_reference_items life
JOIN entity_taxonomy_terms relation
  ON relation.entity_type = 'life' AND relation.entity_id = life.id
 AND relation.taxonomy_id = 'life-types'
JOIN ranked ON ranked.term_key = relation.term_key
WHERE life.id = ?1
"#;

/// Returns the ancestors of one term from domain to direct parent.
pub const ANCESTORS: &str = r#"
WITH RECURSIVE ancestors(term_key, parent_term_key, distance) AS (
    SELECT term_key, parent_term_key, 0
    FROM taxonomy_terms
    WHERE taxonomy_id = 'life-types' AND term_key = ?1
    UNION ALL
    SELECT parent.term_key, parent.parent_term_key, child.distance + 1
    FROM taxonomy_terms parent
    JOIN ancestors child ON child.parent_term_key = parent.term_key
    WHERE parent.taxonomy_id = 'life-types'
)
SELECT term_key FROM ancestors WHERE distance > 0 ORDER BY distance DESC
"#;

/// Expands a JSON array of applicable term keys to each term and all descendants.
pub const APPLICABLE_DESCENDANTS: &str = r#"
WITH RECURSIVE descendants(term_key) AS (
    SELECT value FROM json_each(?1)
    UNION
    SELECT child.term_key
    FROM taxonomy_terms child
    JOIN descendants parent ON child.parent_term_key = parent.term_key
    WHERE child.taxonomy_id = 'life-types' AND child.parent_term_key IS NOT NULL
)
SELECT term_key FROM descendants ORDER BY term_key
"#;

/// Resolves the optional life profile associated with a term.
pub const ENTITY_FOR_TERM: &str = r#"
SELECT life.*
FROM entity_taxonomy_terms relation
JOIN life_reference_items life ON life.id = relation.entity_id
WHERE relation.entity_type = 'life' AND relation.taxonomy_id = 'life-types'
  AND relation.term_key = ?1
"#;

/// Lists terms at a zero-based `LifeRank` depth, including terms without profiles.
pub const TERMS_BY_RANK: &str = r#"
WITH RECURSIVE ranked(term_key, parent_term_key, label, sort_order, depth) AS (
    SELECT term_key, parent_term_key, label, sort_order, 0
    FROM taxonomy_terms
    WHERE taxonomy_id = 'life-types' AND parent_term_key IS NULL
    UNION ALL
    SELECT child.term_key, child.parent_term_key, child.label, child.sort_order, parent.depth + 1
    FROM taxonomy_terms child
    JOIN ranked parent ON child.parent_term_key = parent.term_key
    WHERE child.taxonomy_id = 'life-types'
)
SELECT term_key, parent_term_key, label, sort_order
FROM ranked WHERE depth = ?1 ORDER BY parent_term_key, sort_order, term_key
"#;
