/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { DeepSourceClient } from '../deepsource.js';

// We need to access private methods for testing
// @ts-expect-error - Accessing private static methods for testing
const isValidVulnerabilityNode = DeepSourceClient['isValidVulnerabilityNode'];
// @ts-expect-error - Accessing private static method for testing
const validateProjectKey = DeepSourceClient['validateProjectKey'];

describe('DeepSourceClient validation methods', () => {
  // Create a spy for the logger
  const originalLogger = DeepSourceClient['logger'];
  const mockWarn = jest.fn();

  beforeEach(() => {
    // Mock the logger's warn method
    DeepSourceClient['logger'] = {
      warn: mockWarn,
      // Add other required methods to satisfy TypeScript
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore the original logger
    DeepSourceClient['logger'] = originalLogger;
  });

  describe('validateProjectKey', () => {
    it('should not throw for valid project keys', () => {
      // Valid non-empty strings should not throw
      expect(() => validateProjectKey('test-project')).not.toThrow();
      expect(() => validateProjectKey('abc123')).not.toThrow();
      expect(() => validateProjectKey('PROJECT_KEY')).not.toThrow();
    });

    it('should throw for null or undefined project keys', () => {
      // Should throw for null or undefined
      expect(() => validateProjectKey(null as unknown as string)).toThrow(
        'Invalid project key: Project key must be a non-empty string'
      );
      expect(() => validateProjectKey(undefined as unknown as string)).toThrow(
        'Invalid project key: Project key must be a non-empty string'
      );
    });

    it('should throw for empty string project keys', () => {
      // Should throw for empty string
      expect(() => validateProjectKey('')).toThrow(
        'Invalid project key: Project key must be a non-empty string'
      );
    });

    it('should throw for non-string project keys', () => {
      // Should throw for non-string values
      expect(() => validateProjectKey(123 as unknown as string)).toThrow(
        'Invalid project key: Project key must be a non-empty string'
      );
      expect(() => validateProjectKey({} as unknown as string)).toThrow(
        'Invalid project key: Project key must be a non-empty string'
      );
      expect(() => validateProjectKey(true as unknown as string)).toThrow(
        'Invalid project key: Project key must be a non-empty string'
      );
    });
  });

  describe('isValidVulnerabilityNode', () => {
    it('should return false for null or undefined', () => {
      expect(isValidVulnerabilityNode(null)).toBe(false);
      expect(isValidVulnerabilityNode(undefined)).toBe(false);
      expect(mockWarn).toHaveBeenCalledTimes(2);
    });

    it('should return false for non-object values', () => {
      expect(isValidVulnerabilityNode('string')).toBe(false);
      expect(isValidVulnerabilityNode(123)).toBe(false);
      expect(isValidVulnerabilityNode(true)).toBe(false);
      expect(mockWarn).toHaveBeenCalledTimes(3);
    });

    it('should return false for object without an id', () => {
      const node = { someField: 'value' };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid ID',
        node
      );
    });

    it('should return false for object with non-string id', () => {
      const node = { id: 123 };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid ID',
        node
      );
    });

    it('should return false when package is missing or not an object', () => {
      const node = { id: 'vuln1' };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid package',
        node
      );

      const nodeWithNonObjectPackage = { id: 'vuln1', package: 'not-an-object' };
      expect(isValidVulnerabilityNode(nodeWithNonObjectPackage)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid package',
        nodeWithNonObjectPackage
      );
    });

    it('should return false when packageVersion is missing or not an object', () => {
      const node = { id: 'vuln1', package: {} };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid packageVersion',
        node
      );

      const nodeWithNonObjectPackageVersion = {
        id: 'vuln1',
        package: {},
        packageVersion: 'not-an-object',
      };
      expect(isValidVulnerabilityNode(nodeWithNonObjectPackageVersion)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid packageVersion',
        nodeWithNonObjectPackageVersion
      );
    });

    it('should return false when vulnerability is missing or not an object', () => {
      const node = { id: 'vuln1', package: {}, packageVersion: {} };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid vulnerability',
        node
      );

      const nodeWithNonObjectVulnerability = {
        id: 'vuln1',
        package: {},
        packageVersion: {},
        vulnerability: 'not-an-object',
      };
      expect(isValidVulnerabilityNode(nodeWithNonObjectVulnerability)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability node with missing or invalid vulnerability',
        nodeWithNonObjectVulnerability
      );
    });

    it('should return false when package is missing required fields', () => {
      const node = {
        id: 'vuln1',
        package: { missing: 'required fields' },
        packageVersion: {},
        vulnerability: {},
      };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability with incomplete package information',
        node.package
      );
    });

    it('should return false when packageVersion is missing required fields', () => {
      const node = {
        id: 'vuln1',
        package: { id: 'pkg1', ecosystem: 'npm', name: 'express' },
        packageVersion: { missing: 'required fields' },
        vulnerability: {},
      };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability with incomplete package version information',
        node.packageVersion
      );
    });

    it('should return false when vulnerability is missing required fields', () => {
      const node = {
        id: 'vuln1',
        package: { id: 'pkg1', ecosystem: 'npm', name: 'express' },
        packageVersion: { id: 'ver1', version: '1.0.0' },
        vulnerability: { missing: 'required fields' },
      };
      expect(isValidVulnerabilityNode(node)).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(
        'Skipping vulnerability with incomplete vulnerability information',
        node.vulnerability
      );
    });

    it('should return true for valid vulnerability node', () => {
      const validNode = {
        id: 'vuln1',
        package: { id: 'pkg1', ecosystem: 'npm', name: 'express' },
        packageVersion: { id: 'ver1', version: '1.0.0' },
        vulnerability: { id: 'cve1', identifier: 'CVE-2022-1234' },
      };
      expect(isValidVulnerabilityNode(validNode)).toBe(true);
      expect(mockWarn).not.toHaveBeenCalled();
    });
  });
});
