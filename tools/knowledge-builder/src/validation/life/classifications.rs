//! Validates optional life classifications, body intervals, origins, and size terms.

use super::{taxonomy::LifeIndex, *};
use crate::source::{LifeBodyMetricStage, LifeSexBodyMetrics};

pub(super) fn validate_life_classifications(
    life: &LifeIndex<'_>,
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let size_terms = taxonomies
        .get(&("life".to_string(), "size".to_string()))
        .map(|taxonomy| {
            taxonomy
                .terms
                .iter()
                .map(|term| term.key.as_str())
                .collect::<BTreeSet<_>>()
        })
        .unwrap_or_default();
    for (entry, entity) in life.values() {
        let Some(classifications) = &entity.classifications else {
            continue;
        };
        if classifications.origin_place_ids.is_none() && classifications.body_metrics.is_none() {
            diagnostics.push(Diagnostic::entity(
                entry,
                "classifications",
                "classifications must contain at least one field",
            ));
        }
        if let Some(origins) = &classifications.origin_place_ids {
            if !sorted(origins) {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "classifications.originPlaceIds",
                    "originPlaceIds must be strictly sorted",
                ));
            }
        }
        let Some(body) = &classifications.body_metrics else {
            continue;
        };
        if body.size.is_none() && body.stage_metrics.is_none() {
            diagnostics.push(Diagnostic::entity(
                entry,
                "classifications.bodyMetrics",
                "bodyMetrics must contain size, stageMetrics, or both",
            ));
        }
        if let Some(size) = &body.size {
            if !size_terms.contains(size.as_str()) {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "classifications.bodyMetrics.size",
                    format!("unresolved life:size term {size}"),
                ));
            }
        }
        if let Some(stages) = &body.stage_metrics {
            validate_profile(entry, "male", &stages.male, diagnostics);
            validate_profile(entry, "female", &stages.female, diagnostics);
        }
    }
}

fn validate_profile(
    entry: &SourceEntry,
    sex: &str,
    profile: &LifeSexBodyMetrics,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let [newborn_start, newborn_end] = profile.newborn.period;
    let [young_start, young_end] = profile.young.period;
    let [adult_start, adult_end] = profile.adult.period;
    let valid_periods = newborn_start.is_none()
        && adult_end.is_none()
        && newborn_end.is_some()
        && newborn_end == young_start
        && young_end == adult_start
        && newborn_end.is_some_and(|value| value.is_finite() && value > 0.0)
        && young_end.is_some_and(|value| {
            value.is_finite() && newborn_end.is_some_and(|start| value > start)
        });
    if !valid_periods {
        diagnostics.push(Diagnostic::entity(
            entry,
            format!("classifications.bodyMetrics.stageMetrics.{sex}"),
            "periods must follow [null,x], [x,y], [y,null] with 0 < x < y",
        ));
    }
    for (stage_name, stage) in [
        ("newborn", &profile.newborn),
        ("young", &profile.young),
        ("adult", &profile.adult),
    ] {
        validate_stage(entry, sex, stage_name, stage, diagnostics);
    }
}

fn validate_stage(
    entry: &SourceEntry,
    sex: &str,
    stage_name: &str,
    stage: &LifeBodyMetricStage,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if stage.weight.is_none() && stage.measure.is_none() {
        diagnostics.push(Diagnostic::entity(
            entry,
            format!("classifications.bodyMetrics.stageMetrics.{sex}.{stage_name}"),
            "stage must contain weight, measure, or both",
        ));
    }
    if let Some(weight) = &stage.weight {
        validate_metric_range(
            entry,
            sex,
            stage_name,
            "weight.live",
            weight.live,
            diagnostics,
        );
    }
    if let Some(measure) = &stage.measure {
        if measure.height.is_none() && measure.length.is_none() {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("classifications.bodyMetrics.stageMetrics.{sex}.{stage_name}.measure"),
                "measure must contain height, length, or both",
            ));
        }
        if let Some(height) = measure.height {
            validate_metric_range(
                entry,
                sex,
                stage_name,
                "measure.height",
                height,
                diagnostics,
            );
        }
        if let Some(length) = measure.length {
            validate_metric_range(
                entry,
                sex,
                stage_name,
                "measure.length",
                length,
                diagnostics,
            );
        }
    }
}

fn validate_metric_range(
    entry: &SourceEntry,
    sex: &str,
    stage: &str,
    metric: &str,
    range: [f64; 2],
    diagnostics: &mut Vec<Diagnostic>,
) {
    if !range.iter().all(|value| value.is_finite() && *value > 0.0) || range[0] > range[1] {
        diagnostics.push(Diagnostic::entity(
            entry,
            format!("classifications.bodyMetrics.stageMetrics.{sex}.{stage}.{metric}"),
            "metric range must be finite, positive, and ordered",
        ));
    }
}
