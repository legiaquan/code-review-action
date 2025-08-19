import { ProviderError } from '../types';
import { GitHubClient } from '../github';
import { CommentBuilder } from './comment-builder';
/**
 * Centralized error handling service
 */
export declare class ErrorHandler {
    private githubClient;
    private commentBuilder;
    private prNumber;
    constructor(githubClient: GitHubClient, commentBuilder: CommentBuilder, prNumber: number);
    /**
     * Handle different types of errors with appropriate actions
     */
    handleError(error: unknown): Promise<void>;
    /**
     * Handle provider-specific errors with detailed guidance
     */
    handleProviderError(error: ProviderError, filename?: string): Promise<void>;
    /**
     * Post error comment to GitHub PR
     */
    private postErrorComment;
    /**
     * Log error with context for debugging
     */
    static logError(error: unknown, context: string): void;
    /**
     * Create a user-friendly error message
     */
    static formatErrorForUser(error: unknown): string;
    /**
     * Check if error is retryable
     */
    static isRetryableError(error: unknown): boolean;
    /**
     * Get error severity level
     */
    static getErrorSeverity(error: unknown): 'low' | 'medium' | 'high' | 'critical';
}
//# sourceMappingURL=error-handler.d.ts.map