// Security validation utilities
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Constants matching backend validation
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_EMAIL_LENGTH = 320;
const MAX_CONTACT_LENGTH = 50;
// const MAX_FILENAME_LENGTH = 255; // Reserved for future file validation
// const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB - Reserved for future image validation

// Frontend validation functions
export const validateId = (id: string): void => {
  if (!id || id.trim() === '') {
    throw new ValidationError('ID cannot be empty');
  }
  
  if (id.length > MAX_ID_LENGTH) {
    throw new ValidationError(`ID too long (max ${MAX_ID_LENGTH} chars)`);
  }
  
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    throw new ValidationError('ID contains invalid characters (only alphanumeric and underscore allowed)');
  }
};

export const validateName = (name: string, fieldName: string): void => {
  if (!name || name.trim() === '') {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
  
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`${fieldName} too long (max ${MAX_NAME_LENGTH} chars)`);
  }
  
  // Prevent path traversal and dangerous characters
  const dangerousChars = ['..', '/', '\\', '<', '>', '|', ':', '*', '?', '"'];
  if (dangerousChars.some(char => name.includes(char))) {
    throw new ValidationError(`${fieldName} contains invalid characters`);
  }
};

export const validateEmail = (email: string): void => {
  if (!email || email.trim() === '') {
    return; // Email is optional
  }
  
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new ValidationError('Email too long');
  }
  
  // Basic email validation - but be more lenient for contact info
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    // If it doesn't look like an email, treat it as contact info instead
    // Only throw error if it contains dangerous characters
    const dangerousChars = ['<', '>', '&', '"', "'", '`'];
    if (dangerousChars.some(char => email.includes(char))) {
      throw new ValidationError('Email contains invalid characters');
    }
    // Otherwise, let it pass - it might be a username or other contact info
  }
};

export const validateContact = (contact: string): void => {
  if (!contact || contact.trim() === '') {
    return; // Contact is optional
  }
  
  if (contact.length > MAX_CONTACT_LENGTH) {
    throw new ValidationError('Contact too long');
  }
  
  // Basic sanitization - remove dangerous characters
  const dangerousChars = ['<', '>', '&'];
  if (dangerousChars.some(char => contact.includes(char))) {
    throw new ValidationError('Contact contains invalid characters');
  }
};

export const validateDescription = (description: string): void => {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Description too long (max ${MAX_DESCRIPTION_LENGTH} chars)`);
  }
  
  // Basic XSS prevention
  const dangerousPatterns = ['<script', 'javascript:', 'onload=', 'onerror=', 'onclick='];
  if (dangerousPatterns.some(pattern => description.toLowerCase().includes(pattern))) {
    throw new ValidationError('Description contains potentially dangerous content');
  }
};

export const validateStatus = (status: string): void => {
  const validStatuses = ['pending', 'in-progress', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError('Invalid status value');
  }
};

export const validatePaymentStatus = (paymentStatus: string): void => {
  const validPaymentStatuses = ['Not Paid', 'Half Paid', 'Fully Paid'];
  if (!validPaymentStatuses.includes(paymentStatus)) {
    throw new ValidationError('Invalid payment status value');
  }
};

export const validatePriceCents = (priceCents: number): void => {
  if (priceCents < 0) {
    throw new ValidationError('Price cannot be negative');
  }
  
  if (priceCents > 999_999_999_99) { // Max $9,999,999.99
    throw new ValidationError('Price too large');
  }
  
  if (!Number.isInteger(priceCents)) {
    throw new ValidationError('Price must be in cents (integer)');
  }
};

export class SecurityValidator {
  
  // URL validation prevents malicious redirects and protocol injection attacks
  static isValidURL(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      // Restrict to web protocols to prevent file:// or custom protocol abuse
      const allowedProtocols = ['https:', 'http:'];
      return allowedProtocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // File type validation prevents executable uploads disguised as images
  static validateFileType(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    return allowedTypes.includes(file.type.toLowerCase());
  }

  // Size limit prevents DoS attacks via large file uploads
  static validateFileSize(file: File, maxSizeMB: number = 25): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  // Text sanitization prevents XSS by removing dangerous HTML elements
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '') 
      .replace(/on\w+\s*=/gi, '') 
      .trim();
  }

  // Price validation with business logic constraints
  static validatePrice(price: string | number): { isValid: boolean; value?: number; error?: string } {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return { isValid: false, error: 'Price must be a valid number' };
    }
    
    if (numPrice < 0) {
      return { isValid: false, error: 'Price cannot be negative' };
    }
    
    if (numPrice > 999999) {
      return { isValid: false, error: 'Price cannot exceed $999,999' };
    }
    
    // Currency precision: avoid floating point errors in financial calculations
    const roundedPrice = Math.round(numPrice * 100) / 100;
    
    return { isValid: true, value: roundedPrice };
  }

  // Base64 image validation with size limits to prevent memory exhaustion
  static validateImageDataURL(dataURL: string): boolean {
    if (!dataURL || typeof dataURL !== 'string') return false;
    
    const dataURLPattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;
    if (!dataURLPattern.test(dataURL)) return false;
    
    // Base64 encoding increases size by ~37%, so 5MB original ≈ 7MB encoded
    const base64Data = dataURL.split(',')[1];
    if (!base64Data) return false;
    
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 7 * 1024 * 1024;
    
    return sizeInBytes <= maxSizeBytes;
  }

  // Recursive sanitization for complex data structures before persistence
  static sanitizeForStorage(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForStorage(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        sanitized[key] = this.sanitizeForStorage(value);
      }
      return sanitized;
    }
    
    return data;
  }
}

// Error handling utilities
export class ErrorHandler {
  // User-facing error display - centralized to maintain consistent UX
  static showUserError(message: string, type: 'error' | 'warning' | 'info' = 'error') {
    // In React components, use the useToast hook instead:
    // const { showError, showWarning, showInfo } = useToast();
    // For non-React contexts, fallback to console logging
    console.error(`[${type.toUpperCase()}]`, message);
    
    // Fallback alert for critical errors outside React context
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  }

  // Security event logging for monitoring suspicious activity
  static logSecurityEvent(event: string, details?: unknown) {
    console.warn(`[SECURITY EVENT] ${event}`, details);
  }
}
