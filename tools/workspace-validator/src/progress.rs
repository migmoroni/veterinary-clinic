use crate::model::{CheckConfig, CheckResult};
use std::path::Path;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProgressPhase {
    Prerequisites,
    InitialRepositorySnapshot,
    FinalRepositorySnapshot,
}

pub trait ProgressReporter {
    fn validation_started(&mut self, _suite: &str, _workspace: &Path, _check_count: usize) {}

    fn phase_started(&mut self, _phase: ProgressPhase) {}

    fn phase_finished(&mut self, _phase: ProgressPhase, _status: crate::model::Status) {}

    fn check_started(&mut self, _position: usize, _total: usize, _check: &CheckConfig) {}

    fn check_finished(&mut self, _position: usize, _total: usize, _result: &CheckResult) {}

    fn validation_finished(&mut self) {}
}

#[derive(Default)]
pub struct SilentProgress;

impl ProgressReporter for SilentProgress {}
