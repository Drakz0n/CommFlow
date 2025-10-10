use tauri::AppHandle;
use crate::services::ClientService;
use crate::repository::client_repository::Client;

#[tauri::command]
pub async fn save_client(app_handle: AppHandle, client: Client) -> Result<(), String> {
    ClientService::create_client(app_handle, client).await
}

#[tauri::command]
pub async fn load_client(app_handle: AppHandle, client_id: String) -> Result<Option<Client>, String> {
    ClientService::get_client_by_id(app_handle, client_id).await
}

#[tauri::command]
pub async fn load_all_clients(app_handle: AppHandle) -> Result<Vec<Client>, String> {
    ClientService::get_all_clients(app_handle).await
}

#[tauri::command]
pub async fn delete_client(app_handle: AppHandle, client_id: String) -> Result<(), String> {
    ClientService::delete_client(app_handle, client_id).await
}
