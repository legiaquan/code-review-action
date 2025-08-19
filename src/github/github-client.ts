import * as core from '@actions/core';
import * as github from '@actions/github';
import { Config } from '../utils';

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
export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private repoInfo: GitHubRepository;

  constructor(repoInfo: GitHubRepository) {
    this.octokit = github.getOctokit(Config.getGitHubToken());
    this.repoInfo = repoInfo;
  }

  /**
   * Validate GitHub token permissions by making a test API call
   */
  async validatePermissions(): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.repoInfo.owner,
        repo: this.repoInfo.repo,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`Permission validation failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get list of files changed in a pull request
   */
  async getPullRequestFiles(prNumber: number): Promise<any[]> {
    const { data: files } = await this.octokit.rest.pulls.listFiles({
      owner: this.repoInfo.owner,
      repo: this.repoInfo.repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return files;
  }

  /**
   * Create a comment on an issue/PR with automatic fallback
   */
  async createComment(issueNumber: number, body: string): Promise<CommentResponse> {
    // First, validate token permissions
    const hasPermissions = await this.validatePermissions();
    if (!hasPermissions) {
      core.warning(
        '⚠️ GitHub token may not have sufficient permissions. Proceeding with fallback API...',
      );
    }

    // Try Octokit first
    try {
      const response = await this.retryOperation(async () => {
        return await this.octokit.rest.issues.createComment({
          owner: this.repoInfo.owner,
          repo: this.repoInfo.repo,
          issue_number: issueNumber,
          body,
        });
      });

      core.info('✅ Comment posted successfully via Octokit');
      return {
        id: response.data.id,
        html_url: response.data.html_url,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`Octokit failed: ${errorMessage}`);

      // Check if it's a permission issue
      if (this.isPermissionError(errorMessage)) {
        core.info('🔄 Trying fallback GitHub API...');

        try {
          const response = await this.retryOperation(async () => {
            return await this.createCommentWithFetch(issueNumber, body);
          });

          core.info('✅ Comment posted successfully via fallback API');
          return response;
        } catch (fallbackError) {
          const fallbackMessage =
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
          core.error(`Fallback API also failed: ${fallbackMessage}`);

          // Provide detailed troubleshooting information
          throw new Error(this.buildPermissionErrorMessage(errorMessage, fallbackMessage));
        }
      }

      // If it's not a permission error, throw immediately
      throw new Error(`Failed to create comment: ${errorMessage}`);
    }
  }

  /**
   * Create comment using direct GitHub REST API
   */
  private async createCommentWithFetch(
    issueNumber: number,
    body: string,
  ): Promise<CommentResponse> {
    const token = Config.getGitHubToken();
    const url = `https://api.github.com/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/issues/${issueNumber}/comments`;

    core.debug(`🔗 Posting to: ${url}`);
    core.debug(`🔑 Using token: ${token.substring(0, 8)}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Code-Review-Action/1.0',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const result = (await response.json()) as CommentResponse;
    core.info(`💬 Comment created successfully with ID: ${result.id}`);
    core.debug(`Comment URL: ${result.html_url}`);

    return result;
  }

  /**
   * Handle API error responses with detailed error messages
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorText: string;
    let errorData: any = {};

    try {
      errorText = await response.text();
      errorData = JSON.parse(errorText);
    } catch {
      errorText = `HTTP ${response.status} ${response.statusText}`;
    }

    core.error(`GitHub API Response: ${response.status} ${response.statusText}`);
    core.error(`Error details: ${errorText}`);

    // Provide specific error messages based on status code
    switch (response.status) {
      case 401:
        throw new Error(
          `Authentication failed: Invalid or expired GitHub token. Please check your GITHUB_TOKEN secret.`,
        );
      case 403:
        if (errorData.message?.includes('Resource not accessible by integration')) {
          throw new Error(
            `Permission denied: The GitHub token doesn't have permission to create comments. Required permissions: 'issues: write' or 'pull-requests: write'`,
          );
        }
        throw new Error(`Access forbidden: ${errorData.message || 'Insufficient permissions'}`);
      case 404:
        throw new Error(
          `Resource not found: Repository ${this.repoInfo.owner}/${this.repoInfo.repo} or issue doesn't exist or token lacks access`,
        );
      case 422:
        throw new Error(`Validation failed: ${errorData.message || 'Invalid request data'}`);
      default:
        throw new Error(`GitHub API error ${response.status}: ${errorData.message || errorText}`);
    }
  }

  /**
   * Check if an error message indicates a permission issue
   */
  private isPermissionError(errorMessage: string): boolean {
    const permissionIndicators = [
      'Resource not accessible by integration',
      'Bad credentials',
      'Not Found',
      'Insufficient permissions',
      'API rate limit exceeded',
      '401',
      '403',
      '404',
    ];

    return permissionIndicators.some(indicator =>
      errorMessage.toLowerCase().includes(indicator.toLowerCase()),
    );
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(errorMessage: string): boolean {
    const nonRetryableIndicators = [
      'Bad credentials',
      'Invalid token',
      'Not Found',
      'Resource not accessible by integration',
      'Validation failed',
      '401',
      '404',
      '422',
    ];

    return nonRetryableIndicators.some(indicator =>
      errorMessage.toLowerCase().includes(indicator.toLowerCase()),
    );
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Don't retry certain errors
        if (this.isNonRetryableError(lastError.message)) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        core.warning(
          `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Build a detailed error message for permission issues
   */
  private buildPermissionErrorMessage(octokitError: string, fetchError: string): string {
    return `Failed to create comment using both Octokit and fallback API.

Octokit Error: ${octokitError}
Fallback API Error: ${fetchError}

This usually indicates a GitHub token permission issue. Here's how to fix it:

1. **For GitHub Actions workflows:**
   Add permissions to your workflow file:
   \`\`\`yaml
   permissions:
     issues: write
     pull-requests: write
     contents: read
   \`\`\`

2. **For Personal Access Tokens:**
   Ensure your token has these scopes:
   - repo (for private repos) or public_repo (for public repos)
   - write:discussion (for creating comments)

3. **For GitHub Apps:**
   Ensure the app has these permissions:
   - Issues: Write
   - Pull requests: Write

4. **Check repository settings:**
   - Verify the repository exists and is accessible
   - Check if the PR/issue number is correct
   - Ensure the token has access to this specific repository

For more details, see: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
