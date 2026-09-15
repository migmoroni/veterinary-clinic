pub mod human;
pub mod json;
pub mod terminal;

use crate::model::ValidationReport;

pub fn human(report: &ValidationReport) -> String {
    human::render(report)
}
pub fn json(report: &ValidationReport) -> Result<String, serde_json::Error> {
    json::render(report)
}

pub(crate) fn format_duration(milliseconds: u64) -> String {
    if milliseconds < 1_000 {
        format!("{milliseconds} ms")
    } else if milliseconds < 60_000 {
        format!("{:.2} s", milliseconds as f64 / 1_000.0)
    } else {
        let minutes = milliseconds / 60_000;
        let seconds = (milliseconds % 60_000) as f64 / 1_000.0;
        format!("{minutes} min {seconds:.1} s")
    }
}

#[cfg(test)]
mod tests {
    use super::format_duration;

    #[test]
    fn formats_short_and_long_durations() {
        assert_eq!(format_duration(25), "25 ms");
        assert_eq!(format_duration(1_250), "1.25 s");
        assert_eq!(format_duration(65_400), "1 min 5.4 s");
    }
}
