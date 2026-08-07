//! Replication and continuous backup boundary.
//!
//! The module keeps the local-first data bundle replicated through small
//! SQLite changesets plus CAS media files. `engine` owns the serialized loop;
//! `capture` creates local patches; `outbox` persists pending delivery;
//! `targets` isolates local/cloud transports; and `applier` applies inbound
//! patches to active databases.

mod applier;
mod capture;
mod engine;
pub mod orchestrator;
mod outbox;
mod targets;
mod types;

pub use orchestrator::start_background;
