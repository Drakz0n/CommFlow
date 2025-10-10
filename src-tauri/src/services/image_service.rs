use std::fs;
use tauri::AppHandle;
use crate::repository::FileStorage;
use super::validation_service::ValidationService;

pub struct ImageService;

impl ImageService {
    pub async fn save_commission_image(
        app_handle: AppHandle,
        commission_id: String,
        client_name: String,
        image_data: Vec<u8>,
        filename: String,
    ) -> Result<String, String> {
        // Validate inputs
        ValidationService::validate_id(&commission_id)?;
        ValidationService::validate_name(&client_name, "Client name")?;
        ValidationService::validate_filename(&filename)?;
        
        // Validate image data size (max 10MB)
        const MAX_IMAGE_SIZE: usize = 10 * 1024 * 1024;
        if image_data.len() > MAX_IMAGE_SIZE {
            return Err("Image file too large (max 10MB)".to_string());
        }
        
        // Basic image format validation (check magic bytes)
        if image_data.len() < 4 {
            return Err("Invalid image data".to_string());
        }
        
        let magic_bytes = &image_data[0..4];
        let is_valid_image = match magic_bytes {
            [0xFF, 0xD8, 0xFF, _] => true, // JPEG
            [0x89, 0x50, 0x4E, 0x47] => true, // PNG
            [0x47, 0x49, 0x46, 0x38] => true, // GIF
            [0x42, 0x4D, _, _] => true, // BMP
            [0x52, 0x49, 0x46, 0x46] => {
                // WebP (check for WEBP in bytes 8-12)
                if image_data.len() >= 12 {
                    &image_data[8..12] == b"WEBP"
                } else {
                    false
                }
            },
            _ => false,
        };
        
        if !is_valid_image {
            return Err("Invalid image format".to_string());
        }
        
        let data_dir = FileStorage::get_app_data_dir(&app_handle)?;
        
        // Create images directory for the commission using sanitized client name
        let sanitized_client_name = FileStorage::sanitize_filename(&client_name);
        let client_dir = data_dir.join("pendings").join(&sanitized_client_name);
        let images_dir = client_dir.join("images");
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Failed to create images directory: {}", e))?;
        
        // Generate unique filename with commission ID prefix using sanitized filename
        let sanitized_filename = FileStorage::sanitize_filename(&filename);
        let image_file = images_dir.join(format!("{}_{}", commission_id, sanitized_filename));
        
        fs::write(&image_file, image_data)
            .map_err(|e| format!("Failed to save image: {}", e))?;
        
        // Return relative path
        Ok(format!("images/{}", image_file.file_name().unwrap().to_str().unwrap()))
    }
}
