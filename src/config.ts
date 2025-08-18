import * as core from '@actions/core';
import { ActionInputs, ProviderType, ReviewLevel, ConfigError } from './types';
import { FileUtils } from './file-utils';

export class Config {
  private static readonly DEFAULT_INCLUDE_GLOBS = [
    'src/**/*.ts',
    'src/**/*.js',
    'lib/**/*.ts',
    'lib/**/*.js',
  ];

  private static readonly DEFAULT_EXCLUDE_GLOBS = [
    '**/*.lock',
    '**/dist/**',
    '**/node_modules/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/coverage/**',
    '**/.git/**',
  ];

  private static readonly DEFAULT_MAX_CHUNK_LINES = 400;

  /**
   * Load and validate configuration from GitHub Action inputs
   */
  static loadFromInputs(): ActionInputs {
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

      const config: ActionInputs = {
        provider,
        apiKey,
        reviewLevel,
        includeGlobs,
        excludeGlobs,
        maxChunkLines,
        rules,
      };

      this.validateConfig(config);
      this.logConfig(config);

      return config;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }

      throw new ConfigError(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private static getProvider(): ProviderType {
    const provider = core.getInput('provider', { required: false }) || 'gemini';
    const validProviders: ProviderType[] = ['gemini', 'openai', 'huggingface'];

    if (!validProviders.includes(provider as ProviderType)) {
      throw new ConfigError(
        `Invalid provider: ${provider}. Valid options: ${validProviders.join(', ')}`,
      );
    }

    return provider as ProviderType;
  }

  private static getApiKey(): string {
    const apiKey = core.getInput('api_key', { required: true });

    if (!apiKey || apiKey.trim() === '') {
      throw new ConfigError('API key is required');
    }

    // Don't log the actual key for security
    core.info(`API key loaded (${apiKey.length} characters)`);

    return apiKey.trim();
  }

  private static getReviewLevel(): ReviewLevel {
    const reviewLevel = core.getInput('review_level', { required: false }) || 'diff';
    const validLevels: ReviewLevel[] = ['diff', 'file', 'full'];

    if (!validLevels.includes(reviewLevel as ReviewLevel)) {
      throw new ConfigError(
        `Invalid review_level: ${reviewLevel}. Valid options: ${validLevels.join(', ')}`,
      );
    }

    return reviewLevel as ReviewLevel;
  }

  private static getIncludeGlobs(): string[] {
    const input = core.getInput('include_globs', { required: false });

    if (!input || input.trim() === '') {
      return this.DEFAULT_INCLUDE_GLOBS;
    }

    const globs = FileUtils.parseGlobPatterns(input);

    if (globs.length === 0) {
      core.warning('No valid include patterns found, using defaults');
      return this.DEFAULT_INCLUDE_GLOBS;
    }

    return globs;
  }

  private static getExcludeGlobs(): string[] {
    const input = core.getInput('exclude_globs', { required: false });

    if (!input || input.trim() === '') {
      return this.DEFAULT_EXCLUDE_GLOBS;
    }

    const globs = FileUtils.parseGlobPatterns(input);

    // Always include default excludes for security
    const combinedGlobs = [...new Set([...this.DEFAULT_EXCLUDE_GLOBS, ...globs])];

    return combinedGlobs;
  }

  private static getMaxChunkLines(): number {
    const input = core.getInput('max_chunk_lines', { required: false });

    if (!input || input.trim() === '') {
      return this.DEFAULT_MAX_CHUNK_LINES;
    }

    const maxLines = parseInt(input, 10);

    if (isNaN(maxLines) || maxLines < 50 || maxLines > 2000) {
      throw new ConfigError(
        `Invalid max_chunk_lines: ${input}. Must be a number between 50 and 2000`,
      );
    }

    return maxLines;
  }

  private static getRules(): string[] {
    const input = core.getInput('rules', { required: false });

    if (!input || input.trim() === '') {
      return [];
    }

    // Parse rules from comma or newline separated string
    const rules = FileUtils.parseGlobPatterns(input)
      .filter(rule => rule.length > 0)
      .map(rule => rule.trim());

    return rules;
  }

  private static validateConfig(config: ActionInputs): void {
    // Validate provider-specific requirements
    if (config.provider === 'gemini' && !config.apiKey.startsWith('AI')) {
      core.warning('Gemini API keys typically start with "AI". Please verify your key.');
    }

    if (config.provider === 'openai' && !config.apiKey.startsWith('sk-')) {
      core.warning('OpenAI API keys typically start with "sk-". Please verify your key.');
    }

    // Validate patterns
    if (config.includeGlobs.length === 0) {
      throw new ConfigError('At least one include pattern is required');
    }

    // Check for potential conflicts
    const hasConflict = config.includeGlobs.some(include =>
      config.excludeGlobs.some(exclude => include === exclude),
    );

    if (hasConflict) {
      core.warning('Some include patterns may be overridden by exclude patterns');
    }
  }

  private static logConfig(config: ActionInputs): void {
    core.info('=== AI Code Review Configuration ===');
    core.info(`Provider: ${config.provider}`);
    core.info(`Review Level: ${config.reviewLevel}`);
    core.info(`Max Chunk Lines: ${config.maxChunkLines}`);
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
  static getEnvVar(name: string, defaultValue: string = ''): string {
    return process.env[name] || defaultValue;
  }

  /**
   * Check if running in GitHub Actions environment
   */
  static isGitHubActions(): boolean {
    return !!process.env.GITHUB_ACTIONS;
  }

  /**
   * Get GitHub token for API access
   */
  static getGitHubToken(): string {
    const token = process.env.GITHUB_TOKEN || core.getInput('token', { required: false });

    if (!token) {
      throw new ConfigError('GITHUB_TOKEN is required for API access');
    }

    return token;
  }

  /**
   * Get repository information
   */
  static getRepoInfo(): { owner: string; repo: string } {
    const repository = process.env.GITHUB_REPOSITORY;

    if (!repository) {
      throw new ConfigError('GITHUB_REPOSITORY environment variable is required');
    }

    const [owner, repo] = repository.split('/');

    if (!owner || !repo) {
      throw new ConfigError(`Invalid repository format: ${repository}`);
    }

    return { owner, repo };
  }

  /**
   * Get pull request number
   */
  static getPullRequestNumber(): number {
    const prNumber =
      process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? process.env.GITHUB_EVENT_PATH
          ? require(process.env.GITHUB_EVENT_PATH).number
          : undefined
        : core.getInput('pr_number', { required: false });

    if (!prNumber) {
      throw new ConfigError(
        'Pull request number not found. This action should run on pull_request events.',
      );
    }

    const num = typeof prNumber === 'string' ? parseInt(prNumber, 10) : prNumber;

    if (isNaN(num) || num <= 0) {
      throw new ConfigError(`Invalid pull request number: ${prNumber}`);
    }

    return num;
  }
}
