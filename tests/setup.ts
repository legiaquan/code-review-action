// Jest setup file
import { jest } from '@jest/globals';

// Mock GitHub Actions core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn(),
}));

// Mock GitHub Actions github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(),
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo',
    },
    payload: {
      pull_request: {
        number: 123,
      },
    },
  },
}));

// Set test environment variables
process.env.GITHUB_ACTIONS = 'true';
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_EVENT_NAME = 'pull_request';

// Increase timeout for integration tests
jest.setTimeout(30000);
