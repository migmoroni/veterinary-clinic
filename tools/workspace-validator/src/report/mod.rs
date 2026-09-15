pub mod human;
pub mod json;

use crate::model::ValidationReport;

pub fn human(report: &ValidationReport) -> String {
    human::render(report)
}
pub fn json(report: &ValidationReport) -> Result<String, serde_json::Error> {
    json::render(report)
}
