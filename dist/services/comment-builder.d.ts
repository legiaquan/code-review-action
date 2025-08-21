import { FileChange, ReviewResult, ProviderError, ActionInputs, GitHubReview } from '../types';
/**
 * Service for building various types of comments for GitHub PRs
 */
export declare class CommentBuilder {
  private config;
  constructor(config: ActionInputs);
  /**
   * Format a review comment with proper structure
   */
  formatReviewComment(comment: string, filename: string, chunk?: any): string;
  /**
   * Build the final comprehensive review comment
   */
  buildFinalComment(results: ReviewResult[], files: FileChange[]): string;
  /**
   * Build error comment for provider errors
   */
  buildErrorComment(error: ProviderError, filename?: string): string;
  /**
   * Build a GitHub review with suggestions for individual changes
   */
  buildReviewWithSuggestions(results: ReviewResult[], files: FileChange[]): GitHubReview;
  /**
   * Build the main review body (summary)
   */
  private buildReviewBody;
  /**
   * Format a comment for suggestion display
   */
  private formatSuggestionComment;
  /**
   * Extract filename from comment text
   */
  private extractFilenameFromComment;
  /**
   * Build summary section of the review comment
   */
  private buildSummarySection;
  /**
   * Build files overview section
   */
  private buildFilesOverviewSection;
  /**
   * Build review rules section
   */
  private buildReviewRulesSection;
  /**
   * Build no issues found section
   */
  private buildNoIssuesSection;
  /**
   * Build detailed review comments section
   */
  private buildDetailedReviewSection;
  /**
   * Build technical details section
   */
  private buildTechnicalDetailsSection;
  /**
   * Build error suggestions section based on error type
   */
  private buildErrorSuggestionsSection;
  /**
   * Build footer section
   */
  private buildFooter;
  /**
   * Get emoji for file status
   */
  private getStatusEmoji;
}
//# sourceMappingURL=comment-builder.d.ts.map
