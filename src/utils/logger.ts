/**
 * @fileoverview Simple logging service for the application.
 * This provides a centralized place for all logging functionality.
 * In the future, this could be replaced with a more robust logging library.
 */

/**
 * Log levels for the application
 * @enum {string}
 */
// This enum is part of the public API and is used by consumers, even if not all values are used in this file
/* eslint-disable @typescript-eslint/no-unused-vars -- Exported enum part of public API */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Environment-aware logging configuration
 */
const LOG_LEVELS_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Check if a log level should be displayed based on the environment configuration
 * @param level The log level to check
 * @returns {boolean} True if the log level should be displayed
 * @private
 */
function shouldLog(level: LogLevel): boolean {
  const configuredLevel = (process.env['LOG_LEVEL'] || 'INFO') as LogLevel;
  return LOG_LEVELS_PRIORITY[level] >= LOG_LEVELS_PRIORITY[configuredLevel];
}

/**
 * Format a log message with timestamp, level, and context information
 * @param level The log level of the message
 * @param message The log message content
 * @param context Optional context identifier
 * @returns {string} Formatted log message
 * @private
 */
function formatLogMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  return `${timestamp} ${level} ${contextStr}${message}`;
}

/**
 * Logger service for consistent logging throughout the application
 */
export class Logger {
  private context?: string | undefined;

  /**
   * Create a new logger instance, optionally with a context
   * @param context Optional context name to identify the log source
   */
  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  debug(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = formatLogMessage(LogLevel.DEBUG, message, this.context);
      console.debug(formattedMessage, data !== undefined ? data : '');
    }
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  info(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.INFO)) {
      const formattedMessage = formatLogMessage(LogLevel.INFO, message, this.context);
      console.info(formattedMessage, data !== undefined ? data : '');
    }
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  warn(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.WARN)) {
      const formattedMessage = formatLogMessage(LogLevel.WARN, message, this.context);
      console.warn(formattedMessage, data !== undefined ? data : '');
    }
  }

  /**
   * Log an error message with improved error formatting
   * @param message The message to log
   * @param error Optional error to include in the log. The error will be formatted for better readability:
   *        - Error objects will include name, message and stack trace
   *        - Objects will be stringified with proper indentation
   *        - Other values will be converted to strings
   */
  error(message: string, error?: unknown): void {
    if (shouldLog(LogLevel.ERROR)) {
      const formattedMessage = formatLogMessage(LogLevel.ERROR, message, this.context);

      // Format the error for better debugging
      let errorOutput = '';
      if (error !== undefined) {
        if (error instanceof Error) {
          errorOutput = `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
        } else {
          try {
            errorOutput = JSON.stringify(error, null, 2);
          } catch {
            // Fallback to string representation if JSON.stringify fails
            errorOutput = String(error);
          }
        }
      }

      console.error(formattedMessage, errorOutput || '');
    }
  }
}

/**
 * Default logger instance for the application
 * Pre-configured with the 'DeepSourceMCP' context for quick imports
 * @const {Logger}
 */
export const defaultLogger = new Logger('DeepSourceMCP');

/**
 * Helper function to create a logger with a specific context
 * @param context The context to use for the logger
 * @returns A new logger instance with the specified context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default export for simpler imports
 */
export default defaultLogger;

// These log levels define the hierarchy for logging operations:
// - DEBUG: Detailed information for debugging
// - INFO: General information about application operation
// - WARN: Warning events that might lead to issues
// - ERROR: Error events that might still allow the application to continue
// This helps maintain consistent logging patterns throughout the application
