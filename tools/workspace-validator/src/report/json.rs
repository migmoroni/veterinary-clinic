use crate::model::ValidationReport;

pub fn render(report: &ValidationReport) -> Result<String, serde_json::Error> {
    serde_json::to_string_pretty(report)
}
