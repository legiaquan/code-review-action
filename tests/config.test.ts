import * as core from '@actions/core';
import { Config } from '../src/config';
import { ConfigError } from '../src/types';

// Mock @actions/core
const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
const mockInfo = core.info as jest.MockedFunction<typeof core.info>;
const mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;

describe('Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default environment variables
    process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_EVENT_NAME = 'pull_request';
  });

  describe('loadFromInputs', () => {
    it('should load default configuration', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'api_key':
            return 'test-api-key';
          default:
            return '';
        }
      });

      const config = Config.loadFromInputs();

      expect(config).toEqual({
        provider: 'gemini',
        apiKey: 'test-api-key',
        reviewLevel: 'diff',
        includeGlobs: ['src/**/*.ts', 'src/**/*.js', 'lib/**/*.ts', 'lib/**/*.js'],
        excludeGlobs: expect.arrayContaining([
          '**/*.lock',
          '**/dist/**',
          '**/node_modules/**',
          '**/*.min.js',
        ]),
        maxChunkLines: 400,
        rules: [],
      });
    });

    it('should load custom configuration', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'provider':
            return 'openai';
          case 'api_key':
            return 'sk-test-key';
          case 'review_level':
            return 'file';
          case 'include_globs':
            return 'src/**/*.ts,lib/**/*.js';
          case 'exclude_globs':
            return '**/*.test.ts';
          case 'max_chunk_lines':
            return '300';
          case 'rules':
            return 'Check security,Verify performance';
          default:
            return '';
        }
      });

      const config = Config.loadFromInputs();

      expect(config.provider).toBe('openai');
      expect(config.apiKey).toBe('sk-test-key');
      expect(config.reviewLevel).toBe('file');
      expect(config.includeGlobs).toEqual(['src/**/*.ts', 'lib/**/*.js']);
      expect(config.excludeGlobs).toContain('**/*.test.ts');
      expect(config.maxChunkLines).toBe(300);
      expect(config.rules).toEqual(['Check security', 'Verify performance']);
    });

    it('should throw error for invalid provider', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'provider':
            return 'invalid-provider';
          case 'api_key':
            return 'test-key';
          default:
            return '';
        }
      });

      expect(() => Config.loadFromInputs()).toThrow(ConfigError);
    });

    it('should throw error for missing API key', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'api_key':
            return '';
          default:
            return '';
        }
      });

      expect(() => Config.loadFromInputs()).toThrow(ConfigError);
    });

    it('should throw error for invalid review level', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'api_key':
            return 'test-key';
          case 'review_level':
            return 'invalid';
          default:
            return '';
        }
      });

      expect(() => Config.loadFromInputs()).toThrow(ConfigError);
    });

    it('should throw error for invalid max_chunk_lines', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'api_key':
            return 'test-key';
          case 'max_chunk_lines':
            return 'invalid';
          default:
            return '';
        }
      });

      expect(() => Config.loadFromInputs()).toThrow(ConfigError);
    });

    it('should warn for suspicious API keys', () => {
      mockGetInput.mockImplementation((name: string) => {
        switch (name) {
          case 'provider':
            return 'openai';
          case 'api_key':
            return 'not-sk-key';
          default:
            return '';
        }
      });

      Config.loadFromInputs();

      expect(mockWarning).toHaveBeenCalledWith(
        'OpenAI API keys typically start with "sk-". Please verify your key.'
      );
    });
  });

  describe('getRepoInfo', () => {
    it('should parse repository information correctly', () => {
      process.env.GITHUB_REPOSITORY = 'owner/repo-name';
      const result = Config.getRepoInfo();
      
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo-name',
      });
    });

    it('should throw error for missing GITHUB_REPOSITORY', () => {
      delete process.env.GITHUB_REPOSITORY;
      
      expect(() => Config.getRepoInfo()).toThrow(ConfigError);
    });

    it('should throw error for invalid repository format', () => {
      process.env.GITHUB_REPOSITORY = 'invalid-format';
      
      expect(() => Config.getRepoInfo()).toThrow(ConfigError);
    });
  });

  describe('getPullRequestNumber', () => {
    it('should get PR number from environment', () => {
      // Mock the event payload
      const mockEventPath = '/tmp/github_event.json';
      process.env.GITHUB_EVENT_PATH = mockEventPath;
      process.env.GITHUB_EVENT_NAME = 'pull_request';
      
      // Mock require to return event data
      jest.doMock(mockEventPath, () => ({ number: 123 }), { virtual: true });
      
      const result = Config.getPullRequestNumber();
      expect(result).toBe(123);
    });

    it('should throw error when not in pull request context', () => {
      process.env.GITHUB_EVENT_NAME = 'push';
      delete process.env.GITHUB_EVENT_PATH;
      
      mockGetInput.mockReturnValue('');
      
      expect(() => Config.getPullRequestNumber()).toThrow(ConfigError);
    });
  });

  describe('isGitHubActions', () => {
    it('should return true when in GitHub Actions', () => {
      process.env.GITHUB_ACTIONS = 'true';
      expect(Config.isGitHubActions()).toBe(true);
    });

    it('should return false when not in GitHub Actions', () => {
      delete process.env.GITHUB_ACTIONS;
      expect(Config.isGitHubActions()).toBe(false);
    });
  });

  describe('getGitHubToken', () => {
    it('should get token from environment', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      expect(Config.getGitHubToken()).toBe('test-token');
    });

    it('should get token from input when env var is missing', () => {
      delete process.env.GITHUB_TOKEN;
      mockGetInput.mockReturnValue('input-token');
      
      expect(Config.getGitHubToken()).toBe('input-token');
    });

    it('should throw error when no token is available', () => {
      delete process.env.GITHUB_TOKEN;
      mockGetInput.mockReturnValue('');
      
      expect(() => Config.getGitHubToken()).toThrow(ConfigError);
    });
  });
});
