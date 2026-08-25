//! Defines the single typed matrix of canonical taxonomy domains, purposes, and cardinalities.

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum TaxonomyCardinality {
    ExactlyOne,
    ZeroOrMore,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct TaxonomySpec {
    pub domain: &'static str,
    pub purpose: &'static str,
    pub cardinality: TaxonomyCardinality,
}

pub(crate) const CANONICAL_TAXONOMIES: [TaxonomySpec; 13] = [
    TaxonomySpec {
        domain: "breed",
        purpose: "size",
        cardinality: TaxonomyCardinality::ExactlyOne,
    },
    TaxonomySpec {
        domain: "manufacturer",
        purpose: "type",
        cardinality: TaxonomyCardinality::ExactlyOne,
    },
    TaxonomySpec {
        domain: "manufacturer",
        purpose: "classification",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "active_ingredient",
        purpose: "type",
        cardinality: TaxonomyCardinality::ExactlyOne,
    },
    TaxonomySpec {
        domain: "active_ingredient",
        purpose: "classification",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "condition",
        purpose: "type",
        cardinality: TaxonomyCardinality::ExactlyOne,
    },
    TaxonomySpec {
        domain: "condition",
        purpose: "classification",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "product",
        purpose: "type",
        cardinality: TaxonomyCardinality::ExactlyOne,
    },
    TaxonomySpec {
        domain: "product",
        purpose: "classification",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "product",
        purpose: "target",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "product",
        purpose: "vaccine_profile",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "product",
        purpose: "life_stage",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
    TaxonomySpec {
        domain: "product",
        purpose: "therapeutic_scope",
        cardinality: TaxonomyCardinality::ZeroOrMore,
    },
];

pub(crate) fn taxonomy_spec(domain: &str, purpose: &str) -> Option<&'static TaxonomySpec> {
    CANONICAL_TAXONOMIES
        .iter()
        .find(|spec| spec.domain == domain && spec.purpose == purpose)
}

pub(crate) fn taxonomy_domains() -> impl Iterator<Item = &'static str> {
    CANONICAL_TAXONOMIES
        .iter()
        .enumerate()
        .filter(|(index, spec)| {
            !CANONICAL_TAXONOMIES[..*index]
                .iter()
                .any(|previous| previous.domain == spec.domain)
        })
        .map(|(_, spec)| spec.domain)
}
