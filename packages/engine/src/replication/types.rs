//! Shared replication transport contracts.
//!
//! These structs cross module boundaries and, for Tauri commands, the Rust/TS
//! boundary. Keep them business-agnostic: domains describe storage files, not
//! owners, pets or products.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserStorageDomain {
    #[serde(rename = "userData")]
    Main,
    #[serde(rename = "userMedia")]
    Media,
    #[serde(rename = "userLogs")]
    Logs,
}

impl UserStorageDomain {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Main => "userData",
            Self::Media => "userMedia",
            Self::Logs => "userLogs",
        }
    }

    pub(crate) fn base_database_name(self) -> &'static str {
        match self {
            Self::Main => "base_veterinary_clinic_user.db",
            Self::Media => "base_veterinary_clinic_user_media.db",
            Self::Logs => "base_veterinary_clinic_user_logs.db",
        }
    }
}

impl TryFrom<&str> for UserStorageDomain {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "userData" => Ok(Self::Main),
            "userMedia" => Ok(Self::Media),
            "userLogs" => Ok(Self::Logs),
            _ => Err(format!("replication_domain_invalid:{value}")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TargetId {
    Local,
    Cloud,
}

impl TargetId {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Local => "local",
            Self::Cloud => "cloud",
        }
    }
}

impl TryFrom<&str> for TargetId {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "local" => Ok(Self::Local),
            "cloud" => Ok(Self::Cloud),
            _ => Err(format!("replication_target_invalid:{value}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CasMediaPayload {
    pub hash_hex: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchEnvelope {
    pub sequence_id: u64,
    pub domain: UserStorageDomain,
    pub device_id: String,
    pub created_at: i64,
    pub patch_bytes: Vec<u8>,
    pub media_files: Vec<CasMediaPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalReceptorConfig {
    pub enabled: bool,
    pub target_path: PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum EnvelopeStage {
    Micro,
    C1,
    C2,
    C3,
}

impl EnvelopeStage {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Micro => "micro",
            Self::C1 => "c1",
            Self::C2 => "c2",
            Self::C3 => "c3",
        }
    }

    pub(crate) fn next(self) -> Option<Self> {
        match self {
            Self::Micro => Some(Self::C1),
            Self::C1 => Some(Self::C2),
            Self::C2 => Some(Self::C3),
            Self::C3 => None,
        }
    }

    pub(crate) fn rollup_threshold(self) -> usize {
        match self {
            Self::Micro => 60,
            Self::C1 => 36,
            Self::C2 => 28,
            Self::C3 => usize::MAX,
        }
    }
}

impl TryFrom<&str> for EnvelopeStage {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "micro" => Ok(Self::Micro),
            "c1" => Ok(Self::C1),
            "c2" => Ok(Self::C2),
            "c3" => Ok(Self::C3),
            _ => Err(format!("replication_stage_invalid:{value}")),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct OutboxItem {
    pub id: String,
    pub stage: EnvelopeStage,
    pub envelope: PatchEnvelope,
    pub origin_target: Option<TargetId>,
    pub delivered_targets: Vec<TargetId>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreFromBackupRequest {
    pub backup_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatus {
    pub enabled: bool,
    pub target_path: Option<String>,
    pub effective_path: Option<String>,
    pub using_fallback: bool,
    pub destination_available: bool,
    pub pending_micro: u64,
    pub pending_c1: u64,
    pub pending_c2: u64,
    pub pending_c3: u64,
    pub pending_total: u64,
    pub last_error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_storage_domains_preserve_the_wire_contract() {
        for (domain, wire_value) in [
            (UserStorageDomain::Main, "userData"),
            (UserStorageDomain::Media, "userMedia"),
            (UserStorageDomain::Logs, "userLogs"),
        ] {
            assert_eq!(domain.as_str(), wire_value);
            assert_eq!(
                serde_json::to_string(&domain).unwrap(),
                format!("\"{wire_value}\"")
            );
            assert_eq!(
                serde_json::from_str::<UserStorageDomain>(&format!("\"{wire_value}\"")).unwrap(),
                domain
            );
            assert_eq!(UserStorageDomain::try_from(wire_value).unwrap(), domain);
        }
    }
}
