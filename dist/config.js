'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.Config = void 0;
const core = __importStar(require('@actions/core'));
const types_1 = require('./types');
const file_utils_1 = require('./file-utils');
class Config {
  static DEFAULT_INCLUDE_GLOBS = ['src/**/*.ts', 'src/**/*.js', 'lib/**/*.ts', 'lib/**/*.js'];
  static DEFAULT_EXCLUDE_GLOBS = [
    '**/*.lock',
    '**/dist/**',
    '**/node_modules/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/coverage/**',
    '**/.git/**',
  ];
  static DEFAULT_MAX_CHUNK_LINES = 400;
  static DEFAULT_MAX_RETRIES = 3;
  static DEFAULT_RETRY_DELAY = 1000; // 1 second
  /**
   * Load and validate configuration from GitHub Action inputs
   */
  static loadFromInputs() {
    try {
      // Get provider
      const provider = this.getProvider();
      // Get API key
      const apiKey = this.getApiKey();
      // Get review level
      const reviewLevel = this.getReviewLevel();
      // Get file patterns
      const includeGlobs = this.getIncludeGlobs();
      const excludeGlobs = this.getExcludeGlobs();
      // Get chunk size
      const maxChunkLines = this.getMaxChunkLines();
      // Get custom rules
      const rules = this.getRules();
      // Get retry configuration
      const maxRetries = this.getMaxRetries();
      const retryDelay = this.getRetryDelay();
      const config = {
        provider,
        apiKey,
        reviewLevel,
        includeGlobs,
        excludeGlobs,
        maxChunkLines,
        rules,
        maxRetries,
        retryDelay,
      };
      this.validateConfig(config);
      this.logConfig(config);
      return config;
    } catch (error) {
      if (error instanceof types_1.ConfigError) {
        throw error;
      }
      throw new types_1.ConfigError(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
  static getProvider() {
    const provider = core.getInput('provider', { required: false }) || 'gemini';
    const validProviders = ['gemini', 'openai', 'huggingface'];
    if (!validProviders.includes(provider)) {
      throw new types_1.ConfigError(
        `Invalid provider: ${provider}. Valid options: ${validProviders.join(', ')}`,
      );
    }
    return provider;
  }
  static getApiKey() {
    const apiKey = core.getInput('api_key', { required: true });
    if (!apiKey || apiKey.trim() === '') {
      throw new types_1.ConfigError('API key is required');
    }
    // Don't log the actual key for security
    core.info(`API key loaded (${apiKey.length} characters)`);
    return apiKey.trim();
  }
  static getReviewLevel() {
    const reviewLevel = core.getInput('review_level', { required: false }) || 'diff';
    const validLevels = ['diff', 'file', 'full'];
    if (!validLevels.includes(reviewLevel)) {
      throw new types_1.ConfigError(
        `Invalid review_level: ${reviewLevel}. Valid options: ${validLevels.join(', ')}`,
      );
    }
    return reviewLevel;
  }
  static getIncludeGlobs() {
    const input = core.getInput('include_globs', { required: false });
    if (!input || input.trim() === '') {
      return this.DEFAULT_INCLUDE_GLOBS;
    }
    const globs = file_utils_1.FileUtils.parseGlobPatterns(input);
    if (globs.length === 0) {
      core.warning('No valid include patterns found, using defaults');
      return this.DEFAULT_INCLUDE_GLOBS;
    }
    return globs;
  }
  static getExcludeGlobs() {
    const input = core.getInput('exclude_globs', { required: false });
    if (!input || input.trim() === '') {
      return this.DEFAULT_EXCLUDE_GLOBS;
    }
    const globs = file_utils_1.FileUtils.parseGlobPatterns(input);
    // Always include default excludes for security
    const combinedGlobs = [...new Set([...this.DEFAULT_EXCLUDE_GLOBS, ...globs])];
    return combinedGlobs;
  }
  static getMaxChunkLines() {
    const input = core.getInput('max_chunk_lines', { required: false });
    if (!input || input.trim() === '') {
      return this.DEFAULT_MAX_CHUNK_LINES;
    }
    const maxLines = parseInt(input, 10);
    if (isNaN(maxLines) || maxLines < 50 || maxLines > 2000) {
      throw new types_1.ConfigError(
        `Invalid max_chunk_lines: ${input}. Must be a number between 50 and 2000`,
      );
    }
    return maxLines;
  }
  static getRules() {
    const input = core.getInput('rules', { required: false });
    if (!input || input.trim() === '') {
      return [];
    }
    // Parse rules from comma or newline separated string
    const rules = file_utils_1.FileUtils.parseGlobPatterns(input)
      .filter(rule => rule.length > 0)
      .map(rule => rule.trim());
    return rules;
  }
  static getMaxRetries() {
    const input = core.getInput('max_retries', { required: false });
    if (!input || input.trim() === '') {
      return this.DEFAULT_MAX_RETRIES;
    }
    const maxRetries = parseInt(input, 10);
    if (isNaN(maxRetries) || maxRetries < 0 || maxRetries > 10) {
      throw new types_1.ConfigError(
        `Invalid max_retries: ${input}. Must be a number between 0 and 10`,
      );
    }
    return maxRetries;
  }
  static getRetryDelay() {
    const input = core.getInput('retry_delay', { required: false });
    if (!input || input.trim() === '') {
      return this.DEFAULT_RETRY_DELAY;
    }
    const retryDelay = parseInt(input, 10);
    if (isNaN(retryDelay) || retryDelay < 100 || retryDelay > 60000) {
      throw new types_1.ConfigError(
        `Invalid retry_delay: ${input}. Must be a number between 100 and 60000 (milliseconds)`,
      );
    }
    return retryDelay;
  }
  static validateConfig(config) {
    // Validate provider-specific requirements
    if (config.provider === 'gemini' && !config.apiKey.startsWith('AI')) {
      core.warning('Gemini API keys typically start with "AI". Please verify your key.');
    }
    if (config.provider === 'openai' && !config.apiKey.startsWith('sk-')) {
      core.warning('OpenAI API keys typically start with "sk-". Please verify your key.');
    }
    // Validate patterns
    if (config.includeGlobs.length === 0) {
      throw new types_1.ConfigError('At least one include pattern is required');
    }
    // Check for potential conflicts
    const hasConflict = config.includeGlobs.some(include =>
      config.excludeGlobs.some(exclude => include === exclude),
    );
    if (hasConflict) {
      core.warning('Some include patterns may be overridden by exclude patterns');
    }
  }
  static logConfig(config) {
    core.info('=== AI Code Review Configuration ===');
    core.info(`Provider: ${config.provider}`);
    core.info(`Review Level: ${config.reviewLevel}`);
    core.info(`Max Chunk Lines: ${config.maxChunkLines}`);
    core.info(`Max Retries: ${config.maxRetries}`);
    core.info(`Retry Delay: ${config.retryDelay}ms`);
    core.info(`Include Patterns: ${config.includeGlobs.join(', ')}`);
    core.info(`Exclude Patterns: ${config.excludeGlobs.join(', ')}`);
    if (config.rules.length > 0) {
      core.info(`Custom Rules (${config.rules.length}):`);
      config.rules.forEach((rule, index) => {
        core.info(`  ${index + 1}. ${rule}`);
      });
    } else {
      core.info('Custom Rules: None');
    }
    core.info('=====================================');
  }
  /**
   * Get environment variable with fallback
   */
  static getEnvVar(name, defaultValue = '') {
    return process.env[name] || defaultValue;
  }
  /**
   * Check if running in GitHub Actions environment
   */
  static isGitHubActions() {
    return !!process.env.GITHUB_ACTIONS;
  }
  /**
   * Get GitHub token for API access
   */
  static getGitHubToken() {
    const token = process.env.GITHUB_TOKEN || core.getInput('token', { required: false });
    if (!token) {
      throw new types_1.ConfigError('GITHUB_TOKEN is required for API access');
    }
    return token;
  }
  /**
   * Get repository information
   */
  static getRepoInfo() {
    const repository = process.env.GITHUB_REPOSITORY;
    if (!repository) {
      throw new types_1.ConfigError('GITHUB_REPOSITORY environment variable is required');
    }
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new types_1.ConfigError(`Invalid repository format: ${repository}`);
    }
    return { owner, repo };
  }
  /**
   * Get pull request number
   */
  static getPullRequestNumber() {
    const prNumber =
      process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? process.env.GITHUB_EVENT_PATH
          ? require(process.env.GITHUB_EVENT_PATH).number
          : undefined
        : core.getInput('pr_number', { required: false });
    if (!prNumber) {
      throw new types_1.ConfigError(
        'Pull request number not found. This action should run on pull_request events.',
      );
    }
    const num = typeof prNumber === 'string' ? parseInt(prNumber, 10) : prNumber;
    if (isNaN(num) || num <= 0) {
      throw new types_1.ConfigError(`Invalid pull request number: ${prNumber}`);
    }
    return num;
  }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map
