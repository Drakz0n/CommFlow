mod commands;
mod repository;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::save_client,
      commands::load_client,
      commands::load_all_clients,
      commands::delete_client,
      commands::save_commission,
      commands::load_commissions,
      commands::move_commission,
      commands::delete_commission,
      commands::save_commission_image,
      commands::get_data_directory_path,
      commands::export_all_data,
      commands::import_data,
      commands::get_app_version
    ])
    .setup(|app| {
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
