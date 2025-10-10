use tauri::AppHandle;
use crate::repository::CommissionRepository;
use crate::repository::commission_repository::Commission;
use super::validation_service::ValidationService;

pub struct CommissionService;

impl CommissionService {
    pub async fn create_commission(
        app_handle: AppHandle,
        commission: Commission,
    ) -> Result<(), String> {
        println!("=== COMMISSION_SERVICE::CREATE START ===");
        println!("Commission ID: {}", commission.id);
        println!("Commission Title: {}", commission.title);
        println!("Commission Images: {:?}", commission.images);
        
        // Validate all commission fields
        ValidationService::validate_id(&commission.id)?;
        ValidationService::validate_id(&commission.client_id)?;
        ValidationService::validate_name(&commission.client_name, "Client name")?;
        ValidationService::validate_name(&commission.title, "Commission title")?;
        ValidationService::validate_description(&commission.description)?;
        ValidationService::validate_price_cents(commission.price_cents)?;
        ValidationService::validate_payment_status(&commission.payment_status)?;
        ValidationService::validate_status(&commission.status)?;
        
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
            ValidationService::validate_image_path(image_path)?;
        }
        
        println!("All image paths validated successfully");
        
        // Create a new commission with filtered images
        let mut validated_commission = commission;
        validated_commission.images = valid_images;
        
        CommissionRepository::save(&app_handle, &validated_commission).await?;
        
        println!("=== COMMISSION_SERVICE::CREATE SUCCESS ===");
        Ok(())
    }

    pub async fn get_commissions_by_status(
        app_handle: AppHandle,
        status: String,
    ) -> Result<Vec<Commission>, String> {
        ValidationService::validate_status(&status)?;
        CommissionRepository::find_by_status(&app_handle, &status).await
    }

    pub async fn move_commission(
        app_handle: AppHandle,
        commission_id: String,
        from_status: String,
        to_status: String,
    ) -> Result<(), String> {
        ValidationService::validate_id(&commission_id)?;
        ValidationService::validate_status(&from_status)?;
        ValidationService::validate_status(&to_status)?;
        
        println!("Moving commission {} from {} to {}", commission_id, from_status, to_status);
        
        CommissionRepository::move_commission(&app_handle, &commission_id, &from_status, &to_status).await
    }

    pub async fn delete_commission(
        app_handle: AppHandle,
        commission_id: String,
        status: String,
    ) -> Result<(), String> {
        ValidationService::validate_id(&commission_id)?;
        ValidationService::validate_status(&status)?;
        
        CommissionRepository::delete_by_id_and_status(&app_handle, &commission_id, &status).await
    }
}
