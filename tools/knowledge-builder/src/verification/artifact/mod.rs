//! Orchestrates the sole artifact-verification facade for staging and reuse.

mod cas;
mod database;
mod evidence;
mod identity;
mod manifest;
mod media;
mod tree;

use crate::{
    contracts::locale::KnowledgeLocale,
    projection::contract::ProjectionContract,
    report::{BuildContext, BuildResult},
    validation::ValidatedSource,
};
use std::{collections::BTreeMap, path::Path};

pub(crate) struct ArtifactVerifier<'a> {
    source: &'a ValidatedSource,
    context: &'a BuildContext,
    contracts: &'a BTreeMap<KnowledgeLocale, ProjectionContract>,
    version_root: &'a Path,
    cas_root: &'a Path,
    result: &'a BuildResult,
}

pub(super) struct VerificationContext<'a> {
    pub(super) source: &'a ValidatedSource,
    pub(super) context: &'a BuildContext,
    pub(super) contracts: &'a BTreeMap<KnowledgeLocale, ProjectionContract>,
    pub(super) version_root: &'a Path,
    pub(super) cas_root: &'a Path,
    pub(super) result: &'a BuildResult,
}

impl<'a> ArtifactVerifier<'a> {
    pub(crate) fn new(
        source: &'a ValidatedSource,
        context: &'a BuildContext,
        contracts: &'a BTreeMap<KnowledgeLocale, ProjectionContract>,
        version_root: &'a Path,
        cas_root: &'a Path,
        result: &'a BuildResult,
    ) -> Self {
        Self {
            source,
            context,
            contracts,
            version_root,
            cas_root,
            result,
        }
    }

    pub(crate) fn verify(&self) -> Result<(), String> {
        let context = VerificationContext {
            source: self.source,
            context: self.context,
            contracts: self.contracts,
            version_root: self.version_root,
            cas_root: self.cas_root,
            result: self.result,
        };
        let identity = identity::verify(&context)?;
        let tree = tree::verify(&context, &identity)?;
        let manifest = manifest::verify(&context, &identity, &tree)?;
        let databases = database::verify(&context, &manifest)?;
        let media = media::verify(&context, &databases)?;
        let cas = cas::verify(&context, &media)?;
        manifest::verify_coverage(&context, &manifest, &cas)?;
        evidence::verify(&context, &manifest, &databases, &cas)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn artifact_verification_has_one_facade_and_read_only_boundaries() {
        let crate_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        assert!(!crate_root.join("src/artifact_verifier.rs").exists());

        let build = include_str!("../../projection/build.rs");
        let reuse = include_str!("../../projection/reuse.rs");
        assert!(build.contains("ArtifactVerifier::new"));
        assert!(reuse.contains("ArtifactVerifier::new"));

        let facade = include_str!("mod.rs").split("#[cfg(test)]").next().unwrap();
        assert_eq!(facade.matches("struct ArtifactVerifier").count(), 1);
        let readers = [
            include_str!("../readers/metadata.rs"),
            include_str!("../readers/system.rs"),
            include_str!("../readers/system_media.rs"),
        ]
        .into_iter()
        .map(|source| source.split("#[cfg(test)]").next().unwrap())
        .collect::<Vec<_>>()
        .join("\n");
        assert!(!readers.contains("execution::writers"));
        assert!(!readers.contains("INSERT INTO"));

        let verifiers = [
            include_str!("identity.rs"),
            include_str!("tree.rs"),
            include_str!("manifest.rs"),
            include_str!("database.rs"),
            include_str!("media.rs"),
            include_str!("cas.rs"),
            include_str!("evidence.rs"),
        ]
        .into_iter()
        .map(|source| source.split("#[cfg(test)]").next().unwrap())
        .collect::<Vec<_>>()
        .join("\n");
        for mutation in ["fs::write(", "fs::remove_", "fs::rename("] {
            assert!(
                !verifiers.contains(mutation),
                "verifier contains {mutation}"
            );
        }
    }
}
