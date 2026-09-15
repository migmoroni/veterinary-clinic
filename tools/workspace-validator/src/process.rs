use std::{
    io::Read,
    path::Path,
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::{Duration, Instant},
};

#[derive(Debug)]
pub struct ProcessOutput {
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
    pub timed_out: bool,
    pub interrupted: bool,
    pub stdout: String,
    pub stderr: String,
    pub stdout_truncated: bool,
    pub stderr_truncated: bool,
    pub start_error: Option<String>,
}

pub fn run(
    program: &str,
    args: &[String],
    cwd: &Path,
    timeout: Duration,
    limit: usize,
    cancelled: &Arc<AtomicBool>,
) -> ProcessOutput {
    let started = Instant::now();
    let mut command = Command::new(program);
    command
        .args(args)
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_process_group(&mut command);
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            return ProcessOutput {
                exit_code: None,
                duration_ms: started.elapsed().as_millis() as u64,
                timed_out: false,
                interrupted: false,
                stdout: String::new(),
                stderr: String::new(),
                stdout_truncated: false,
                stderr_truncated: false,
                start_error: Some(error.to_string()),
            }
        }
    };
    let stdout = child.stdout.take().expect("piped stdout");
    let stderr = child.stderr.take().expect("piped stderr");
    let stdout_reader = thread::spawn(move || capture_tail(stdout, limit));
    let stderr_reader = thread::spawn(move || capture_tail(stderr, limit));
    let mut timed_out = false;
    let mut interrupted = false;
    let status = loop {
        if cancelled.load(Ordering::SeqCst) {
            interrupted = true;
            terminate(&mut child);
            break child.wait().ok();
        }
        if started.elapsed() >= timeout {
            timed_out = true;
            terminate(&mut child);
            break child.wait().ok();
        }
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) => thread::sleep(Duration::from_millis(25)),
            Err(_) => break child.wait().ok(),
        }
    };
    let (stdout, stdout_truncated) = stdout_reader.join().unwrap_or_default();
    let (stderr, stderr_truncated) = stderr_reader.join().unwrap_or_default();
    ProcessOutput {
        exit_code: status.and_then(|status| status.code()),
        duration_ms: started.elapsed().as_millis() as u64,
        timed_out,
        interrupted,
        stdout,
        stderr,
        stdout_truncated,
        stderr_truncated,
        start_error: None,
    }
}

#[cfg(unix)]
fn configure_process_group(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    command.process_group(0);
}

#[cfg(not(unix))]
fn configure_process_group(_command: &mut Command) {}

#[cfg(unix)]
fn terminate(child: &mut std::process::Child) {
    unsafe extern "C" {
        fn kill(pid: i32, signal: i32) -> i32;
    }
    // The child starts its own process group, so the negated PID targets only
    // that group and also closes pipes inherited by its descendants.
    unsafe {
        kill(-(child.id() as i32), 9);
    }
    let _ = child.kill();
}

#[cfg(not(unix))]
fn terminate(child: &mut std::process::Child) {
    let _ = child.kill();
}

fn capture_tail(mut reader: impl Read, limit: usize) -> (String, bool) {
    let mut tail = Vec::new();
    let mut buffer = [0_u8; 8192];
    let mut truncated = false;
    loop {
        let read = match reader.read(&mut buffer) {
            Ok(0) | Err(_) => break,
            Ok(read) => read,
        };
        tail.extend_from_slice(&buffer[..read]);
        if tail.len() > limit {
            let excess = tail.len() - limit;
            tail.drain(..excess);
            truncated = true;
        }
    }
    (String::from_utf8_lossy(&tail).into_owned(), truncated)
}

#[cfg(all(test, unix))]
mod tests {
    use super::run;
    use std::{
        sync::{atomic::AtomicBool, Arc},
        time::Duration,
    };

    #[test]
    fn preserves_tail_and_times_out() {
        let cancelled = Arc::new(AtomicBool::new(false));
        let output = run(
            "/bin/sh",
            &["-c".into(), "printf 1234567890".into()],
            std::path::Path::new("/tmp"),
            Duration::from_secs(2),
            4,
            &cancelled,
        );
        assert_eq!(output.stdout, "7890");
        assert!(output.stdout_truncated);
        let output = run(
            "/bin/sh",
            &["-c".into(), "sleep 2".into()],
            std::path::Path::new("/tmp"),
            Duration::from_millis(10),
            4096,
            &cancelled,
        );
        assert!(output.timed_out);
    }

    #[test]
    fn captures_large_stdout_and_stderr_without_deadlock() {
        let cancelled = Arc::new(AtomicBool::new(false));
        let output = run(
            "/bin/sh",
            &[
                "-c".into(),
                "i=0; while [ \"$i\" -lt 2000 ]; do printf 'stdout-%04d\\n' \"$i\"; printf 'stderr-%04d\\n' \"$i\" >&2; i=$((i+1)); done".into(),
            ],
            std::path::Path::new("/tmp"),
            Duration::from_secs(5),
            4096,
            &cancelled,
        );

        assert_eq!(output.exit_code, Some(0));
        assert!(output.stdout_truncated);
        assert!(output.stderr_truncated);
        assert!(output.stdout.len() <= 4096);
        assert!(output.stderr.len() <= 4096);
        assert!(output.stdout.ends_with("stdout-1999\n"));
        assert!(output.stderr.ends_with("stderr-1999\n"));
    }
}
