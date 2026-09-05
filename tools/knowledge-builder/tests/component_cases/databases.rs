//! Exercises database creation, persistence, and finalized read-back through a minimal projection.

use crate::support::*;
use knowledge_builder::{build, validate, BuildOptions, LOCALES};
use rusqlite::Connection;
use std::path::Path;

#[test]
fn minimal_projection_finalizes_and_round_trips_every_database() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let validated = validate(&fixture).expect("minimal fixture must validate");
    assert_eq!(validated.entity_count(), 27);
    let output = TestDirectory::new("component-databases");
    let result = build(&BuildOptions {
        source: fixture,
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("minimal fixture must build");

    assert_eq!(result.locales.len(), LOCALES.len());
    for locale in LOCALES {
        let artifacts = &result.locales[locale.as_str()];
        for artifact in [&artifacts.system, &artifacts.system_media] {
            let database = Connection::open(output.path().join(&artifact.path)).unwrap();
            let integrity: String = database
                .query_row("PRAGMA integrity_check", [], |row| row.get(0))
                .unwrap();
            let foreign_keys: i64 = database
                .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
                    row.get(0)
                })
                .unwrap();
            assert_eq!(integrity, "ok");
            assert_eq!(foreign_keys, 0);
        }
    }
}
