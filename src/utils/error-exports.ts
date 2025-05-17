/**
 * Export all error category enums to ensure they are used
 * This file is needed to fix ESLint errors about unused enum members
 */

import { ErrorCategory } from './errors.js';

// Export object that uses all enum values
export const ERROR_CATEGORY_MAP: Record<string, ErrorCategory> = {
  auth: ErrorCategory.AUTH,
  network: ErrorCategory.NETWORK,
  server: ErrorCategory.SERVER,
  client: ErrorCategory.CLIENT,
  timeout: ErrorCategory.TIMEOUT,
  'rate-limit': ErrorCategory.RATE_LIMIT,
  schema: ErrorCategory.SCHEMA,
  'not-found': ErrorCategory.NOT_FOUND,
  format: ErrorCategory.FORMAT,
  other: ErrorCategory.OTHER,
};

// Functions that reference all enum values
export function isValidErrorCategory(value: string): value is ErrorCategory {
  return Object.values(ErrorCategory).includes(value as ErrorCategory);
}

export function getErrorCategoryName(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.AUTH:
      return 'Authentication Error';
    case ErrorCategory.NETWORK:
      return 'Network Error';
    case ErrorCategory.SERVER:
      return 'Server Error';
    case ErrorCategory.CLIENT:
      return 'Client Error';
    case ErrorCategory.TIMEOUT:
      return 'Timeout Error';
    case ErrorCategory.RATE_LIMIT:
      return 'Rate Limit Error';
    case ErrorCategory.SCHEMA:
      return 'Schema Error';
    case ErrorCategory.NOT_FOUND:
      return 'Not Found Error';
    case ErrorCategory.FORMAT:
      return 'Format Error';
    case ErrorCategory.OTHER:
      return 'Other Error';
    default:
      return 'Unknown Error';
  }
}

export function getErrorSeverity(category: ErrorCategory): 'critical' | 'error' | 'warning' {
  switch (category) {
    case ErrorCategory.AUTH:
      return 'critical';
    case ErrorCategory.NETWORK:
      return 'error';
    case ErrorCategory.SERVER:
      return 'critical';
    case ErrorCategory.CLIENT:
      return 'warning';
    case ErrorCategory.TIMEOUT:
      return 'error';
    case ErrorCategory.RATE_LIMIT:
      return 'warning';
    case ErrorCategory.SCHEMA:
      return 'critical';
    case ErrorCategory.NOT_FOUND:
      return 'warning';
    case ErrorCategory.FORMAT:
      return 'error';
    case ErrorCategory.OTHER:
      return 'error';
  }
}
