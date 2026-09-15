use super::format_duration;
use crate::{
    model::{CheckConfig, CheckResult, Status},
    progress::{ProgressPhase, ProgressReporter},
};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use std::{path::Path, time::Duration};

pub struct TerminalProgress {
    progress: MultiProgress,
    overall: Option<ProgressBar>,
    active: Option<ProgressBar>,
    completed: Vec<ProgressBar>,
    finished: bool,
}

impl TerminalProgress {
    pub fn new() -> Self {
        Self {
            progress: MultiProgress::new(),
            overall: None,
            active: None,
            completed: Vec::new(),
            finished: false,
        }
    }

    fn begin(&mut self, message: impl Into<String>) {
        self.remove_active();
        let spinner = self.progress.add(ProgressBar::new_spinner());
        spinner.set_style(
            ProgressStyle::with_template(
                "  {spinner:.cyan} {prefix:.cyan.bold} {wide_msg}  {elapsed_precise}",
            )
            .expect("active progress template is valid"),
        );
        spinner.set_prefix(format!("{:<7}", "RUN"));
        spinner.set_message(message.into());
        spinner.enable_steady_tick(Duration::from_millis(80));
        spinner.tick();
        self.active = Some(spinner);
    }

    fn complete_active(&mut self, status: Status, message: String, duration_ms: u64) {
        let Some(progress) = self.active.take() else {
            return;
        };
        progress.disable_steady_tick();
        progress.set_style(completed_style(status));
        progress.set_prefix(format!("{:<7}", status_label(status)));
        progress.set_message(format!("{message} ({})", format_duration(duration_ms)));
        progress.finish();
        self.completed.push(progress);
    }

    fn remove_active(&mut self) {
        if let Some(progress) = self.active.take() {
            progress.disable_steady_tick();
            self.progress.remove(&progress);
        }
    }

    fn clear(&mut self) {
        if self.finished {
            return;
        }
        self.remove_active();
        if let Some(overall) = self.overall.take() {
            overall.finish();
        }
        let _ = self.progress.clear();
        self.completed.clear();
        self.finished = true;
    }
}

impl Default for TerminalProgress {
    fn default() -> Self {
        Self::new()
    }
}

impl ProgressReporter for TerminalProgress {
    fn validation_started(&mut self, suite: &str, _workspace: &Path, check_count: usize) {
        let overall = self
            .progress
            .add(ProgressBar::new(check_count.try_into().unwrap_or(u64::MAX)));
        overall.set_style(
            ProgressStyle::with_template(
                "{prefix:.bold} [{bar:32.cyan/blue}] {pos:>2}/{len:2} {wide_msg}  {elapsed_precise}",
            )
            .expect("overall progress template is valid")
            .progress_chars("##-"),
        );
        overall.set_prefix("VALIDATE");
        overall.set_message(format!("suite {suite}"));
        self.overall = Some(overall);
    }

    fn phase_started(&mut self, phase: ProgressPhase) {
        self.begin(active_phase_label(phase));
    }

    fn phase_finished(&mut self, phase: ProgressPhase, status: Status) {
        let duration_ms = self
            .active
            .as_ref()
            .map(|progress| progress.elapsed().as_millis() as u64)
            .unwrap_or_default();
        self.complete_active(status, completed_phase_label(phase).into(), duration_ms);
    }

    fn check_started(&mut self, position: usize, total: usize, check: &CheckConfig) {
        self.begin(format!("[{position}/{total}] {}", check.label));
    }

    fn check_finished(&mut self, position: usize, total: usize, result: &CheckResult) {
        self.complete_active(
            result.status,
            format!("[{position}/{total}] {}", result.label),
            result.duration_ms,
        );
        if let Some(overall) = &self.overall {
            overall.inc(1);
        }
    }

    fn validation_finished(&mut self) {
        self.clear();
    }
}

impl Drop for TerminalProgress {
    fn drop(&mut self) {
        self.clear();
    }
}

fn active_phase_label(phase: ProgressPhase) -> &'static str {
    match phase {
        ProgressPhase::Prerequisites => "Checking required tools",
        ProgressPhase::InitialRepositorySnapshot => "Capturing initial repository state",
        ProgressPhase::FinalRepositorySnapshot => "Checking repository integrity",
    }
}

fn completed_phase_label(phase: ProgressPhase) -> &'static str {
    match phase {
        ProgressPhase::Prerequisites => "Required tools",
        ProgressPhase::InitialRepositorySnapshot => "Initial repository state",
        ProgressPhase::FinalRepositorySnapshot => "Repository integrity",
    }
}

fn completed_style(status: Status) -> ProgressStyle {
    let template = match status {
        Status::Pass => "    {prefix:.green.bold} {wide_msg}",
        Status::Fail => "    {prefix:.red.bold} {wide_msg}",
        Status::Blocked => "    {prefix:.yellow.bold} {wide_msg}",
        Status::Skipped => "    {prefix:.dim} {wide_msg}",
    };
    ProgressStyle::with_template(template).expect("completed progress template is valid")
}

fn status_label(status: Status) -> &'static str {
    match status {
        Status::Pass => "PASS",
        Status::Fail => "FAIL",
        Status::Blocked => "BLOCKED",
        Status::Skipped => "SKIPPED",
    }
}
