use tauri::AppHandle;
use crate::services::{CommissionService, ImageService};
use crate::repository::commission_repository::Commission;

#[tauri::command]
pub async fn save_commission(app_handle: AppHandle, commission: Commission) -> Result<(), String> {
    CommissionService::create_commission(app_handle, commission).await
}

#[tauri::command]
pub async fn load_commissions(app_handle: AppHandle, status: String) -> Result<Vec<Commission>, String> {
    CommissionService::get_commissions_by_status(app_handle, status).await
}

#[tauri::command]
pub async fn move_commission(
    app_handle: AppHandle,
    commission_id: String,
    from_status: String,
    to_status: String,
) -> Result<(), String> {
    CommissionService::move_commission(app_handle, commission_id, from_status, to_status).await
}

#[tauri::command]
pub async fn delete_commission(
    app_handle: AppHandle,
    commission_id: String,
    status: String,
) -> Result<(), String> {
    CommissionService::delete_commission(app_handle, commission_id, status).await
}

#[tauri::command]
pub async fn save_commission_image(
    app_handle: AppHandle,
    commission_id: String,
    client_name: String,
    image_data: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    ImageService::save_commission_image(app_handle, commission_id, client_name, image_data, filename).await
}
