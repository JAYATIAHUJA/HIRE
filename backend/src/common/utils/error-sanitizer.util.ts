/**
 * Utility for sanitizing error messages to prevent information disclosure in production.
 */

/**
 * Sanitizes an error message for safe exposure to clients.
 * In development: returns the original message for debugging.
 * In production: returns a generic message for internal errors.
 * 
 * @param error - The error to sanitize
 * @param fallbackMessage - Custom fallback message (default: 'Internal server error')
 * @returns Sanitized error message safe for client exposure
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallbackMessage: string = 'Internal server error',
): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development, always show full error details
  if (isDevelopment) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // In production, hide internal error details
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check if this is a user-facing error that's safe to expose
    // These are typically validation or business logic errors
    const safePatterns = [
      'not found',
      'already exists',
      'invalid',
      'required',
      'unauthorized',
      'forbidden',
      'expired',
      'not allowed',
      'already applied',
      'please verify',
    ];

    // Check if the error message matches safe patterns
    const isSafeMessage = safePatterns.some(pattern => message.includes(pattern));

    if (isSafeMessage) {
      return error.message;
    }

    // For internal errors (database, network, etc.), return generic message
    return fallbackMessage;
  }

  return fallbackMessage;
}

/**
 * Determines if an error is safe to expose to clients.
 * Useful for deciding whether to include error details in responses.
 * 
 * @param error - The error to check
 * @returns true if the error message is safe for client exposure
 */
export function isSafeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const safePatterns = [
    'not found',
    'already exists',
    'invalid',
    'required',
    'unauthorized',
    'forbidden',
    'expired',
    'not allowed',
    'already applied',
    'please verify',
  ];

  return safePatterns.some(pattern => message.includes(pattern));
}

/**
 * Creates a sanitized error response object.
 * 
 * @param error - The error to sanitize
 * @param includeStack - Whether to include stack trace (only in development)
 * @returns Sanitized error response object
 */
export function createSafeErrorResponse(
  error: unknown,
  includeStack: boolean = false,
): { error: string; stack?: string } {
  const response: { error: string; stack?: string } = {
    error: sanitizeErrorMessage(error),
  };

  if (includeStack && process.env.NODE_ENV === 'development' && error instanceof Error) {
    response.stack = error.stack;
  }

  return response;
}
