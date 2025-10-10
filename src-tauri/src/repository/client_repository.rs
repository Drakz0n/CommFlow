use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use super::file_storage::FileStorage;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub email: String,
    pub contact: String,
    pub profile_image: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct ClientRepository;

impl ClientRepository {
    pub async fn save(app_handle: &AppHandle, client: &Client) -> Result<(), String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        FileStorage::ensure_data_folders(&data_dir)?;
        
        let clients_dir = data_dir.join("clients");
        let client_file = clients_dir.join(format!("{}.json", client.id));
        
        let client_json = serde_json::to_string_pretty(client)
            .map_err(|e| format!("Failed to serialize client: {}", e))?;
        
        FileStorage::write_json_file(&client_file, &client_json)?;
        
        Ok(())
    }

    pub async fn find_by_id(app_handle: &AppHandle, client_id: &str) -> Result<Option<Client>, String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        let clients_dir = data_dir.join("clients");
        let client_file = clients_dir.join(format!("{}.json", client_id));
        
        if !client_file.exists() {
            return Ok(None);
        }
        
        let client_json = std::fs::read_to_string(&client_file)
            .map_err(|e| format!("Failed to read client file: {}", e))?;
        
        let client: Client = serde_json::from_str(&client_json)
            .map_err(|e| format!("Failed to deserialize client: {}", e))?;
        
        Ok(Some(client))
    }

    pub async fn find_all(app_handle: &AppHandle) -> Result<Vec<Client>, String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        FileStorage::ensure_data_folders(&data_dir)?;
        
        let clients_dir = data_dir.join("clients");
        let json_contents = FileStorage::read_directory_json_files(&clients_dir)?;
        
        let mut clients = Vec::new();
        for content in json_contents {
            match serde_json::from_str::<Client>(&content) {
                Ok(client) => clients.push(client),
                Err(e) => eprintln!("Failed to parse client: {}", e),
            }
        }
        
        Ok(clients)
    }

    pub async fn delete(app_handle: &AppHandle, client_id: &str) -> Result<(), String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        let clients_dir = data_dir.join("clients");
        let client_file = clients_dir.join(format!("{}.json", client_id));
        
        FileStorage::delete_file(&client_file)?;
        
        Ok(())
    }
}
