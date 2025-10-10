use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use tauri::AppHandle;
use super::file_storage::FileStorage;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commission {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub title: String,
    pub description: String,
    pub price_cents: i64,
    pub payment_status: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub images: Vec<String>,
}

pub struct CommissionRepository;

impl CommissionRepository {
    pub async fn save(app_handle: &AppHandle, commission: &Commission) -> Result<(), String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        FileStorage::ensure_data_folders(&data_dir)?;
        
        // Determine folder based on status
        let folder_name = if commission.status == "completed" { "history" } else { "pendings" };
        let commissions_dir = data_dir.join(folder_name);
        
        // Create client subdirectory
        let sanitized_client_name = FileStorage::sanitize_filename(&commission.client_name);
        let client_dir = commissions_dir.join(&sanitized_client_name);
        
        // Create commission file with sanitized filename
        let sanitized_timestamp = FileStorage::sanitize_timestamp(&commission.created_at);
        let commission_file = client_dir.join(format!("{}_{}.json", commission.id, sanitized_timestamp));
        
        let commission_json = serde_json::to_string_pretty(commission)
            .map_err(|e| format!("Failed to serialize commission: {}", e))?;
        
        FileStorage::write_json_file(&commission_file, &commission_json)?;
        
        Ok(())
    }

    pub async fn find_by_status(app_handle: &AppHandle, status: &str) -> Result<Vec<Commission>, String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        FileStorage::ensure_data_folders(&data_dir)?;
        
        // Determine folder based on status
        let folder_name = if status == "completed" { "history" } else { "pendings" };
        let commissions_dir = data_dir.join(folder_name);
        
        let mut commissions = Vec::new();
        
        if commissions_dir.exists() {
            let entries = fs::read_dir(&commissions_dir)
                .map_err(|e| format!("Failed to read commissions directory: {}", e))?;
            
            for entry in entries {
                let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
                let client_dir = entry.path();
                
                if client_dir.is_dir() {
                    let client_json_contents = FileStorage::read_directory_json_files(&client_dir)?;
                    
                    for content in client_json_contents {
                        match Self::parse_commission(&content) {
                            Ok(commission) => commissions.push(commission),
                            Err(e) => eprintln!("Failed to parse commission: {}", e),
                        }
                    }
                }
            }
        }
        
        Ok(commissions)
    }

    pub async fn move_commission(
        app_handle: &AppHandle,
        commission_id: &str,
        from_status: &str,
        to_status: &str,
    ) -> Result<(), String> {
        // Find the commission in the from folder
        let commissions = Self::find_by_status(app_handle, from_status).await?;
        let commission = commissions
            .into_iter()
            .find(|c| c.id == commission_id)
            .ok_or_else(|| format!("Commission {} not found in {} folder", commission_id, from_status))?;

        // Update status and timestamp
        let mut updated_commission = commission;
        updated_commission.status = to_status.to_string();
        updated_commission.updated_at = chrono::Utc::now().to_rfc3339();

        // Save to new location
        Self::save(app_handle, &updated_commission).await?;

        // Remove from old location
        Self::delete_by_id_and_status(app_handle, commission_id, from_status).await?;

        Ok(())
    }

    pub async fn delete_by_id_and_status(
        app_handle: &AppHandle,
        commission_id: &str,
        status: &str,
    ) -> Result<(), String> {
        let data_dir = FileStorage::get_app_data_dir(app_handle)?;
        
        let folder_name = if status == "completed" { "history" } else { "pendings" };
        let commissions_dir = data_dir.join(folder_name);
        
        if commissions_dir.exists() {
            let entries = fs::read_dir(&commissions_dir)
                .map_err(|e| format!("Failed to read commissions directory: {}", e))?;
            
            for entry in entries {
                let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
                let client_dir = entry.path();
                
                if client_dir.is_dir() {
                    let client_entries = fs::read_dir(&client_dir)
                        .map_err(|e| format!("Failed to read client directory: {}", e))?;
                    
                    for client_entry in client_entries {
                        let client_entry = client_entry.map_err(|e| format!("Failed to read client entry: {}", e))?;
                        let file_path = client_entry.path();
                        
                        if file_path.extension().and_then(|s| s.to_str()) == Some("json") {
                            if let Ok(commission_json) = fs::read_to_string(&file_path) {
                                if let Ok(commission) = serde_json::from_str::<Commission>(&commission_json) {
                                    if commission.id == commission_id {
                                        FileStorage::delete_file(&file_path)?;
                                        return Ok(());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Err("Commission not found".to_string())
    }

    fn parse_commission(json: &str) -> Result<Commission, String> {
        let v: Value = serde_json::from_str(json).map_err(|e| format!("Failed to parse commission JSON: {}", e))?;
        
        // Detect legacy price (float) -> convert
        let price_cents = if let Some(pc) = v.get("price_cents").and_then(|n| n.as_i64()) {
            pc
        } else if let Some(pf) = v.get("price").and_then(|n| n.as_f64()) {
            (pf * 100.0).round() as i64
        } else {
            return Err("Missing price or price_cents".into());
        };
        
        Ok(Commission {
            id: v.get("id").and_then(|s| s.as_str()).unwrap_or_default().to_string(),
            client_id: v.get("client_id").and_then(|s| s.as_str()).unwrap_or_default().to_string(),
            client_name: v.get("client_name").and_then(|s| s.as_str()).unwrap_or_default().to_string(),
            title: v.get("title").and_then(|s| s.as_str()).unwrap_or_default().to_string(),
            description: v.get("description").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            price_cents,
            payment_status: v.get("payment_status").and_then(|s| s.as_str()).unwrap_or("Not Paid").to_string(),
            status: v.get("status").and_then(|s| s.as_str()).unwrap_or("pending").to_string(),
            created_at: v.get("created_at").and_then(|s| s.as_str()).unwrap_or_default().to_string(),
            updated_at: v.get("updated_at").and_then(|s| s.as_str()).unwrap_or_default().to_string(),
            images: v.get("images").and_then(|arr| arr.as_array()).map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect()).unwrap_or_else(Vec::new)
        })
    }
}
