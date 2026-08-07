//! Minimal ZIP writer/reader for uncompressed local packages.
//!
//! Distribution packages are internal transfer artifacts. Supporting stored ZIP
//! entries keeps the implementation dependency-light and easy to audit.

use super::{
    files::{remove_file_if_exists, validate_zip_relative_path},
    time::dos_date_time,
};
use std::{
    fs,
    io::{Read, Seek, Write},
    path::{Component, Path, PathBuf},
};

const LOCAL_FILE_HEADER_SIGNATURE: u32 = 0x0403_4b50;
const CENTRAL_DIRECTORY_HEADER_SIGNATURE: u32 = 0x0201_4b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE: u32 = 0x0605_4b50;
const ZIP_VERSION_STORED: u16 = 20;
const ZIP_UTF8_FLAG: u16 = 0x0800;
const ZIP_COMPRESSION_STORED: u16 = 0;
const CRC32_POLYNOMIAL: u32 = 0xedb8_8320;

struct ZipSourceEntry {
    relative_path: String,
    file_path: PathBuf,
    is_directory: bool,
}

struct CentralDirectoryRecord {
    relative_path: String,
    crc32: u32,
    size_bytes: u32,
    local_header_offset: u32,
    mod_time: u16,
    mod_date: u16,
}

pub(crate) fn write_zip_from_directory(root: &Path, destination_path: &Path) -> Result<(), String> {
    if !root.is_dir() {
        return Err("zip_source_directory_missing".to_string());
    }

    if let Some(parent) = destination_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("zip_parent_create_failed:{error}"))?;
    }
    remove_file_if_exists(destination_path)?;

    let mut entries = Vec::new();
    collect_zip_entries(root, root, &mut entries)?;

    let mut output = fs::File::create(destination_path)
        .map_err(|error| format!("zip_file_create_failed:{error}"))?;
    let mut central_records = Vec::new();

    for entry in entries {
        let metadata = fs::metadata(&entry.file_path)
            .map_err(|error| format!("zip_metadata_failed:{error}"))?;
        let (mod_time, mod_date) = dos_date_time(metadata.modified().unwrap_or_else(|_| {
            // The ZIP timestamp is only informational; use "now" when the
            // filesystem does not expose a reliable modification timestamp.
            std::time::SystemTime::now()
        }));
        let size_bytes = if entry.is_directory {
            0
        } else {
            u32::try_from(metadata.len()).map_err(|_| "zip_file_too_large".to_string())?
        };
        let crc32 = if entry.is_directory {
            0
        } else {
            crc32_file(&entry.file_path)?
        };
        let local_header_offset = u32::try_from(
            output
                .stream_position()
                .map_err(|error| format!("zip_stream_position_failed:{error}"))?,
        )
        .map_err(|_| "zip_archive_too_large".to_string())?;
        let name_bytes = entry.relative_path.as_bytes();
        let name_length =
            u16::try_from(name_bytes.len()).map_err(|_| "zip_path_too_long".to_string())?;

        write_u32(&mut output, LOCAL_FILE_HEADER_SIGNATURE)?;
        write_u16(&mut output, ZIP_VERSION_STORED)?;
        write_u16(&mut output, ZIP_UTF8_FLAG)?;
        write_u16(&mut output, ZIP_COMPRESSION_STORED)?;
        write_u16(&mut output, mod_time)?;
        write_u16(&mut output, mod_date)?;
        write_u32(&mut output, crc32)?;
        write_u32(&mut output, size_bytes)?;
        write_u32(&mut output, size_bytes)?;
        write_u16(&mut output, name_length)?;
        write_u16(&mut output, 0)?;
        output
            .write_all(name_bytes)
            .map_err(|error| format!("zip_name_write_failed:{error}"))?;

        if !entry.is_directory {
            let mut input = fs::File::open(&entry.file_path)
                .map_err(|error| format!("zip_source_file_open_failed:{error}"))?;
            std::io::copy(&mut input, &mut output)
                .map_err(|error| format!("zip_file_data_write_failed:{error}"))?;
        }

        central_records.push(CentralDirectoryRecord {
            relative_path: entry.relative_path,
            crc32,
            size_bytes,
            local_header_offset,
            mod_time,
            mod_date,
        });
    }

    let central_directory_offset = u32::try_from(
        output
            .stream_position()
            .map_err(|error| format!("zip_stream_position_failed:{error}"))?,
    )
    .map_err(|_| "zip_archive_too_large".to_string())?;

    for record in &central_records {
        let name_bytes = record.relative_path.as_bytes();
        let name_length =
            u16::try_from(name_bytes.len()).map_err(|_| "zip_path_too_long".to_string())?;

        write_u32(&mut output, CENTRAL_DIRECTORY_HEADER_SIGNATURE)?;
        write_u16(&mut output, ZIP_VERSION_STORED)?;
        write_u16(&mut output, ZIP_VERSION_STORED)?;
        write_u16(&mut output, ZIP_UTF8_FLAG)?;
        write_u16(&mut output, ZIP_COMPRESSION_STORED)?;
        write_u16(&mut output, record.mod_time)?;
        write_u16(&mut output, record.mod_date)?;
        write_u32(&mut output, record.crc32)?;
        write_u32(&mut output, record.size_bytes)?;
        write_u32(&mut output, record.size_bytes)?;
        write_u16(&mut output, name_length)?;
        write_u16(&mut output, 0)?;
        write_u16(&mut output, 0)?;
        write_u16(&mut output, 0)?;
        write_u16(&mut output, 0)?;
        write_u32(&mut output, 0)?;
        write_u32(&mut output, record.local_header_offset)?;
        output
            .write_all(name_bytes)
            .map_err(|error| format!("zip_central_name_write_failed:{error}"))?;
    }

    let central_directory_end = output
        .stream_position()
        .map_err(|error| format!("zip_stream_position_failed:{error}"))?;
    let central_directory_size =
        u32::try_from(central_directory_end - u64::from(central_directory_offset))
            .map_err(|_| "zip_archive_too_large".to_string())?;
    let entry_count = u16::try_from(central_records.len())
        .map_err(|_| "zip_entry_count_too_large".to_string())?;

    write_u32(&mut output, END_OF_CENTRAL_DIRECTORY_SIGNATURE)?;
    write_u16(&mut output, 0)?;
    write_u16(&mut output, 0)?;
    write_u16(&mut output, entry_count)?;
    write_u16(&mut output, entry_count)?;
    write_u32(&mut output, central_directory_size)?;
    write_u32(&mut output, central_directory_offset)?;
    write_u16(&mut output, 0)?;

    Ok(())
}

pub(crate) fn extract_zip_file(source_path: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination)
        .map_err(|error| format!("zip_extract_destination_create_failed:{error}"))?;
    let archive = fs::read(source_path).map_err(|error| format!("zip_read_failed:{error}"))?;
    let mut offset = 0usize;

    while offset + 4 <= archive.len() {
        let signature = read_u32_at(&archive, offset)?;
        match signature {
            LOCAL_FILE_HEADER_SIGNATURE => {
                let flags = read_u16_at(&archive, offset + 6)?;
                let compression = read_u16_at(&archive, offset + 8)?;
                let expected_crc32 = read_u32_at(&archive, offset + 14)?;
                let compressed_size = read_u32_at(&archive, offset + 18)? as usize;
                let uncompressed_size = read_u32_at(&archive, offset + 22)? as usize;
                let file_name_length = read_u16_at(&archive, offset + 26)? as usize;
                let extra_length = read_u16_at(&archive, offset + 28)? as usize;

                if flags & 0x0001 != 0 {
                    return Err("zip_encrypted_entries_not_supported".to_string());
                }
                if flags & 0x0008 != 0 {
                    return Err("zip_data_descriptor_not_supported".to_string());
                }
                if compression != ZIP_COMPRESSION_STORED {
                    return Err("zip_compression_not_supported".to_string());
                }
                if compressed_size != uncompressed_size {
                    return Err("zip_size_mismatch".to_string());
                }

                let name_start = offset + 30;
                let name_end = name_start
                    .checked_add(file_name_length)
                    .ok_or_else(|| "zip_entry_name_out_of_bounds".to_string())?;
                let data_start = name_end
                    .checked_add(extra_length)
                    .ok_or_else(|| "zip_entry_extra_out_of_bounds".to_string())?;
                let data_end = data_start
                    .checked_add(compressed_size)
                    .ok_or_else(|| "zip_entry_data_out_of_bounds".to_string())?;
                if data_end > archive.len() {
                    return Err("zip_entry_out_of_bounds".to_string());
                }

                let raw_name = std::str::from_utf8(&archive[name_start..name_end])
                    .map_err(|_| "zip_entry_name_not_utf8".to_string())?;
                let clean_name = raw_name.trim_end_matches('/');
                let relative_path = validate_zip_relative_path(clean_name)?;
                let target_path = destination.join(relative_path);

                if raw_name.ends_with('/') {
                    fs::create_dir_all(&target_path)
                        .map_err(|error| format!("zip_directory_create_failed:{error}"))?;
                    offset = data_end;
                    continue;
                }

                let actual_crc32 = crc32_bytes(&archive[data_start..data_end]);
                if actual_crc32 != expected_crc32 {
                    return Err("zip_entry_crc_mismatch".to_string());
                }
                if let Some(parent) = target_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|error| format!("zip_entry_parent_create_failed:{error}"))?;
                }
                fs::write(&target_path, &archive[data_start..data_end])
                    .map_err(|error| format!("zip_entry_write_failed:{error}"))?;
                offset = data_end;
            }
            CENTRAL_DIRECTORY_HEADER_SIGNATURE | END_OF_CENTRAL_DIRECTORY_SIGNATURE => break,
            _ => return Err("zip_signature_invalid".to_string()),
        }
    }

    Ok(())
}

fn collect_zip_entries(
    root: &Path,
    current: &Path,
    entries: &mut Vec<ZipSourceEntry>,
) -> Result<(), String> {
    let mut children = fs::read_dir(current)
        .map_err(|error| format!("zip_source_read_failed:{error}"))?
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("zip_source_entry_failed:{error}"))?;
    children.sort();

    for child in children {
        if child.is_dir() {
            entries.push(ZipSourceEntry {
                relative_path: relative_zip_path(root, &child, true)?,
                file_path: child.clone(),
                is_directory: true,
            });
            collect_zip_entries(root, &child, entries)?;
        } else if child.is_file() {
            entries.push(ZipSourceEntry {
                relative_path: relative_zip_path(root, &child, false)?,
                file_path: child,
                is_directory: false,
            });
        }
    }

    Ok(())
}

fn relative_zip_path(root: &Path, path: &Path, is_directory: bool) -> Result<String, String> {
    let relative = path
        .strip_prefix(root)
        .map_err(|_| "zip_path_strip_failed".to_string())?;
    let mut parts = Vec::new();
    for component in relative.components() {
        match component {
            Component::Normal(value) => {
                let value = value
                    .to_str()
                    .ok_or_else(|| "zip_path_not_utf8".to_string())?;
                parts.push(value);
            }
            _ => return Err("zip_path_invalid".to_string()),
        }
    }

    let mut value = parts.join("/");
    if value.is_empty() {
        return Err("zip_path_invalid".to_string());
    }
    if is_directory {
        value.push('/');
    }
    Ok(value)
}

fn crc32_file(path: &Path) -> Result<u32, String> {
    let mut file =
        fs::File::open(path).map_err(|error| format!("zip_crc_file_open_failed:{error}"))?;
    let mut crc = !0u32;
    let mut buffer = [0u8; 64 * 1024];

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|error| format!("zip_crc_file_read_failed:{error}"))?;
        if read == 0 {
            break;
        }
        crc = crc32_update(crc, &buffer[..read]);
    }

    Ok(!crc)
}

fn crc32_bytes(bytes: &[u8]) -> u32 {
    !crc32_update(!0u32, bytes)
}

fn crc32_update(mut crc: u32, bytes: &[u8]) -> u32 {
    for byte in bytes {
        crc ^= u32::from(*byte);
        for _ in 0..8 {
            let mask = 0u32.wrapping_sub(crc & 1);
            crc = (crc >> 1) ^ (CRC32_POLYNOMIAL & mask);
        }
    }
    crc
}

fn read_u16_at(bytes: &[u8], offset: usize) -> Result<u16, String> {
    let value = bytes
        .get(offset..offset + 2)
        .ok_or_else(|| "zip_read_u16_out_of_bounds".to_string())?;
    Ok(u16::from_le_bytes([value[0], value[1]]))
}

fn read_u32_at(bytes: &[u8], offset: usize) -> Result<u32, String> {
    let value = bytes
        .get(offset..offset + 4)
        .ok_or_else(|| "zip_read_u32_out_of_bounds".to_string())?;
    Ok(u32::from_le_bytes([value[0], value[1], value[2], value[3]]))
}

fn write_u16(writer: &mut impl Write, value: u16) -> Result<(), String> {
    writer
        .write_all(&value.to_le_bytes())
        .map_err(|error| format!("zip_write_u16_failed:{error}"))
}

fn write_u32(writer: &mut impl Write, value: u32) -> Result<(), String> {
    writer
        .write_all(&value.to_le_bytes())
        .map_err(|error| format!("zip_write_u32_failed:{error}"))
}
