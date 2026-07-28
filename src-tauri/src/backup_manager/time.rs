pub(crate) fn dos_date_time(time: std::time::SystemTime) -> (u16, u16) {
    let (year, month, day, hour, minute, second) = system_time_components(time);
    let dos_year = year.max(1980) - 1980;
    let date = ((dos_year as u16) << 9) | ((month as u16) << 5) | day as u16;
    let time = ((hour as u16) << 11) | ((minute as u16) << 5) | ((second / 2) as u16);
    (time, date)
}

pub(crate) fn timestamp_for_file() -> String {
    let (year, month, day, hour, minute, second) =
        system_time_components(std::time::SystemTime::now());
    format!("{year:04}-{month:02}-{day:02}_{hour:02}{minute:02}{second:02}")
}

pub(crate) fn now_iso() -> String {
    system_time_to_iso(std::time::SystemTime::now())
}

pub(crate) fn system_time_to_iso(time: std::time::SystemTime) -> String {
    let (year, month, day, hour, minute, second) = system_time_components(time);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

// Keeps backup timestamps independent from locale and external time crates.
fn system_time_components(time: std::time::SystemTime) -> (i32, u32, u32, u32, u32, u32) {
    let duration = time
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let seconds = duration.as_secs() as i64;
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    (
        year,
        month,
        day,
        (seconds_of_day / 3_600) as u32,
        ((seconds_of_day % 3_600) / 60) as u32,
        (seconds_of_day % 60) as u32,
    )
}

fn civil_from_days(days_since_unix_epoch: i64) -> (i32, u32, u32) {
    let z = days_since_unix_epoch + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 }.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096).div_euclid(365);
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2).div_euclid(153);
    let day = doy - (153 * mp + 2).div_euclid(5) + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if month <= 2 { 1 } else { 0 };
    (year as i32, month as u32, day as u32)
}
