/**
 * @fileoverview Project-related models
 * This module defines interfaces for DeepSource projects.
 */

/**
 * Represents a DeepSource project in the API
 * @public
 */
export interface DeepSourceProject {
  /** Unique identifier for the project */
  key: string;
  /** Display name of the project */
  name: string;
  /** Repository information */
  repository: {
    /** Repository URL */
    url: string;
    /** Version control provider (e.g., 'GITHUB', 'GITLAB') */
    provider: string;
    /** Account login that owns the repository */
    login: string;
    /** Whether the repository is private */
    isPrivate: boolean;
    /** Whether the repository is activated in DeepSource */
    isActivated: boolean;
  };
}
