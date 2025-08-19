import * as core from '@actions/core';
import { ProviderError, ConfigError, FileProcessingError } from '../types';
import { GitHubClient } from '../github';
import { CommentBuilder } from './comment-builder';

/**
 * Centralized error handling service
 */
export class ErrorHandler {
  constructor(
    private githubClient: GitHubClient,
    private commentBuilder: CommentBuilder,
    private prNumber: number
  ) {}

  /**
   * Handle different types of errors with appropriate actions
   */
  async handleError(error: unknown): Promise<void> {
    let errorMessage = '';
    let shouldPostComment = false;

    if (error instanceof ConfigError) {
      errorMessage = `Configuration error: ${error.message}`;
      core.error('❌ Configuration Error:');
      core.error(`   ${error.message}`);
      core.error('💡 Please check your action configuration and try again.');
    } else if (error instanceof ProviderError) {
      errorMessage = `Provider error (${error.provider}): ${error.message}`;
      shouldPostComment = true; // Post API errors as comments
      
      core.error('❌ AI Provider Error:');
      core.error(`   Provider: ${error.provider}`);
      core.error(`   Status: ${error.statusCode || 'N/A'}`);
      core.error(`   Message: ${error.message}`);
      core.error('💡 Check your API key and provider configuration.');
    } else if (error instanceof FileProcessingError) {
      errorMessage = `File processing error: ${error.message}`;
      core.error('❌ File Processing Error:');
      core.error(`   ${error.message}`);
      core.error('💡 This might be due to file size limits or format issues.');
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      errorMessage = `Unexpected error: ${message}`;
      
      core.error('❌ Unexpected Error:');
      core.error(`   ${message}`);
      if (error instanceof Error && error.stack) {
        core.debug(`Stack trace: ${error.stack}`);
      }
    }

    // Post error as GitHub comment if it's a provider error
    if (shouldPostComment) {
      await this.postErrorComment(error as ProviderError);
    }

    core.setFailed(errorMessage);
  }

  /**
   * Handle provider-specific errors with detailed guidance
   */
  async handleProviderError(error: ProviderError, filename?: string): Promise<void> {
    try {
      await this.postErrorComment(error, filename);
      core.info(`✅ Error details for ${filename || 'general error'} posted to PR comment`);
    } catch (commentError) {
      core.warning(
        `Failed to post error comment: ${commentError instanceof Error ? commentError.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Post error comment to GitHub PR
   */
  private async postErrorComment(error: ProviderError, filename?: string): Promise<void> {
    try {
      const comment = this.commentBuilder.buildErrorComment(error, filename);
      core.info('💬 Posting error details to PR...');

      await this.githubClient.createComment(this.prNumber, comment);
      core.info('✅ Error details posted to PR comment');
    } catch (postError) {
      // Don't throw here - we don't want to mask the original error
      core.warning(
        `Failed to post error comment: ${postError instanceof Error ? postError.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log error with context for debugging
   */
  static logError(error: unknown, context: string): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    core.error(`[${context}] ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      core.debug(`[${context}] Stack trace: ${error.stack}`);
    }
  }

  /**
   * Create a user-friendly error message
   */
  static formatErrorForUser(error: unknown): string {
    if (error instanceof ConfigError) {
      return `Configuration issue: ${error.message}. Please check your action inputs.`;
    }
    
    if (error instanceof ProviderError) {
      return `AI Provider (${error.provider}) error: ${error.message}. Check your API key and quota.`;
    }
    
    if (error instanceof FileProcessingError) {
      return `File processing issue: ${error.message}. This might be due to file size or format.`;
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return `Unexpected error: ${message}. Please check the logs for more details.`;
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: unknown): boolean {
    if (error instanceof ProviderError) {
      // Rate limit errors are typically retryable
      return error.message.toLowerCase().includes('rate limit') ||
             error.message.toLowerCase().includes('quota') ||
             (error.statusCode !== undefined && error.statusCode >= 500);
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') ||
             message.includes('network') ||
             message.includes('connection');
    }
    
    return false;
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(error: unknown): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof ConfigError) {
      return 'high'; // Configuration errors prevent execution
    }
    
    if (error instanceof ProviderError) {
      if (error.message.includes('authentication') || error.message.includes('API key')) {
        return 'high'; // Auth errors are serious
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return 'medium'; // Quota issues are manageable
      }
      return 'medium';
    }
    
    if (error instanceof FileProcessingError) {
      return 'low'; // File processing errors affect individual files
    }
    
    return 'critical'; // Unknown errors are treated as critical
  }
}
