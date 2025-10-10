use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

pub struct FileStorage;

impl FileStorage {
    pub fn get_app_data_dir(_app_handle: &AppHandle) -> Result<PathBuf, String> {
        // Get the directory where the executable is located
        let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
        let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
        
        // Create Data folder in the same directory as the executable
        let data_dir = exe_dir.join("Data");
        
        // Create the Data directory if it doesn't exist
        fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;
        
        Ok(data_dir)
    }

    pub fn ensure_data_folders(data_dir: &PathBuf) -> Result<(), String> {
        let folders = ["clients", "pendings", "history"];
        
        for folder in folders.iter() {
            let folder_path = data_dir.join(folder);
            fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create {} folder: {}", folder, e))?;
        }
        
        Ok(())
    }

    pub fn read_directory_json_files(dir_path: &PathBuf) -> Result<Vec<String>, String> {
        let mut json_contents = Vec::new();

        if dir_path.exists() {
            let entries = fs::read_dir(dir_path)
                .map_err(|e| format!("Failed to read directory: {}", e))?;
            
            for entry in entries {
                let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
                let path = entry.path();
                
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    let content = fs::read_to_string(&path)
                        .map_err(|e| format!("Failed to read file: {}", e))?;
                    json_contents.push(content);
                }
            }
        }

        Ok(json_contents)
    }

    pub fn write_json_file(file_path: &PathBuf, json_content: &str) -> Result<(), String> {
        // Ensure directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        fs::write(file_path, json_content)
            .map_err(|e| format!("Failed to write file: {}", e))?;

        Ok(())
    }

    pub fn delete_file(file_path: &PathBuf) -> Result<(), String> {
        if file_path.exists() {
            fs::remove_file(file_path)
                .map_err(|e| format!("Failed to delete file: {}", e))?;
        }
        Ok(())
    }

    pub fn sanitize_filename(name: &str) -> String {
        name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_")
    }

    pub fn sanitize_timestamp(timestamp: &str) -> String {
        timestamp.replace([':', '/', '\\', '*', '?', '"', '<', '>', '|'], "-")
    }
}
