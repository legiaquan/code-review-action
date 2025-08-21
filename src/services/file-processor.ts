import * as core from '@actions/core';
import { FileChange, ReviewResult, ActionInputs, ProviderError } from '../types';
import { FileUtils } from '../utils';
import { ProviderFactory } from '../providers';
import { CommentBuilder } from './comment-builder';
import { ErrorHandler } from './error-handler';
import { GitHubClient } from '../github';

/**
 * Service for processing and reviewing files
 */
export class FileProcessor {
  constructor(
    private config: ActionInputs,
    private commentBuilder: CommentBuilder,
    private errorHandler: ErrorHandler,
    private githubClient: GitHubClient,
    private prNumber: number,
  ) {}

  /**
   * Get and filter changed files from PR
   */
  async getChangedFiles(): Promise<FileChange[]> {
    try {
      core.info(`📋 Fetching changed files for PR #${this.prNumber}`);

      const files = await this.githubClient.getPullRequestFiles(this.prNumber);

      const changedFiles: FileChange[] = files.map(file => ({
        filename: file.filename,
        status: file.status as FileChange['status'],
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));

      // Validate and filter text files
      const validFiles = changedFiles.filter(file => {
        if (!FileUtils.validateFileChange(file)) {
          core.warning(`Invalid file change object for: ${(file as any)?.filename || 'unknown'}`);
          return false;
        }

        if (!FileUtils.isTextFile(file.filename)) {
          core.debug(`Skipping non-text file: ${file.filename}`);
          return false;
        }

        return true;
      });

      this.logFilesSummary(validFiles);
      return validFiles;
    } catch (error) {
      throw new Error(
        `Failed to fetch changed files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Filter files based on include/exclude patterns
   */
  filterFiles(files: FileChange[]): FileChange[] {
    const filteredFiles = FileUtils.filterFiles(
      files,
      this.config.includeGlobs,
      this.config.excludeGlobs,
    );

    if (filteredFiles.length === 0) {
      core.info('No files match the include/exclude patterns');
      return [];
    }

    core.info(`📁 Found ${filteredFiles.length} files to review`);
    this.logFilesToReview(filteredFiles);

    return filteredFiles;
  }

  /**
   * Review all files and return results
   */
  async reviewFiles(files: FileChange[]): Promise<ReviewResult[]> {
    const provider = ProviderFactory.createProvider(this.config.provider, this.config.apiKey);
    const results: ReviewResult[] = [];

    core.info(`🤖 Starting review with ${this.config.provider} provider`);
    core.info(`📋 Using model: ${(provider as any).getModel?.() || 'unknown'}`);
    core.info(
      `🔄 Retry configuration: ${this.config.maxRetries} retries, ${this.config.retryDelay}ms delay`,
    );

    let totalTokens = 0;
    let totalCost = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      try {
        const fileResults = await this.reviewSingleFile(file, i + 1, files.length, provider);
        results.push(...fileResults);

        // Update totals
        fileResults.forEach(result => {
          if (result.tokensUsed) totalTokens += result.tokensUsed;
          if (result.costUSD) totalCost += result.costUSD;
        });

        // Add small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        await this.handleFileReviewError(error, file);
      }
    }

    this.logReviewSummary(totalTokens, totalCost);
    return results;
  }

  /**
   * Review a single file
   */
  private async reviewSingleFile(
    file: FileChange,
    fileIndex: number,
    totalFiles: number,
    provider: any,
  ): Promise<ReviewResult[]> {
    const statusEmoji = this.getStatusEmoji(file.status);
    core.info(`🔍 [${fileIndex}/${totalFiles}] Reviewing ${statusEmoji} ${file.filename}`);

    if (!file.patch) {
      core.warning(`No patch content for file: ${file.filename}`);
      return [];
    }

    // Chunk the diff if it's too large
    const chunkedDiff = FileUtils.chunkDiff(file, this.config.maxChunkLines);

    if (chunkedDiff.chunks.length === 0) {
      core.info(`  ⚠️ No meaningful chunks found for: ${file.filename}`);
      return [];
    }

    if (chunkedDiff.chunks.length > 1) {
      core.info(`  📄 Split into ${chunkedDiff.chunks.length} chunks for review`);
    }

    const results: ReviewResult[] = [];

    // Review each chunk
    for (const chunk of chunkedDiff.chunks) {
      if (!FileUtils.isMeaningfulChunk(chunk)) {
        core.debug(`  ⏭️ Skipping non-meaningful chunk in: ${file.filename}`);
        continue;
      }

      const chunkResult = await this.reviewChunk(file, chunk, chunkedDiff.chunks.length, provider);
      if (chunkResult) {
        results.push(chunkResult);
      }
    }

    return results;
  }

  /**
   * Review a single chunk
   */
  private async reviewChunk(
    file: FileChange,
    chunk: any,
    totalChunks: number,
    provider: any,
  ): Promise<ReviewResult | null> {
    if (totalChunks > 1) {
      core.info(
        `    🔎 Reviewing chunk ${chunk.index}/${chunk.total} (lines ${chunk.startLine}-${chunk.endLine})`,
      );
    }

    const reviewParams = {
      diff: chunk.content,
      rules: this.config.rules,
      fileName: file.filename,
      reviewLevel: this.config.reviewLevel,
      part:
        totalChunks > 1
          ? {
              index: chunk.index,
              total: chunk.total,
            }
          : undefined,
    };

    const result = await provider.review(
      reviewParams,
      this.config.maxRetries,
      this.config.retryDelay,
    );

    if (result.comment && result.comment.trim()) {
      core.info(`    ✅ Review completed - Found issues to report`);

      // Generate suggestions based on the review comment
      const suggestions = this.generateSuggestionsFromComment(result.comment, file.filename, chunk);

      return {
        ...result,
        comment: this.commentBuilder.formatReviewComment(result.comment, file.filename, chunk),
        suggestions,
      };
    } else {
      core.info(`    ✅ Review completed - No issues found`);
      return null;
    }
  }

  /**
   * Generate code suggestions from review comment
   */
  private generateSuggestionsFromComment(comment: string, filename: string, chunk: any): any[] {
    const suggestions: any[] = [];

    // Extract line numbers from the chunk
    const startLine = chunk.startLine || 1;
    const endLine = chunk.endLine || startLine;

    // Split comment into actionable items
    const lines = comment.split('\n').filter(line => line.trim().length > 0);

    lines.forEach((line, index) => {
      // Look for patterns that suggest code changes
      if (line.includes('•') || line.includes('-') || line.includes('*')) {
        const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();

        if (cleanLine.length > 10) {
          // Only create suggestions for substantial feedback
          suggestions.push({
            path: filename,
            line: startLine + Math.floor((index / lines.length) * (endLine - startLine)),
            side: 'RIGHT' as const,
            startLine: startLine,
            endLine: endLine,
            startSide: 'RIGHT' as const,
            endSide: 'RIGHT' as const,
            body: cleanLine,
          });
        }
      }
    });

    // If no structured suggestions found, create one general suggestion
    if (suggestions.length === 0 && comment.trim().length > 20) {
      suggestions.push({
        path: filename,
        line: startLine,
        side: 'RIGHT' as const,
        startLine: startLine,
        endLine: endLine,
        startSide: 'RIGHT' as const,
        endSide: 'RIGHT' as const,
        body: comment.trim(),
      });
    }

    return suggestions;
  }

  /**
   * Handle errors during file review
   */
  private async handleFileReviewError(error: unknown, file: FileChange): Promise<void> {
    ErrorHandler.logError(error, `File Review: ${file.filename}`);

    if (error instanceof ProviderError) {
      // Post error comment for this specific file and continue with others
      await this.errorHandler.handleProviderError(error, file.filename);
      return; // Continue with other files
    }

    // For non-provider errors, re-throw to stop the process
    throw error;
  }

  /**
   * Log files summary
   */
  private logFilesSummary(files: FileChange[]): void {
    const summary = FileUtils.getChangesSummary(files);
    const totals = FileUtils.getTotalChanges(files);

    core.info(`📊 Changes summary: ${JSON.stringify(summary)}`);
    core.info(`📈 Total changes: +${totals.additions} -${totals.deletions} (~${totals.changes})`);
  }

  /**
   * Log files to be reviewed
   */
  private logFilesToReview(files: FileChange[]): void {
    core.startGroup('📋 Files to be reviewed:');
    files.forEach((file, index) => {
      const statusEmoji = this.getStatusEmoji(file.status);
      core.info(
        `  ${index + 1}. ${statusEmoji} ${file.filename} (+${file.additions} -${file.deletions})`,
      );
    });
    core.endGroup();
  }

  /**
   * Log review summary
   */
  private logReviewSummary(totalTokens: number, totalCost: number): void {
    if (totalTokens > 0) {
      core.info(`📊 Total tokens used: ${totalTokens.toLocaleString()}`);
    }

    if (totalCost > 0) {
      core.info(`💰 Estimated cost: $${totalCost.toFixed(4)}`);
    }
  }

  /**
   * Get emoji for file status
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'added':
        return '🆕';
      case 'modified':
        return '📝';
      case 'removed':
        return '🗑️';
      case 'renamed':
        return '📋';
      default:
        return '📄';
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
