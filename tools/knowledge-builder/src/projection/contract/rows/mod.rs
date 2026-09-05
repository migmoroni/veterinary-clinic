//! Owns the closed system row payloads and their canonical persistence descriptors.

mod descriptor;
mod model;

#[cfg(test)]
mod test_support;

pub(crate) use descriptor::{RowIdentity, SystemRowCase, SystemRowDescriptor};
pub(crate) use model::SystemRow;

#[cfg(test)]
pub(crate) use test_support::representative_row;
