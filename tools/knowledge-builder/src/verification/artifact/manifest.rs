//! Verifies the projection manifest, declared paths, checksums, and physical coverage.

use super::{
    cas::VerifiedCas,
    identity::{resolve_declared_path, VerifiedIdentity},
    tree::VerifiedTree,
    VerificationContext,
};
use crate::{
    contracts::artifact::{VersionArtifact, CAS_ROOT},
    contracts::locale::LOCALES,
    media::{cas_relative_path, decode_hex, sha256_hex},
    report::{self, ProjectionReport},
    schemas,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

#[derive(Debug)]
pub(super) struct VerifiedManifest {
    pub(super) report: ProjectionReport,
    checksum_entries: BTreeMap<String, String>,
}

pub(super) fn verify(
    context: &VerificationContext<'_>,
    identity: &VerifiedIdentity,
    tree: &VerifiedTree,
) -> Result<VerifiedManifest, String> {
    if !tree
        .files
        .contains(VersionArtifact::ProjectionReport.filename())
        || !tree.files.contains(VersionArtifact::Checksums.filename())
    {
        return Err("version manifest files are absent from verified tree".to_string());
    }
    verify_file_checksum(
        &identity.projection_path,
        &context.result.projection.checksum_sha256,
    )?;
    let entries = read_checksum_entries(&identity.checksum_path)?;
    for (relative, checksum) in &entries {
        let path = resolve_declared_path(context, relative)?;
        verify_file_checksum(&path, checksum)?;
    }

    let bytes = fs::read(&identity.projection_path)
        .map_err(|error| format!("cannot read projection report: {error}"))?;
    let raw: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|error| format!("projection report is invalid JSON: {error}"))?;
    schemas::validate_projection_report(&raw)?;
    let report = serde_json::from_value(raw)
        .map_err(|error| format!("projection report has an invalid contract: {error}"))?;
    Ok(VerifiedManifest {
        report,
        checksum_entries: entries,
    })
}

pub(super) fn verify_coverage(
    context: &VerificationContext<'_>,
    manifest: &VerifiedManifest,
    cas: &VerifiedCas,
) -> Result<(), String> {
    let mut expected = BTreeSet::new();
    for locale in LOCALES {
        let artifacts = context.result.locales.get(locale.as_str()).unwrap();
        expected.insert(artifacts.system.path.clone());
        expected.insert(artifacts.system_media.path.clone());
    }
    expected.insert(context.result.projection.report_path.clone());
    for hash in &cas.global_hashes {
        expected.insert(format!(
            "{CAS_ROOT}/{}",
            report::normalized_relative_path(&cas_relative_path(hash)?)?
        ));
    }
    if manifest
        .checksum_entries
        .keys()
        .cloned()
        .collect::<BTreeSet<_>>()
        != expected
    {
        return Err("checksums.sha256 coverage differs from referenced artifacts".to_string());
    }
    Ok(())
}

pub(super) fn verify_file_checksum(path: &Path, expected: &str) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("cannot inspect artifact {}: {error}", path.display()))?;
    if !metadata.file_type().is_file() {
        return Err(format!(
            "artifact must be a regular file without symlinks: {}",
            path.display()
        ));
    }
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read artifact {}: {error}", path.display()))?;
    if sha256_hex(&bytes) != expected {
        return Err(format!("artifact checksum mismatch for {}", path.display()));
    }
    Ok(())
}

fn read_checksum_entries(path: &Path) -> Result<BTreeMap<String, String>, String> {
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("cannot read checksum file {}: {error}", path.display()))?;
    let mut result = BTreeMap::new();
    for (index, line) in contents.lines().enumerate() {
        let (checksum, relative) = line
            .split_once("  ")
            .ok_or_else(|| format!("{}:{}: invalid checksum line", path.display(), index + 1))?;
        decode_hex(checksum)?;
        if report::normalized_relative_path(Path::new(relative))? != relative {
            return Err(format!(
                "{}:{}: non-canonical path",
                path.display(),
                index + 1
            ));
        }
        if result
            .insert(relative.to_string(), checksum.to_string())
            .is_some()
        {
            return Err(format!(
                "{}:{}: duplicate checksum path",
                path.display(),
                index + 1
            ));
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checksum_reader_rejects_non_canonical_paths() {
        let path =
            std::env::temp_dir().join(format!("knowledge-builder-manifest-{}", std::process::id()));
        fs::write(&path, format!("{}  versions/1/../bad\n", "0".repeat(64))).unwrap();
        let error = read_checksum_entries(&path).unwrap_err();
        fs::remove_file(path).unwrap();
        assert!(!error.is_empty());
    }
}
