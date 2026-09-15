use crate::{
    config,
    error::ValidatorError,
    model::{Config, ValidationReport},
    report, runner,
};
use clap::{Parser, Subcommand, ValueEnum};
use schemars::schema_for;
use std::{
    path::PathBuf,
    process::ExitCode,
    sync::{atomic::AtomicBool, Arc},
};

#[derive(Parser)]
#[command(
    name = "workspace-validator",
    version,
    about = "Runs declarative workspace validation pipelines"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Validate {
        suite: Option<String>,
        #[arg(long)]
        config: Option<PathBuf>,
        #[arg(long, value_enum, default_value = "human")]
        format: Format,
    },
    Check {
        check_id: String,
        #[arg(long)]
        config: Option<PathBuf>,
        #[arg(long, value_enum, default_value = "human")]
        format: Format,
    },
    List {
        #[arg(long)]
        config: Option<PathBuf>,
    },
    Schema {
        #[arg(value_enum)]
        contract: Contract,
    },
}

#[derive(Clone, Copy, ValueEnum)]
enum Format {
    Human,
    Json,
}
#[derive(Clone, Copy, ValueEnum)]
enum Contract {
    Config,
    Report,
}

pub fn run_cli() -> ExitCode {
    let cli = match Cli::try_parse() {
        Ok(cli) => cli,
        Err(error) => {
            let _ = error.print();
            return ExitCode::from(3);
        }
    };
    match execute(cli) {
        Ok(code) => ExitCode::from(code as u8),
        Err((error, code)) => {
            eprintln!("workspace-validator: {error}");
            ExitCode::from(code)
        }
    }
}

fn execute(cli: Cli) -> Result<i32, (ValidatorError, u8)> {
    if let Command::Schema { contract } = cli.command {
        let schema = match contract {
            Contract::Config => schema_for!(Config),
            Contract::Report => schema_for!(ValidationReport),
        };
        println!(
            "{}",
            serde_json::to_string_pretty(&schema)
                .map_err(|error| (ValidatorError::Internal(error.to_string()), 4))?
        );
        return Ok(0);
    }
    let current = std::env::current_dir()
        .map_err(|error| (ValidatorError::Internal(error.to_string()), 4))?;
    let explicit = match &cli.command {
        Command::Validate { config, .. }
        | Command::Check { config, .. }
        | Command::List { config } => config.as_deref(),
        Command::Schema { .. } => unreachable!(),
    };
    let loaded = config::load(explicit, &current).map_err(|error| (error, 3))?;
    match cli.command {
        Command::List { .. } => {
            println!("Configuration: {}", loaded.path.display());
            println!("Suites:");
            for suite in loaded.suites.values() {
                println!("  {} - {}", suite.id, suite.label);
            }
            println!("Checks:");
            for check in loaded.checks.values() {
                println!("  {} - {}", check.id, check.label);
            }
            println!("Tools:");
            for tool in loaded.tools.values() {
                println!("  {} - {}", tool.id, tool.program);
            }
            Ok(0)
        }
        Command::Validate { suite, format, .. } => {
            let (name, checks) = runner::suite_checks(&loaded, suite.as_deref())
                .map_err(|detail| (ValidatorError::invalid(&loaded.path, detail), 3))?;
            execute_run(&loaded, name, checks, format)
        }
        Command::Check {
            check_id, format, ..
        } => {
            let (name, checks) = runner::single_check(&loaded, &check_id)
                .map_err(|detail| (ValidatorError::invalid(&loaded.path, detail), 3))?;
            execute_run(&loaded, name, checks, format)
        }
        Command::Schema { .. } => unreachable!(),
    }
}

fn execute_run(
    loaded: &config::LoadedConfig,
    name: String,
    checks: Vec<String>,
    format: Format,
) -> Result<i32, (ValidatorError, u8)> {
    let cancelled = Arc::new(AtomicBool::new(false));
    let signal = cancelled.clone();
    ctrlc::set_handler(move || signal.store(true, std::sync::atomic::Ordering::SeqCst)).map_err(
        |error| {
            (
                ValidatorError::Internal(format!("cannot install signal handler: {error}")),
                4,
            )
        },
    )?;
    let outcome = runner::run(loaded, name, checks, cancelled);
    let rendered = match format {
        Format::Human => report::human(&outcome.report),
        Format::Json => report::json(&outcome.report)
            .map_err(|error| (ValidatorError::Internal(error.to_string()), 4))?,
    };
    println!("{rendered}");
    Ok(if outcome.interrupted {
        130
    } else {
        outcome.report.summary.exit_code()
    })
}
