/**
 * @vitest-environment node
 */

import nock from 'nock';
import { expect } from 'vitest';
import { DeepSourceClient } from '../deepsource.js';
import { ClassifiedError, ErrorCategory } from '../utils/errors.js';

describe('DeepSourceClient', () => {
  // Test variables
  const API_KEY = 'test-api-key';
  let client: DeepSourceClient;

  // Setup client and nock interceptors
  beforeEach(() => {
    client = new DeepSourceClient(API_KEY);
    nock.disableNetConnect();
  });

  // Clean up after each test
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('Error handling', () => {
    describe('HTTP Status Error Handling', () => {
      // Test server errors (500+)
      it('should handle server errors (500+) correctly', async () => {
        nock('https://api.deepsource.io')
          .post('/graphql/')
          .reply(500, { message: 'Internal Server Error' });

        try {
          await client.listProjects();
          expect(true).toBe(false); // This will fail if the code reaches here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const classifiedError = error as ClassifiedError;
          expect(classifiedError.category).toBe(ErrorCategory.SERVER);
          expect(classifiedError.message).toContain('Server error (500)');
          expect(classifiedError.originalError).toBeDefined();
        }
      });

      // Test 404 Not Found errors
      it('should handle 404 not found errors correctly', async () => {
        nock('https://api.deepsource.io').post('/graphql/').reply(404, { message: 'Not Found' });

        try {
          await client.listProjects();
          expect(true).toBe(false); // This will fail if the code reaches here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const classifiedError = error as ClassifiedError;
          expect(classifiedError.category).toBe(ErrorCategory.NOT_FOUND);
          expect(classifiedError.message).toContain('Not found (404)');
          expect(classifiedError.originalError).toBeDefined();
        }
      });

      // Test other 4xx client errors
      it('should handle other 4xx client errors correctly', async () => {
        nock('https://api.deepsource.io')
          .post('/graphql/')
          .reply(400, { message: 'Bad Request' }, { 'Content-Type': 'application/json' });

        try {
          await client.listProjects();
          expect(true).toBe(false); // This will fail if the code reaches here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const classifiedError = error as ClassifiedError;
          expect(classifiedError.category).toBe(ErrorCategory.CLIENT);
          expect(classifiedError.message).toContain('Client error (400)');
          expect(classifiedError.originalError).toBeDefined();
        }
      });

      // Test 4xx status without statusText
      it('should handle 4xx status without statusText correctly', async () => {
        nock('https://api.deepsource.io').post('/graphql/').reply(400, {});

        try {
          await client.listProjects();
          expect(true).toBe(false); // This will fail if the code reaches here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const classifiedError = error as ClassifiedError;
          expect(classifiedError.category).toBe(ErrorCategory.CLIENT);
          // Accept either "Bad Request" or "Bad request" since the error message can vary
          expect(classifiedError.message.toLowerCase()).toContain(
            'client error (400): bad request'
          );
          expect(classifiedError.originalError).toBeDefined();
        }
      });
    });

    describe('Generic Error Handling', () => {
      it('should handle standard Error objects', async () => {
        // Mock Axios to throw a standard Error
        nock('https://api.deepsource.io')
          .post('/graphql/')
          .replyWithError(new Error('Test generic error'));

        await expect(client.listProjects()).rejects.toThrow(
          'DeepSource API error: Test generic error'
        );
      });

      it('should handle string error messages', async () => {
        // Mock Axios to throw a string error message
        nock('https://api.deepsource.io').post('/graphql/').replyWithError('Not an Error object');

        await expect(client.listProjects()).rejects.toThrow(
          'DeepSource API error: Not an Error object'
        );
      });
    });
  });
});
