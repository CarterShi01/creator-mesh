// CreatorMesh Console — Tauri Desktop Shell
// Safe, read-only commands only. No filesystem writes, no shell exec.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_platform_label() -> String {
    #[cfg(target_os = "macos")]
    return "macOS Desktop".to_string();
    #[cfg(target_os = "windows")]
    return "Windows Desktop".to_string();
    #[cfg(target_os = "linux")]
    return "Linux Desktop".to_string();
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return "Desktop".to_string();
}

#[tauri::command]
fn get_desktop_capabilities() -> serde_json::Value {
    serde_json::json!({
        "localShell": false,
        "filesystem": false,
        "governedWorkflowApi": false
    })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_platform_label,
            get_desktop_capabilities,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CreatorMesh Console");
}
