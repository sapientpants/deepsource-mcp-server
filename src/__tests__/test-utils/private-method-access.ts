/**
 * Utility for accessing private static methods in tests
 *
 * This helper abstracts the pattern of using @ts-expect-error to access
 * private static methods of classes for testing purposes.
 */
import { DeepSourceClient } from '../../deepsource.js';

/**
 * Get a private static method from DeepSourceClient for testing
 *
 * @param methodName The name of the private static method to access
 * @returns The private static method
 */
export function getPrivateMethod<T>(methodName: string): T {
  // We need to cast DeepSourceClient to Record<string, unknown> to access private methods
  return (DeepSourceClient as unknown as Record<string, unknown>)[methodName] as T;
}
