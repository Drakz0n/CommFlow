use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use log::{info, warn, error};
use regex::Regex;

// Security validation constants
const MAX_ID_LENGTH: usize = 64;
const MAX_NAME_LENGTH: usize = 255;
const MAX_DESCRIPTION_LENGTH: usize = 10000;
const MAX_EMAIL_LENGTH: usize = 320;
const MAX_CONTACT_LENGTH: usize = 50;
const MAX_FILENAME_LENGTH: usize = 255;

// Input validation functions
fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() {
        return Err("ID cannot be empty".to_string());
    }
    if id.len() > MAX_ID_LENGTH {
        return Err(format!("ID too long (max {} chars)", MAX_ID_LENGTH));
    }
    
    // Only allow alphanumeric characters and underscores
    let re = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
    if !re.is_match(id) {
        return Err("ID contains invalid characters (only alphanumeric and underscore allowed)".to_string());
    }
    
    Ok(())
}

fn validate_name(name: &str, field_name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(format!("{} cannot be empty", field_name));
    }
    if name.len() > MAX_NAME_LENGTH {
        return Err(format!("{} too long (max {} chars)", field_name, MAX_NAME_LENGTH));
    }
    
    // Prevent path traversal and dangerous characters
    if name.contains("..") || name.contains("/") || name.contains("\\") || 
       name.contains("<") || name.contains(">") || name.contains("|") ||
       name.contains(":") || name.contains("*") || name.contains("?") ||
       name.contains("\"") {
        return Err(format!("{} contains invalid characters", field_name));
    }
    
    Ok(())
}

fn validate_email(email: &str) -> Result<(), String> {
    if email.is_empty() {
        return Ok(()); // Email is optional
    }
    if email.len() > MAX_EMAIL_LENGTH {
        return Err("Email too long".to_string());
    }
    
    // Basic email validation - but be more lenient for contact info
    let re = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    if !re.is_match(email) {
        // If it doesn't look like an email, treat it as contact info instead
        // Only throw error if it contains dangerous characters
        if email.contains("<") || email.contains(">") || email.contains("&") || 
           email.contains("\"") || email.contains("'") || email.contains("`") {
            return Err("Email contains invalid characters".to_string());
        }
        // Otherwise, let it pass - it might be a username or other contact info
    }
    
    Ok(())
}

fn validate_contact(contact: &str) -> Result<(), String> {
    if contact.is_empty() {
        return Ok(()); // Contact is optional
    }
    if contact.len() > MAX_CONTACT_LENGTH {
        return Err("Contact too long".to_string());
    }
    
    // Basic sanitization - remove dangerous characters
    if contact.contains("<") || contact.contains(">") || contact.contains("&") {
        return Err("Contact contains invalid characters".to_string());
    }
    
    Ok(())
}

fn validate_description(description: &str) -> Result<(), String> {
    if description.len() > MAX_DESCRIPTION_LENGTH {
        return Err(format!("Description too long (max {} chars)", MAX_DESCRIPTION_LENGTH));
    }
    
    // Basic XSS prevention
    if description.contains("<script") || description.contains("javascript:") || 
       description.contains("onload=") || description.contains("onerror=") {
        return Err("Description contains potentially dangerous content".to_string());
    }
    
    Ok(())
}

fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }
    if filename.len() > MAX_FILENAME_LENGTH {
        return Err("Filename too long".to_string());
    }
    
    // Prevent path traversal and dangerous characters
    if filename.contains("..") || filename.contains("/") || filename.contains("\\") ||
       filename.contains("<") || filename.contains(">") || filename.contains("|") ||
       filename.contains(":") || filename.contains("*") || filename.contains("?") ||
       filename.contains("\"") {
        return Err("Filename contains invalid characters".to_string());
    }
    
    // Only allow specific file extensions for images
    let allowed_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    if let Some(extension) = filename.rsplit('.').next() {
        if !allowed_extensions.contains(&extension.to_lowercase().as_str()) {
            return Err("Invalid file extension".to_string());
        }
    } else {
        return Err("Filename must have an extension".to_string());
    }
    
    Ok(())
}

fn validate_status(status: &str) -> Result<(), String> {
    match status {
        "pending" | "in-progress" | "completed" => Ok(()),
        _ => Err("Invalid status value".to_string()),
    }
}

fn validate_payment_status(payment_status: &str) -> Result<(), String> {
    match payment_status {
        "Not Paid" | "Half Paid" | "Fully Paid" => Ok(()),
        _ => Err("Invalid payment status value".to_string()),
    }
}

fn validate_price_cents(price_cents: i64) -> Result<(), String> {
    if price_cents < 0 {
        return Err("Price cannot be negative".to_string());
    }
    if price_cents > 999_999_999_99 { // Max $9,999,999.99
        return Err("Price too large".to_string());
    }
    
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub email: String,
    pub contact: String,
    pub profile_image: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commission {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub title: String,
    pub description: String,
    pub price_cents: i64,
    pub payment_status: String, // "Not Paid", "Half Paid", "Fully Paid"
    pub status: String, // "pending", "in-progress", "completed"
    pub created_at: String,
    pub updated_at: String,
    pub images: Vec<String>, // file paths relative to commission folder
}

fn get_app_data_dir(_app_handle: &AppHandle) -> Result<PathBuf, String> {
    // Get the directory where the executable is located
    let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    
    // Create Data folder in the same directory as the executable
    let data_dir = exe_dir.join("Data");
    
    // Create the Data directory if it doesn't exist
    fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;
    
    Ok(data_dir)
}

fn ensure_data_folders(data_dir: &PathBuf) -> Result<(), String> {
    let folders = ["clients", "pendings", "history"];
    
    for folder in folders.iter() {
        let folder_path = data_dir.join(folder);
        fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create {} folder: {}", folder, e))?;
    }
    
    Ok(())
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

#[tauri::command]
pub async fn save_client(app_handle: AppHandle, client: Client) -> Result<(), String> {
    // Validate all client fields
    validate_id(&client.id)?;
    validate_name(&client.name, "Client name")?;
    validate_email(&client.email)?;
    validate_contact(&client.contact)?;
    
    // Additional timestamp validation
    if client.created_at.is_empty() || client.updated_at.is_empty() {
        return Err("Timestamps cannot be empty".to_string());
    }
    
    let data_dir = get_app_data_dir(&app_handle)?;
    ensure_data_folders(&data_dir)?;
    
    let clients_dir = data_dir.join("clients");
    let client_file = clients_dir.join(format!("{}.json", client.id));
    
    let client_json = serde_json::to_string_pretty(&client)
        .map_err(|e| format!("Failed to serialize client: {}", e))?;
    
    fs::write(&client_file, client_json)
        .map_err(|e| format!("Failed to write client file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn load_client(app_handle: AppHandle, clientId: String) -> Result<Option<Client>, String> {
    validate_id(&clientId)?;
    
    let data_dir = get_app_data_dir(&app_handle)?;
    let clients_dir = data_dir.join("clients");
    let client_file = clients_dir.join(format!("{}.json", clientId));
    
    if !client_file.exists() {
        return Ok(None);
    }
    
    let client_json = fs::read_to_string(&client_file)
        .map_err(|e| format!("Failed to read client file: {}", e))?;
    
    let client: Client = serde_json::from_str(&client_json)
        .map_err(|e| format!("Failed to deserialize client: {}", e))?;
    
    Ok(Some(client))
}

#[tauri::command]
pub async fn load_all_clients(app_handle: AppHandle) -> Result<Vec<Client>, String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    ensure_data_folders(&data_dir)?;
    
    let clients_dir = data_dir.join("clients");
    let mut clients = Vec::new();
    
    if clients_dir.exists() {
        let entries = fs::read_dir(&clients_dir)
            .map_err(|e| format!("Failed to read clients directory: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let client_json = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read client file: {}", e))?;
                
                match serde_json::from_str::<Client>(&client_json) {
                    Ok(client) => clients.push(client),
                    Err(e) => eprintln!("Failed to parse client file {:?}: {}", path, e),
                }
            }
        }
    }
    
    Ok(clients)
}

#[tauri::command]
pub async fn delete_client(app_handle: AppHandle, clientId: String) -> Result<(), String> {
    validate_id(&clientId)?;
    
    let data_dir = get_app_data_dir(&app_handle)?;
    let clients_dir = data_dir.join("clients");
    let client_file = clients_dir.join(format!("{}.json", clientId));
    
    if client_file.exists() {
        fs::remove_file(&client_file)
            .map_err(|e| format!("Failed to delete client file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn save_commission(app_handle: AppHandle, commission: Commission) -> Result<(), String> {
    println!("=== SAVE_COMMISSION START ===");
    println!("Commission ID: {}", commission.id);
    println!("Commission Title: {}", commission.title);
    println!("Commission Images: {:?}", commission.images);
    
    // Validate all commission fields
    validate_id(&commission.id)?;
    validate_id(&commission.client_id)?;
    validate_name(&commission.client_name, "Client name")?;
    validate_name(&commission.title, "Commission title")?;
    validate_description(&commission.description)?;
    validate_price_cents(commission.price_cents)?;
    validate_payment_status(&commission.payment_status)?;
    validate_status(&commission.status)?;
    
    println!("Basic field validation passed");
    
    // Validate timestamps
    if commission.created_at.is_empty() || commission.updated_at.is_empty() {
        println!("Timestamp validation failed");
        return Err("Timestamps cannot be empty".to_string());
    }
    
    println!("Timestamp validation passed");
    
    // Validate image paths - filter out empty paths first and handle data URLs
    let valid_images: Vec<String> = commission.images.iter()
        .filter(|path| !path.is_empty())
        .cloned()
        .collect();
    
    println!("Validating commission with {} non-empty images: {:?}", valid_images.len(), valid_images);
    
    for image_path in &valid_images {
        println!("Validating image path: '{}'", image_path);
        
        // Handle data URLs (base64 encoded images from frontend)
        if image_path.starts_with("data:image/") {
            println!("Data URL detected, skipping path validation: '{}'", image_path);
            continue;
        }
        
        // Prevent path traversal attacks for file paths
        if image_path.contains("..") {
            println!("Path traversal detected in: '{}'", image_path);
            return Err("Invalid image path detected".to_string());
        }
        
        // Allow simple filenames (no path separators) or paths within images directory
        if image_path.contains("/") {
            if !image_path.starts_with("images/") {
                println!("Invalid path format (contains / but doesn't start with images/): '{}'", image_path);
                return Err("Invalid image path detected".to_string());
            }
        }
        
        // Reject dangerous characters in any path
        if image_path.contains("\\") || image_path.contains("|") || 
           image_path.contains("<") || image_path.contains(">") {
            println!("Dangerous characters detected in: '{}'", image_path);
            return Err("Invalid image path detected".to_string());
        }
        
        println!("Image path '{}' passed validation", image_path);
    }
    
    println!("All image paths validated successfully");
    
    // Create a new commission with filtered images
    let mut validated_commission = commission.clone();
    validated_commission.images = valid_images;
    
    let data_dir = get_app_data_dir(&app_handle)?;
    ensure_data_folders(&data_dir)?;
    
    // Determine folder based on status
    let folder_name = if validated_commission.status == "completed" { "history" } else { "pendings" };
    let commissions_dir = data_dir.join(folder_name);
    
    // Create client subdirectory using sanitized name
    let sanitized_client_name = validated_commission.client_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let client_dir = commissions_dir.join(&sanitized_client_name);
    fs::create_dir_all(&client_dir)
        .map_err(|e| format!("Failed to create client directory: {}", e))?;
    
    // Create commission file with sanitized filename
    let sanitized_timestamp = validated_commission.created_at.replace([':', '/', '\\', '*', '?', '"', '<', '>', '|'], "-");
    let commission_file = client_dir.join(format!("{}_{}.json", validated_commission.id, sanitized_timestamp));
    
    println!("Writing commission to file: {:?}", commission_file);
    
    let commission_json = serde_json::to_string_pretty(&validated_commission)
        .map_err(|e| format!("Failed to serialize commission: {}", e))?;
    
    println!("Commission JSON serialized successfully");
    
    fs::write(&commission_file, commission_json)
        .map_err(|e| format!("Failed to write commission file: {}", e))?;
    
    println!("=== SAVE_COMMISSION SUCCESS ===");
    Ok(())
}

#[tauri::command]
pub async fn load_commissions(app_handle: AppHandle, status: String) -> Result<Vec<Commission>, String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    ensure_data_folders(&data_dir)?;
    
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
                let client_entries = fs::read_dir(&client_dir)
                    .map_err(|e| format!("Failed to read client directory: {}", e))?;
                
                for client_entry in client_entries {
                    let client_entry = client_entry.map_err(|e| format!("Failed to read client entry: {}", e))?;
                    let file_path = client_entry.path();
                    
                    if file_path.extension().and_then(|s| s.to_str()) == Some("json") {
                        let commission_json = fs::read_to_string(&file_path)
                            .map_err(|e| format!("Failed to read commission file: {}", e))?;
                        
                        match parse_commission(&commission_json) {
                            Ok(c) => commissions.push(c),
                            Err(e) => eprintln!("Failed to parse commission file {:?}: {}", file_path, e),
                        }
                    }
                }
            }
        }
    }
    
    Ok(commissions)
}

#[tauri::command]
pub async fn move_commission(app_handle: AppHandle, commissionId: String, fromStatus: String, toStatus: String) -> Result<(), String> {
    // Validate inputs
    validate_id(&commissionId)?;
    validate_status(&fromStatus)?;
    validate_status(&toStatus)?;
    
    info!("MOVE_COMMISSION CALLED: {} from {} to {}", commissionId, fromStatus, toStatus);
    
    let data_dir = get_app_data_dir(&app_handle)?;
    
    let from_folder = if fromStatus == "completed" { "history" } else { "pendings" };
    let to_folder = if toStatus == "completed" { "history" } else { "pendings" };
    
    // Find the commission file in the from folder
    let from_dir = data_dir.join(from_folder);
    let to_dir = data_dir.join(to_folder);
    
    println!("Moving commission {} from {} to {}", commissionId, fromStatus, toStatus);
    println!("Searching in directory: {:?}", from_dir);
    
    info!("Moving commission {} from {} to {}", commissionId, fromStatus, toStatus);
    info!("Searching in directory: {:?}", from_dir);
    
    // Search for the commission file
    if from_dir.exists() {
        let entries = fs::read_dir(&from_dir)
            .map_err(|e| format!("Failed to read from directory: {}", e))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let client_dir = entry.path();
            
            if client_dir.is_dir() {
                println!("Checking client directory: {:?}", client_dir);
                let client_entries = fs::read_dir(&client_dir)
                    .map_err(|e| format!("Failed to read client directory: {}", e))?;
                
                for client_entry in client_entries {
                    let client_entry = client_entry.map_err(|e| format!("Failed to read client entry: {}", e))?;
                    let file_path = client_entry.path();
                    
                    println!("Checking file: {:?}", file_path);
                    if file_path.is_file() 
                        && file_path.extension().and_then(|s| s.to_str()) == Some("json")
                        && file_path.file_name().unwrap().to_str().unwrap().starts_with(&commissionId) {
                        println!("Found commission file: {:?}", file_path);
                        // Load the commission, update its status, and save to new location
                        let commission_json = fs::read_to_string(&file_path)
                            .map_err(|e| format!("Failed to read commission file: {}", e))?;
                        
                        let mut commission = parse_commission(&commission_json)?;
                        commission.status = toStatus.clone();
                        commission.updated_at = chrono::Utc::now().to_rfc3339();
                        
                        // Create destination directory
                        let dest_client_dir = to_dir.join(&commission.client_name);
                        fs::create_dir_all(&dest_client_dir)
                            .map_err(|e| format!("Failed to create destination directory: {}", e))?;
                        
                        // Save to new location
                        let new_file_path = dest_client_dir.join(file_path.file_name().unwrap());
                        let updated_json = serde_json::to_string_pretty(&commission)
                            .map_err(|e| format!("Failed to serialize updated commission: {}", e))?;
                        
                        fs::write(&new_file_path, updated_json)
                            .map_err(|e| format!("Failed to write updated commission: {}", e))?;
                        
                        // Remove old file
                        fs::remove_file(&file_path)
                            .map_err(|e| format!("Failed to remove old commission file: {}", e))?;
                        
                        return Ok(());
                    }
                }
            }
        }
    } else {
        println!("From directory does not exist: {:?}", from_dir);
    }
    
    println!("Commission {} not found in {} folder", commissionId, fromStatus);
    Err(format!("Commission {} not found in {} folder", commissionId, fromStatus))
}

#[tauri::command]
pub async fn save_commission_image(app_handle: AppHandle, commissionId: String, clientName: String, imageData: Vec<u8>, filename: String) -> Result<String, String> {
    // Validate inputs
    validate_id(&commissionId)?;
    validate_name(&clientName, "Client name")?;
    validate_filename(&filename)?;
    
    // Validate image data size (max 10MB)
    const MAX_IMAGE_SIZE: usize = 10 * 1024 * 1024;
    if imageData.len() > MAX_IMAGE_SIZE {
        return Err("Image file too large (max 10MB)".to_string());
    }
    
    // Basic image format validation (check magic bytes)
    if imageData.len() < 4 {
        return Err("Invalid image data".to_string());
    }
    
    let magic_bytes = &imageData[0..4];
    let is_valid_image = match magic_bytes {
        [0xFF, 0xD8, 0xFF, _] => true, // JPEG
        [0x89, 0x50, 0x4E, 0x47] => true, // PNG
        [0x47, 0x49, 0x46, 0x38] => true, // GIF
        [0x42, 0x4D, _, _] => true, // BMP
        [0x52, 0x49, 0x46, 0x46] => {
            // WebP (check for WEBP in bytes 8-12)
            if imageData.len() >= 12 {
                &imageData[8..12] == b"WEBP"
            } else {
                false
            }
        },
        _ => false,
    };
    
    if !is_valid_image {
        return Err("Invalid image format".to_string());
    }
    
    let data_dir = get_app_data_dir(&app_handle)?;
    
    // Create images directory for the commission using sanitized client name
    let sanitized_client_name = clientName.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let client_dir = data_dir.join("pendings").join(&sanitized_client_name);
    let images_dir = client_dir.join("images");
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;
    
    // Generate unique filename with commission ID prefix using sanitized filename
    let sanitized_filename = filename.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let image_file = images_dir.join(format!("{}_{}", commissionId, sanitized_filename));
    
    fs::write(&image_file, imageData)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    
    // Return relative path
    Ok(format!("images/{}", image_file.file_name().unwrap().to_str().unwrap()))
}

#[tauri::command]
pub async fn get_data_directory_path(app_handle: AppHandle) -> Result<String, String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_commission(app_handle: AppHandle, commissionId: String, status: String) -> Result<(), String> {
    // Validate inputs
    validate_id(&commissionId)?;
    validate_status(&status)?;
    
    let data_dir = get_app_data_dir(&app_handle)?;
    
    // Determine folder based on status
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
                        // Check if this file contains the commission we want to delete
                        if let Ok(commission_json) = fs::read_to_string(&file_path) {
                            if let Ok(commission) = serde_json::from_str::<Commission>(&commission_json) {
                                if commission.id == commissionId {
                                    fs::remove_file(&file_path)
                                        .map_err(|e| format!("Failed to delete commission file: {}", e))?;
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

#[tauri::command]
pub async fn export_all_data(app_handle: AppHandle) -> Result<String, String> {
    let data_dir = get_app_data_dir(&app_handle)?;
    
    // Create a ZIP archive or just return the data directory path for manual copy
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_data(app_handle: AppHandle, importPath: String) -> Result<(), String> {
    // Validate import path to prevent path traversal
    if importPath.is_empty() {
        return Err("Import path cannot be empty".to_string());
    }
    
    if importPath.contains("..") || importPath.contains("~") {
        return Err("Invalid import path - path traversal detected".to_string());
    }
    
    // Only allow paths within specific safe directories
    let import_dir = PathBuf::from(&importPath);
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
    
    let data_dir = get_app_data_dir(&app_handle)?;
    
    // Copy all files from import directory to data directory
    // This is a simple implementation - in production you might want more sophisticated merging
    let options = fs_extra::dir::CopyOptions::new().overwrite(true);
    fs_extra::dir::copy(&import_dir, &data_dir, &options)
        .map_err(|e| format!("Failed to import data: {}", e))?;
    
    Ok(())
}
