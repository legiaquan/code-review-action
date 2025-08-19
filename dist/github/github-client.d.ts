export interface GitHubRepository {
    owner: string;
    repo: string;
}
export interface CommentResponse {
    id: number;
    html_url: string;
}
/**
 * GitHub API client with fallback support
 * Handles both Octokit and direct REST API calls
 */
export declare class GitHubClient {
    private octokit;
    private repoInfo;
    constructor(repoInfo: GitHubRepository);
    /**
     * Validate GitHub token permissions by making a test API call
     */
    validatePermissions(): Promise<boolean>;
    /**
     * Get list of files changed in a pull request
     */
    getPullRequestFiles(prNumber: number): Promise<any[]>;
    /**
     * Create a comment on an issue/PR with automatic fallback
     */
    createComment(issueNumber: number, body: string): Promise<CommentResponse>;
    /**
     * Create comment using direct GitHub REST API
     */
    private createCommentWithFetch;
    /**
     * Handle API error responses with detailed error messages
     */
    private handleApiError;
    /**
     * Check if an error message indicates a permission issue
     */
    private isPermissionError;
    /**
     * Check if an error should not be retried
     */
    private isNonRetryableError;
    /**
     * Retry an operation with exponential backoff
     */
    private retryOperation;
    /**
     * Build a detailed error message for permission issues
     */
    private buildPermissionErrorMessage;
    /**
     * Utility delay function
     */
    private delay;
}
//# sourceMappingURL=github-client.d.ts.map