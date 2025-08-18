import { ActionInputs } from './types';
export declare class Config {
    private static readonly DEFAULT_INCLUDE_GLOBS;
    private static readonly DEFAULT_EXCLUDE_GLOBS;
    private static readonly DEFAULT_MAX_CHUNK_LINES;
    /**
     * Load and validate configuration from GitHub Action inputs
     */
    static loadFromInputs(): ActionInputs;
    private static getProvider;
    private static getApiKey;
    private static getReviewLevel;
    private static getIncludeGlobs;
    private static getExcludeGlobs;
    private static getMaxChunkLines;
    private static getRules;
    private static validateConfig;
    private static logConfig;
    /**
     * Get environment variable with fallback
     */
    static getEnvVar(name: string, defaultValue?: string): string;
    /**
     * Check if running in GitHub Actions environment
     */
    static isGitHubActions(): boolean;
    /**
     * Get GitHub token for API access
     */
    static getGitHubToken(): string;
    /**
     * Get repository information
     */
    static getRepoInfo(): {
        owner: string;
        repo: string;
    };
    /**
     * Get pull request number
     */
    static getPullRequestNumber(): number;
}
//# sourceMappingURL=config.d.ts.map