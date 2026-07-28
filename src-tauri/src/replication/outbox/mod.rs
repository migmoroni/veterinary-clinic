//! Transport outbox.
//!
//! The outbox owns durable outbound queueing and transport rollups. It does not
//! know whether a package goes to local disk, NAS or cloud; that choice belongs
//! to `replication::targets`.

pub(crate) mod consolidator;
pub(crate) mod queue;
pub(crate) mod transport;
