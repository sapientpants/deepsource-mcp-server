/**
 * Export all log level enums to ensure they are used
 * This file is needed to fix ESLint errors about unused enum members
 */

import { LogLevel } from './logger.js';

// Export object that uses all enum values
export const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

// Functions that reference all enum values
export function isValidLogLevel(value: string): value is LogLevel {
  return Object.values(LogLevel).includes(value as LogLevel);
}

export function getLogLevelPriority(level: LogLevel): number {
  switch (level) {
    case LogLevel.DEBUG:
      return 0;
    case LogLevel.INFO:
      return 1;
    case LogLevel.WARN:
      return 2;
    case LogLevel.ERROR:
      return 3;
    default:
      return 999;
  }
}

export function getLogLevelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    default:
      return 'UNKNOWN';
  }
}

export function getLogLevelColor(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return '\x1b[36m'; // Cyan
    case LogLevel.INFO:
      return '\x1b[32m'; // Green
    case LogLevel.WARN:
      return '\x1b[33m'; // Yellow
    case LogLevel.ERROR:
      return '\x1b[31m'; // Red
  }
}
