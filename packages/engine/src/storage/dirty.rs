//! Dirty flags used by replication capture.
//!
//! User databases mark these flags when writes occur, allowing the replication
//! engine to skip expensive diff work when a domain has not changed.

use super::StorageDatabase;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Default)]
pub(crate) struct UserBundleDirtyFlags {
    user_data: AtomicBool,
    user_media: AtomicBool,
    user_logs: AtomicBool,
}

impl UserBundleDirtyFlags {
    pub(crate) fn mark_database(&self, database: StorageDatabase) {
        if let Some(flag) = self.flag(database) {
            flag.store(true, Ordering::Release);
        }
    }

    pub(crate) fn take_database(&self, database: StorageDatabase) -> bool {
        self.flag(database)
            .map(|flag| flag.swap(false, Ordering::AcqRel))
            .unwrap_or(false)
    }

    pub(crate) fn clear_database(&self, database: StorageDatabase) {
        if let Some(flag) = self.flag(database) {
            flag.store(false, Ordering::Release);
        }
    }

    pub(crate) fn mark_user_bundle(&self) {
        self.user_data.store(true, Ordering::Release);
        self.user_media.store(true, Ordering::Release);
        self.user_logs.store(true, Ordering::Release);
    }

    fn flag(&self, database: StorageDatabase) -> Option<&AtomicBool> {
        match database {
            StorageDatabase::User => Some(&self.user_data),
            StorageDatabase::UserMedia => Some(&self.user_media),
            StorageDatabase::UserLogs => Some(&self.user_logs),
            StorageDatabase::System
            | StorageDatabase::SystemMedia
            | StorageDatabase::DatabaseFile => None,
        }
    }
}
