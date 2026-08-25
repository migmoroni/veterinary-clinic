//! Defines the closed and deterministically ordered set of supported knowledge locales.

use serde::Serialize;
use std::fmt;

pub const LOCALES: [KnowledgeLocale; 6] = [
    KnowledgeLocale::PtBr,
    KnowledgeLocale::PtPt,
    KnowledgeLocale::GnPy,
    KnowledgeLocale::EnUs,
    KnowledgeLocale::EsEs,
    KnowledgeLocale::FrFr,
];

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, Serialize)]
pub enum KnowledgeLocale {
    PtBr,
    PtPt,
    GnPy,
    EnUs,
    EsEs,
    FrFr,
}

impl KnowledgeLocale {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PtBr => "pt-BR",
            Self::PtPt => "pt-PT",
            Self::GnPy => "gn-PY",
            Self::EnUs => "en-US",
            Self::EsEs => "es-ES",
            Self::FrFr => "fr-FR",
        }
    }
}

impl fmt::Display for KnowledgeLocale {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}
