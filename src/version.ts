/**
 * @fileoverview Central version management module for DeepSource MCP Server
 *
 * This module provides a single source of truth for version information,
 * reading from package.json at build time with fallback support for runtime.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Interface representing parsed version information
 */
export interface VersionInfo {
  /** Full version string (e.g., "1.5.0") */
  version: string;
  /** Major version number */
  major: number;
  /** Minor version number */
  minor: number;
  /** Patch version number */
  patch: number;
  /** Pre-release version (e.g., "beta.1") */
  prerelease?: string;
  /** Build metadata (e.g., "20240101") */
  build?: string;
}

/**
 * Get the directory name for the current module
 * Works with ES modules
 */
function getCurrentDir(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    return dirname(__filename);
  } catch {
    // Fallback for environments where import.meta.url is not available
    return process.cwd();
  }
}

/**
 * Read version from package.json
 * @returns The version string from package.json or null if unable to read
 */
function readVersionFromPackageJson(): string | null {
  try {
    const currentDir = getCurrentDir();
    // Try multiple paths to find package.json
    const possiblePaths = [
      join(currentDir, '../../package.json'), // From src/version.ts
      join(currentDir, '../package.json'), // From dist/version.js
      join(process.cwd(), 'package.json'), // From current working directory
    ];

    for (const packagePath of possiblePaths) {
      try {
        const packageContent = readFileSync(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent) as { version?: string };
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch {
        // Try next path
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a semver version string into components
 * @param versionString - The version string to parse
 * @returns Parsed version information or null if invalid
 */
export function parseVersion(versionString: string): VersionInfo | null {
  // Regex for semantic versioning
  // Matches: major.minor.patch[-prerelease][+build]
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
  const match = versionString.match(semverRegex);

  if (!match) {
    return null;
  }

  const [, majorStr, minorStr, patchStr, prerelease, build] = match;

  return {
    version: versionString,
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    ...(prerelease && { prerelease }),
    ...(build && { build }),
  };
}

/**
 * Validate if a string is a valid semver version
 * @param versionString - The version string to validate
 * @returns True if valid semver format
 */
export function validateVersion(versionString: string): boolean {
  return parseVersion(versionString) !== null;
}

/**
 * Compare two semver versions
 * @param v1 - First version
 * @param v2 - Second version
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  if (!version1 || !version2) {
    throw new Error('Invalid version format');
  }

  // Compare major
  if (version1.major !== version2.major) {
    return version1.major < version2.major ? -1 : 1;
  }

  // Compare minor
  if (version1.minor !== version2.minor) {
    return version1.minor < version2.minor ? -1 : 1;
  }

  // Compare patch
  if (version1.patch !== version2.patch) {
    return version1.patch < version2.patch ? -1 : 1;
  }

  // Compare prerelease (absence means higher version)
  if (version1.prerelease && !version2.prerelease) {
    return -1;
  }
  if (!version1.prerelease && version2.prerelease) {
    return 1;
  }
  if (version1.prerelease && version2.prerelease) {
    return version1.prerelease.localeCompare(version2.prerelease);
  }

  return 0;
}

// Initialize version - try to read from package.json, fallback to build-time constant
let VERSION: string;

const packageVersion = readVersionFromPackageJson();
if (packageVersion) {
  VERSION = packageVersion;
} else {
  // This will be replaced during build process
  VERSION = '__BUILD_VERSION__';

  // If still the placeholder, use a fallback version
  if (VERSION === '__BUILD_VERSION__') {
    VERSION = '0.0.0-dev';
  }
}

// Validate the version format
if (!validateVersion(VERSION)) {
  // If version is invalid, use a safe fallback
  VERSION = '0.0.0-dev';
}

/**
 * The current version of the DeepSource MCP Server
 * @constant
 */
export { VERSION };

/**
 * Get the current version of the DeepSource MCP Server
 * @returns The current version string
 */
export function getVersion(): string {
  return VERSION;
}

/**
 * Get detailed version information
 * @returns Parsed version information
 */
export function getVersionInfo(): VersionInfo {
  const info = parseVersion(VERSION);
  if (!info) {
    // Should never happen due to validation above, but TypeScript needs this
    return {
      version: VERSION,
      major: 0,
      minor: 0,
      patch: 0,
    };
  }
  return info;
}

/**
 * Get a formatted version string for display
 * @param includePrerelease - Whether to include prerelease info
 * @param includeBuild - Whether to include build metadata
 * @returns Formatted version string
 */
export function getFormattedVersion(includePrerelease = true, includeBuild = false): string {
  const info = getVersionInfo();
  let formatted = `${info.major}.${info.minor}.${info.patch}`;

  if (includePrerelease && info.prerelease) {
    formatted += `-${info.prerelease}`;
  }

  if (includeBuild && info.build) {
    formatted += `+${info.build}`;
  }

  return formatted;
}
