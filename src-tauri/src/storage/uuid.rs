use super::bytes_to_hex;
use sha2::{Digest, Sha256};
use std::{
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

static UUID_COUNTER: AtomicU64 = AtomicU64::new(0);

pub(crate) fn uuid_v7_string() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default();
    let counter = UUID_COUNTER.fetch_add(1, Ordering::Relaxed);
    let seed = format!("{}:{}:{}", millis, std::process::id(), counter);
    let entropy = Sha256::digest(seed.as_bytes());
    let mut bytes = [0_u8; 16];
    bytes[0] = ((millis >> 40) & 0xff) as u8;
    bytes[1] = ((millis >> 32) & 0xff) as u8;
    bytes[2] = ((millis >> 24) & 0xff) as u8;
    bytes[3] = ((millis >> 16) & 0xff) as u8;
    bytes[4] = ((millis >> 8) & 0xff) as u8;
    bytes[5] = (millis & 0xff) as u8;
    bytes[6..16].copy_from_slice(&entropy[0..10]);
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex = bytes_to_hex(&bytes);
    format!(
        "{}-{}-{}-{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..32]
    )
}
