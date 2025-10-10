use regex::Regex;

// Security validation constants
const MAX_ID_LENGTH: usize = 64;
const MAX_NAME_LENGTH: usize = 255;
const MAX_DESCRIPTION_LENGTH: usize = 10000;
const MAX_EMAIL_LENGTH: usize = 320;
const MAX_CONTACT_LENGTH: usize = 50;
const MAX_FILENAME_LENGTH: usize = 255;

pub struct ValidationService;

impl ValidationService {
    pub fn validate_id(id: &str) -> Result<(), String> {
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

    pub fn validate_name(name: &str, field_name: &str) -> Result<(), String> {
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

    pub fn validate_email(email: &str) -> Result<(), String> {
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

    pub fn validate_contact(contact: &str) -> Result<(), String> {
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

    pub fn validate_description(description: &str) -> Result<(), String> {
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

    pub fn validate_filename(filename: &str) -> Result<(), String> {
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

    pub fn validate_status(status: &str) -> Result<(), String> {
        match status {
            "pending" | "in-progress" | "completed" => Ok(()),
            _ => Err("Invalid status value".to_string()),
        }
    }

    pub fn validate_payment_status(payment_status: &str) -> Result<(), String> {
        match payment_status {
            "Not Paid" | "Half Paid" | "Fully Paid" => Ok(()),
            _ => Err("Invalid payment status value".to_string()),
        }
    }

    pub fn validate_price_cents(price_cents: i64) -> Result<(), String> {
        if price_cents < 0 {
            return Err("Price cannot be negative".to_string());
        }
        if price_cents > 999_999_999_99 { // Max $9,999,999.99
            return Err("Price too large".to_string());
        }
        
        Ok(())
    }

    pub fn validate_image_path(image_path: &str) -> Result<(), String> {
        println!("Validating image path: '{}'", image_path);
        
        // Handle data URLs (base64 encoded images from frontend)
        if image_path.starts_with("data:image/") {
            println!("Data URL detected, skipping path validation: '{}'", image_path);
            return Ok(());
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
        Ok(())
    }
}
