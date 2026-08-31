use tauri::Manager;
use vet_engine::storage::StorageManager;
use vet_engine::{distribution, platform, replication, storage};

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
            platform::system_fonts::list_system_fonts,
            platform::file_manager::open_file_manager,
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
            let storage =
                StorageManager::new(app.handle().clone()).map_err(std::io::Error::other)?;
            replication::start_background(storage.clone(), app.handle().clone());
            app.manage(storage);

            platform::media_capture::configure_media_capture(app);

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
