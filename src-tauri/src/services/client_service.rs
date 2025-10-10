use tauri::AppHandle;
use crate::repository::ClientRepository;
use crate::repository::client_repository::Client;
use super::validation_service::ValidationService;

pub struct ClientService;

impl ClientService {
    pub async fn create_client(
        app_handle: AppHandle,
        client: Client,
    ) -> Result<(), String> {
        // Validate all client fields
        ValidationService::validate_id(&client.id)?;
        ValidationService::validate_name(&client.name, "Client name")?;
        ValidationService::validate_email(&client.email)?;
        ValidationService::validate_contact(&client.contact)?;
        
        // Additional timestamp validation
        if client.created_at.is_empty() || client.updated_at.is_empty() {
            return Err("Timestamps cannot be empty".to_string());
        }
        
        ClientRepository::save(&app_handle, &client).await
    }

    pub async fn get_client_by_id(
        app_handle: AppHandle,
        client_id: String,
    ) -> Result<Option<Client>, String> {
        ValidationService::validate_id(&client_id)?;
        ClientRepository::find_by_id(&app_handle, &client_id).await
    }

    pub async fn get_all_clients(app_handle: AppHandle) -> Result<Vec<Client>, String> {
        ClientRepository::find_all(&app_handle).await
    }

    pub async fn delete_client(
        app_handle: AppHandle,
        client_id: String,
    ) -> Result<(), String> {
        ValidationService::validate_id(&client_id)?;
        ClientRepository::delete(&app_handle, &client_id).await
    }
}
