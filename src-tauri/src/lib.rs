mod commands;
mod database;
mod error;
mod launch_commands;
mod models;
mod resource_commands;
mod scan_commands;
mod settings_commands;
mod template_commands;

use database::Database;
use launch_commands::BatchLaunchState;
use scan_commands::ApplicationScanCache;
use settings_commands::TrayBehaviorState;
use std::sync::atomic::Ordering;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let database = Database::initialize(app.handle())?;
            let close_to_tray = database
                .0
                .lock()
                .ok()
                .and_then(|connection| settings_commands::read_close_to_tray(&connection).ok())
                .unwrap_or(true);
            app.manage(database);
            app.manage(BatchLaunchState::default());
            app.manage(ApplicationScanCache::default());
            app.manage(TrayBehaviorState::new(close_to_tray));

            let show_item = MenuItem::with_id(app, "show", "TaskDeck 열기", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "완전히 종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("TaskDeck")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => {
                        app.state::<TrayBehaviorState>()
                            .quitting
                            .store(true, Ordering::Relaxed);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        show_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let tray_state = window.state::<TrayBehaviorState>();
                if tray_state.close_to_tray.load(Ordering::Relaxed)
                    && !tray_state.quitting.load(Ordering::Relaxed)
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_workspaces,
            commands::get_workspace,
            commands::create_workspace,
            commands::update_workspace,
            commands::delete_workspace,
            commands::set_workspace_favorite,
            commands::duplicate_workspace,
            resource_commands::get_resources_by_workspace,
            resource_commands::create_resource,
            resource_commands::update_resource,
            resource_commands::delete_resource,
            resource_commands::reorder_resources,
            resource_commands::toggle_resource_enabled,
            launch_commands::validate_resource_target,
            launch_commands::launch_resource,
            launch_commands::open_external_website,
            launch_commands::launch_workspace_resources,
            settings_commands::get_launch_interval,
            settings_commands::set_launch_interval,
            settings_commands::get_close_to_tray,
            settings_commands::set_close_to_tray,
            settings_commands::get_language,
            settings_commands::set_language,
            scan_commands::scan_installed_applications,
            scan_commands::clear_application_scan_cache,
            scan_commands::inspect_application_target,
            scan_commands::detect_default_application_for_file,
            scan_commands::get_application_icon,
            scan_commands::inspect_dropped_resource_paths,
            template_commands::export_workspace_template,
            template_commands::validate_workspace_template,
            template_commands::import_workspace_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TaskDeck");
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
