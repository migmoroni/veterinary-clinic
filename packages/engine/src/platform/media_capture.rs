#[cfg(target_os = "linux")]
use tauri::Manager;
#[cfg(target_os = "linux")]
use webkit2gtk::glib::object::Cast;
#[cfg(target_os = "linux")]
use webkit2gtk::{
    DeviceInfoPermissionRequest, HardwareAccelerationPolicy, PermissionRequestExt, SettingsExt,
    UserMediaPermissionRequest, WebViewExt,
};

#[cfg(target_os = "linux")]
pub fn configure_media_capture<R: tauri::Runtime>(app: &tauri::App<R>) {
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

#[cfg(not(target_os = "linux"))]
pub fn configure_media_capture<R: tauri::Runtime>(_app: &tauri::App<R>) {}

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
