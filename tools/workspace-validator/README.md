# Workspace Validator

`workspace-validator` is a synchronous, reusable Rust CLI for declarative
validation pipelines. It checks tool versions, runs checks sequentially without
a shell, respects dependency DAGs and timeouts, and emits human or versioned
JSON reports. It never installs dependencies, fixes files, starts servers, or
cleans subprocess output.

## Build and run

```sh
cargo build -p workspace-validator
cargo run -p workspace-validator -- validate
cargo run -p workspace-validator -- validate fast --format json
cargo run -p workspace-validator -- check lint
cargo run -p workspace-validator -- list
```

The CLI discovers `.validation/config.json` from the current directory upward.
Use `--config path/to/config.json` to select it explicitly. It can be called
directly, from Cargo, npm/pnpm scripts, or CI.

## Configuration

Schema version 1 declares tools, checks, suites, and an optional Git repository
provider. Tool and check dependency graphs must be acyclic. A suite must include
every transitive check dependency before its consumer.

```json
{
  "$schema": "../tools/workspace-validator/schemas/config.schema.json",
  "schemaVersion": 1,
  "workspaceRoot": "..",
  "defaultSuite": "all",
  "outputLimitBytes": 4096,
  "tools": [{
    "id": "rustc",
    "program": "rustc",
    "requiresTools": [],
    "versionArgs": ["--version"],
    "versionParser": "firstSemver"
  }],
  "checks": [{
    "id": "compile",
    "label": "Compile",
    "toolId": "rustc",
    "args": ["--version"],
    "workingDirectory": ".",
    "requiresTools": [],
    "dependsOn": [],
    "timeoutSeconds": 30
  }],
  "suites": [{"id": "all", "label": "All", "checks": ["compile"]}]
}
```

Paths are canonicalized and check directories cannot escape `workspaceRoot`.
Programs and arguments are passed literally to native subprocesses. Missing,
unreadable, or out-of-range tools produce `BLOCKED`; failed prerequisites make
dependents `SKIPPED`; nonzero exits and timeouts produce `FAIL`. Independent
checks continue.

An initially dirty Git tree is accepted. When repository mutation detection is
enabled, only Git-visible changes introduced during validation fail the
synthetic `repository.integrity` check; nothing is restored automatically.

## Reports and exit codes

Human output is the default. `--format json` reserves stdout for one JSON
document. `schema config` and `schema report` print the supported schemas.
Checked-in schemas under `schemas/` correspond to `schemaVersion: 1`; breaking
contract changes require a new schema version.

| Code | Meaning |
| ---: | --- |
| 0 | all selected checks passed |
| 1 | at least one check failed |
| 2 | blocked or skipped, with no failure |
| 3 | invalid CLI usage or configuration |
| 4 | internal executor/report failure |
| 130 | interrupted by the user |
