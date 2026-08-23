CREATE TABLE knowledge_build_metadata (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    build_version INTEGER NOT NULL CHECK(build_version > 0),
    builder_version TEXT NOT NULL CHECK(length(trim(builder_version)) > 0),
    build_result_schema_version INTEGER NOT NULL CHECK(build_result_schema_version > 0),
    source_digest_sha256 BLOB NOT NULL CHECK(length(source_digest_sha256) = 32),
    locale TEXT NOT NULL CHECK(locale IN ('pt-BR','pt-PT','gn-PY','en-US','es-ES','fr-FR'))
);

CREATE TABLE knowledge_release_metadata (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    release_id TEXT NOT NULL CHECK(length(trim(release_id)) > 0),
    generation INTEGER NOT NULL CHECK(generation > 0),
    revision INTEGER NOT NULL CHECK(revision > 0),
    locale TEXT NOT NULL CHECK(locale IN ('pt-BR','pt-PT','gn-PY','en-US','es-ES','fr-FR'))
);

CREATE TABLE media_assets (
    media_key TEXT PRIMARY KEY CHECK(length(trim(media_key)) > 0 AND instr(media_key, '..') = 0),
    content_hash BLOB NOT NULL CHECK(length(content_hash) = 32),
    thumbnail BLOB,
    mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','image/gif','image/webp')),
    size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
    width INTEGER CHECK(width IS NULL OR width > 0),
    height INTEGER CHECK(height IS NULL OR height > 0)
);

CREATE INDEX idx_media_assets_content_hash ON media_assets(content_hash);
