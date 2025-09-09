/**
 * @fileoverview Error categories for the DeepSource MCP Server
 * This module defines the possible error categories for classification.
 */

/**
 * Possible error categories for API errors
 * @enum {string}
 * @public
 */
export enum ErrorCategory {
  /** Error related to authentication or authorization */
  AUTH = 'AUTH',
  /** Error with network connectivity */
  NETWORK = 'NETWORK',
  /** Error with server processing */
  SERVER = 'SERVER',
  /** Error with client input */
  CLIENT = 'CLIENT',
  /** Error with request timing out */
  TIMEOUT = 'TIMEOUT',
  /** Error with rate limiting */
  RATE_LIMIT = 'RATE_LIMIT',
  /** Error with the GraphQL schema */
  SCHEMA = 'SCHEMA',
  /** Error with data not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Error with data formatting */
  FORMAT = 'FORMAT',
  /** Other uncategorized errors */
  OTHER = 'OTHER',
}
