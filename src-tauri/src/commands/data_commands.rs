use std::path::PathBuf;
use tauri::AppHandle;
use crate::repository::FileStorage;

#[tauri::command]
pub async fn get_data_directory_path(app_handle: AppHandle) -> Result<String, String> {
    let data_dir = FileStorage::get_app_data_dir(&app_handle)?;
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn export_all_data(app_handle: AppHandle) -> Result<String, String> {
    let data_dir = FileStorage::get_app_data_dir(&app_handle)?;
    
    // Create a ZIP archive or just return the data directory path for manual copy
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_data(app_handle: AppHandle, import_path: String) -> Result<(), String> {
    // Validate import path to prevent path traversal
    if import_path.is_empty() {
        return Err("Import path cannot be empty".to_string());
    }
    
    if import_path.contains("..") || import_path.contains("~") {
        return Err("Invalid import path - path traversal detected".to_string());
    }
    
    // Only allow paths within specific safe directories
    let import_dir = PathBuf::from(&import_path);
    if !import_dir.is_absolute() {
        return Err("Import path must be absolute".to_string());
    }
    
    // Verify the path exists and is a directory
    if !import_dir.exists() {
        return Err("Import directory does not exist".to_string());
    }
    
    if !import_dir.is_dir() {
        return Err("Import path must be a directory".to_string());
    }
    
    // Additional security: Check if import directory is within allowed locations
    let home_dir = std::env::var("HOME").unwrap_or_default();
    let allowed_prefixes = [
        "/tmp/",
        "/var/tmp/",
        &format!("{}/Downloads/", home_dir),
        &format!("{}/Documents/", home_dir),
        &format!("{}/Desktop/", home_dir),
    ];
    
    let import_path_str = import_dir.to_string_lossy();
    if !allowed_prefixes.iter().any(|prefix| import_path_str.starts_with(prefix)) {
        return Err("Import path not in allowed location".to_string());
    }
    
    let data_dir = FileStorage::get_app_data_dir(&app_handle)?;
    
    // Copy all files from import directory to data directory
    // This is a simple implementation - in production you might want more sophisticated merging
    let options = fs_extra::dir::CopyOptions::new().overwrite(true);
    fs_extra::dir::copy(&import_dir, &data_dir, &options)
        .map_err(|e| format!("Failed to import data: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}
