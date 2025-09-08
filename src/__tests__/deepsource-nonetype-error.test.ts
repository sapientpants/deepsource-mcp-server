/**
 * @vitest-environment node
 */

import { TestableDeepSourceClient } from './utils/test-utils.js';

describe('DeepSourceClient NoneType error handling (line 2452)', () => {
  it('should return empty array when NoneType error occurs', async () => {
    // Test directly using the static method
    const result = await TestableDeepSourceClient.testNoneTypeErrorHandler();
    expect(result).toEqual([]);
  });

  it('should correctly identify errors with NoneType message', () => {
    // Create error with NoneType message
    const error = new Error('NoneType object has no attribute get');

    // Verify error detection functions work correctly
    expect(TestableDeepSourceClient.testIsError(error)).toBe(true);
    expect(TestableDeepSourceClient.testIsErrorWithMessage(error, 'NoneType')).toBe(true);
  });
});
