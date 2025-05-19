/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { DeepSourceClient } from '../deepsource.js';

// Create a test subclass to expose private methods
class TestableDeepSourceClient extends DeepSourceClient {
  static testValidateProjectKey(projectKey: string): void {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.validateProjectKey(projectKey);
  }

  static testIsValidVulnerabilityNode(node: unknown): boolean {
    // @ts-expect-error - Accessing private method for testing
    return DeepSourceClient.isValidVulnerabilityNode(node);
  }
}

// We need to access private methods for testing
// @ts-expect-error - Accessing private static method for testing
const isValidVulnerabilityNode = DeepSourceClient['isValidVulnerabilityNode'];

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

  describe('validateProjectKey', () => {
    it('should throw an error for null or undefined project keys', () => {
      expect(() => {
        // @ts-expect-error - Testing with invalid type
        TestableDeepSourceClient.testValidateProjectKey(null);
      }).toThrow('Invalid project key: Project key must be a non-empty string');

      expect(() => {
        // @ts-expect-error - Testing with invalid type
        TestableDeepSourceClient.testValidateProjectKey(undefined);
      }).toThrow('Invalid project key: Project key must be a non-empty string');
    });

    it('should throw an error for non-string project keys', () => {
      expect(() => {
        // @ts-expect-error - Testing with invalid type
        TestableDeepSourceClient.testValidateProjectKey(123);
      }).toThrow('Invalid project key: Project key must be a non-empty string');

      expect(() => {
        // @ts-expect-error - Testing with invalid type
        TestableDeepSourceClient.testValidateProjectKey({});
      }).toThrow('Invalid project key: Project key must be a non-empty string');

      expect(() => {
        // @ts-expect-error - Testing with invalid type
        TestableDeepSourceClient.testValidateProjectKey(true);
      }).toThrow('Invalid project key: Project key must be a non-empty string');
    });

    it('should throw an error for empty string project keys', () => {
      expect(() => {
        TestableDeepSourceClient.testValidateProjectKey('');
      }).toThrow('Invalid project key: Project key must be a non-empty string');
    });

    it('should not throw for valid project keys', () => {
      expect(() => {
        TestableDeepSourceClient.testValidateProjectKey('valid-project-key');
      }).not.toThrow();

      expect(() => {
        TestableDeepSourceClient.testValidateProjectKey('12345abcdef');
      }).not.toThrow();
    });
  });
});
