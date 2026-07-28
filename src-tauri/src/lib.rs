mod distribution;
mod file_manager;
mod replication;
mod storage;
mod system_fonts;

use storage::StorageManager;
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
            if request
                .downcast_ref::<UserMediaPermissionRequest>()
                .is_some()
                || request
                    .downcast_ref::<DeviceInfoPermissionRequest>()
                    .is_some()
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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            system_fonts::list_system_fonts,
            file_manager::open_file_manager,
            storage::storage_select,
            storage::storage_execute,
            storage::storage_close,
            storage::storage_reopen,
            storage::save_media,
            storage::get_gallery_items,
            storage::get_media_path,
            storage::get_media_data,
            storage::update_media_sync_status,
            storage::mark_as_removed,
            storage::hard_delete_trash_item,
            storage::get_deletion_audit_logs,
            distribution::export_user_native_package,
            distribution::export_user_csv_package,
            distribution::import_user_native_package,
            distribution::import_user_csv_package,
            replication::orchestrator::set_backup_target_path,
            replication::orchestrator::get_backup_status,
            replication::orchestrator::restore_from_backup,
            replication::orchestrator::apply_inbound_patch
        ])
        .setup(|app| {
            let storage = StorageManager::new(app.handle().clone())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            replication::start_background(storage.clone(), app.handle().clone());
            app.manage(storage);

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
