/**
 * @fileoverview Common models shared across different domains
 * This module defines common interfaces and types used throughout the application.
 */

/**
 * Base interface for all response formats
 * @public
 */
export interface ApiResponse {
  /** Whether the response is an error */
  isError?: boolean;
  /** Content blocks of the response */
  content: Array<{
    /** Type of content */
    type: 'text';
    /** Text content */
    text: string;
  }>;
}
