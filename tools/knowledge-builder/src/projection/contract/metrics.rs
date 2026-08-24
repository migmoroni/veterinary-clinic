//! Computes contract operation totals and projected row counts.

use super::*;

impl ProjectionContract {
    pub(crate) fn rows_by_database(&self) -> BTreeMap<String, BTreeMap<String, usize>> {
        let mut system = SystemTable::SYSTEM_PROJECTABLE
            .into_iter()
            .map(|table| (table.as_str().to_string(), 0usize))
            .collect::<BTreeMap<_, _>>();
        let mut system_media = SystemTable::SYSTEM_MEDIA_PROJECTABLE
            .into_iter()
            .map(|table| (table.as_str().to_string(), 0usize))
            .collect::<BTreeMap<_, _>>();
        for operation in &self.system {
            *system.get_mut(operation.event.table.as_str()).unwrap() += 1;
        }
        for operation in &self.system_media {
            *system_media
                .get_mut(operation.event.table.as_str())
                .unwrap() += 1;
        }
        BTreeMap::from([
            ("system".to_string(), system),
            ("systemMedia".to_string(), system_media),
        ])
    }

    pub(crate) fn operation_count(&self) -> usize {
        self.compilation.len()
            + self.metadata.len()
            + self.system.len()
            + self.system_media.len()
            + self.cas.len()
    }
}
