//! Executes typed projection effects and exposes only post-confirmation receipts.

mod cas;
mod compilation;
mod receipts;
pub(crate) mod writers;

pub(crate) use cas::{commit_cas, stage_cas_objects};
pub(crate) use compilation::confirm_compilation;
pub(crate) use receipts::{ConfirmedReceipt, ConfirmedReceiptBatch, ProjectionEvent};
pub(crate) use writers::{write_system, write_system_media};
