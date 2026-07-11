use tauri::Manager;
#[cfg(target_os = "linux")]
use webkit2gtk::glib::object::Cast;
#[cfg(target_os = "linux")]
use webkit2gtk::{
  DeviceInfoPermissionRequest, HardwareAccelerationPolicy, PermissionRequestExt, SettingsExt,
  UserMediaPermissionRequest, WebViewExt,
};

#[cfg(target_os = "linux")]
fn configure_linux_media_capture<R: tauri::Runtime>(webview_window: &tauri::WebviewWindow<R>) {
  let _ = webview_window.with_webview(|platform_webview| {
    let inner = platform_webview.inner();

    if let Some(settings) = inner.settings() {
      settings.set_enable_media(true);
      settings.set_enable_webrtc(true);
      settings.set_enable_media_stream(true);
      settings.set_hardware_acceleration_policy(HardwareAccelerationPolicy::Always);
    }

    inner.connect_permission_request(|_, request| {
      if request.downcast_ref::<UserMediaPermissionRequest>().is_some()
        || request.downcast_ref::<DeviceInfoPermissionRequest>().is_some()
      {
        request.allow();
        return true;
      }

      false
    });
  });
}

#[cfg(not(mobile))]
fn focus_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();

  #[cfg(not(mobile))]
  let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
    focus_main_window(app);
  }));

  builder
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![list_system_fonts, open_file_manager])
    .setup(|app| {
      #[cfg(target_os = "linux")]
      {
        let webview_windows = app.webview_windows();
        if webview_windows.is_empty() {
          if let Some(main) = app.get_webview_window("main") {
            configure_linux_media_capture(&main);
          }
        } else {
          for webview_window in webview_windows.into_values() {
            configure_linux_media_capture(&webview_window);
          }
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn list_system_fonts(extra_directories: Option<Vec<String>>) -> Vec<String> {
  let extra_directories = extra_directories.unwrap_or_default();
  let mut fonts = platform_system_fonts(&extra_directories);
  fonts.extend(extra_directory_fonts(&extra_directories));
  dedupe_and_sort(fonts.into_iter())
}

#[tauri::command]
fn open_file_manager(path: String) -> Result<(), String> {
  let trimmed_path = path.trim();
  if trimmed_path.is_empty() {
    return Err("path_empty".to_string());
  }

  let path = std::path::PathBuf::from(trimmed_path);
  let target = if path.is_file() {
    path
      .parent()
      .map(std::path::Path::to_path_buf)
      .unwrap_or(path)
  } else {
    path
  };

  if !target.exists() {
    return Err(format!("path_not_found: {}", target.display()));
  }

  open_file_manager_path(&target)
}

#[cfg(target_os = "linux")]
fn open_file_manager_path(path: &std::path::Path) -> Result<(), String> {
  std::process::Command::new("xdg-open")
    .arg(path)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("file_manager_open_failed: {error}"))
}

#[cfg(target_os = "macos")]
fn open_file_manager_path(path: &std::path::Path) -> Result<(), String> {
  std::process::Command::new("open")
    .arg(path)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("file_manager_open_failed: {error}"))
}

#[cfg(target_os = "windows")]
fn open_file_manager_path(path: &std::path::Path) -> Result<(), String> {
  std::process::Command::new("explorer")
    .arg(path)
    .spawn()
    .map(|_| ())
    .map_err(|error| format!("file_manager_open_failed: {error}"))
}

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
fn open_file_manager_path(_path: &std::path::Path) -> Result<(), String> {
  Err("file_manager_open_unsupported".to_string())
}

#[cfg(target_os = "linux")]
fn platform_system_fonts(extra_directories: &[String]) -> Vec<String> {
  let mut fonts = command_output("fc-list", &["--format=%{family}\n"])
    .map(|raw| parse_font_families(&raw))
    .unwrap_or_default();

  for directory in extra_directories {
    if let Some(raw) = command_output("fc-scan", &["--format=%{family}\n", directory.as_str()]) {
      fonts.extend(parse_font_families(&raw));
    }
  }

  dedupe_and_sort(fonts.into_iter())
}

#[cfg(target_os = "windows")]
fn platform_system_fonts(_extra_directories: &[String]) -> Vec<String> {
  let script = r#"
$paths = @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts','HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts')
foreach ($path in $paths) {
  if (Test-Path $path) {
    (Get-ItemProperty $path).PSObject.Properties |
      Where-Object { $_.Name -match '\((TrueType|OpenType)\)$' } |
      ForEach-Object { $_.Name -replace '\s+\((TrueType|OpenType)\)$','' }
  }
}
"#;

  command_output("powershell", &["-NoProfile", "-Command", script])
    .map(|raw| parse_font_families(&raw))
    .unwrap_or_default()
}

#[cfg(target_os = "macos")]
fn platform_system_fonts(_extra_directories: &[String]) -> Vec<String> {
  command_output("system_profiler", &["SPFontsDataType"])
    .map(|raw| parse_macos_font_families(&raw))
    .unwrap_or_default()
}

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
fn platform_system_fonts(_extra_directories: &[String]) -> Vec<String> {
  Vec::new()
}

fn command_output(command: &str, args: &[&str]) -> Option<String> {
  let output = std::process::Command::new(command).args(args).output().ok()?;
  if !output.status.success() {
    return None;
  }

  String::from_utf8(output.stdout).ok()
}

fn parse_font_families(raw: &str) -> Vec<String> {
  dedupe_and_sort(
    raw.lines()
      .flat_map(|line| line.split(','))
      .filter_map(normalize_font_name),
  )
}

fn extra_directory_fonts(directories: &[String]) -> Vec<String> {
  dedupe_and_sort(
    directories
      .iter()
      .flat_map(|directory| font_files_in_directory(std::path::Path::new(directory)))
      .filter_map(|path| path.file_stem().and_then(|stem| stem.to_str()).map(font_name_from_file_stem))
      .filter_map(|name| normalize_font_name(&name)),
  )
}

fn font_files_in_directory(directory: &std::path::Path) -> Vec<std::path::PathBuf> {
  let mut files = Vec::new();
  collect_font_files(directory, &mut files, 0);
  files
}

fn collect_font_files(directory: &std::path::Path, files: &mut Vec<std::path::PathBuf>, depth: usize) {
  if depth > 4 {
    return;
  }

  let Ok(entries) = std::fs::read_dir(directory) else {
    return;
  };

  for entry in entries.flatten() {
    let path = entry.path();
    if path.is_dir() {
      collect_font_files(&path, files, depth + 1);
    } else if is_font_file(&path) {
      files.push(path);
    }
  }
}

fn is_font_file(path: &std::path::Path) -> bool {
  path.extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| matches!(extension.to_lowercase().as_str(), "ttf" | "otf" | "ttc" | "otc"))
    .unwrap_or(false)
}

fn font_name_from_file_stem(value: &str) -> String {
  let mut name = value.replace(['_', '-'], " ");
  for suffix in [
    " Bold Italic",
    " Bold Oblique",
    " Semi Bold",
    " Semibold",
    " Extra Bold",
    " ExtraLight",
    " Extra Light",
    " Medium",
    " Regular",
    " Italic",
    " Oblique",
    " Light",
    " Bold",
    " Black",
    " Thin",
  ] {
    if let Some(trimmed) = name.strip_suffix(suffix) {
      name = trimmed.to_string();
      break;
    }
  }

  name
}

#[cfg(target_os = "macos")]
fn parse_macos_font_families(raw: &str) -> Vec<String> {
  dedupe_and_sort(raw.lines().filter_map(|line| {
    let trimmed = line.trim();
    let value = trimmed
      .strip_prefix("Family: ")
      .or_else(|| trimmed.strip_prefix("Full Name: "))?;
    normalize_font_name(value)
  }))
}

fn normalize_font_name(value: &str) -> Option<String> {
  let name = value.trim().trim_matches('"').trim();
  if name.is_empty() || name.starts_with('.') {
    return None;
  }

  Some(name.to_string())
}

fn dedupe_and_sort(fonts: impl Iterator<Item = String>) -> Vec<String> {
  let mut seen = std::collections::BTreeSet::new();
  let mut values = Vec::new();

  for font in fonts {
    if seen.insert(font.to_lowercase()) {
      values.push(font);
    }
  }

  values.sort_by_key(|font| font.to_lowercase());
  values
}
