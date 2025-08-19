import * as core from '@actions/core';
import * as github from '@actions/github';
import { Config } from './config';
import { FileUtils } from './file-utils';
import { ProviderFactory } from './providers';
import {
  ActionInputs,
  FileChange,
  ReviewResult,
  ProviderError,
  ConfigError,
  FileProcessingError,
} from './types';

class AICodeReview {
  private config: ActionInputs;
  private octokit: ReturnType<typeof github.getOctokit>;
  private repoInfo: { owner: string; repo: string };
  private prNumber: number;

  constructor() {
    this.config = Config.loadFromInputs();
    this.octokit = github.getOctokit(Config.getGitHubToken());
    this.repoInfo = Config.getRepoInfo();
    this.prNumber = Config.getPullRequestNumber();
  }

  async run(): Promise<void> {
    try {
      core.info('🚀 Starting AI Code Review...');

      // Get changed files from PR
      const changedFiles = await this.getChangedFiles();

      if (changedFiles.length === 0) {
        core.info('No files to review');
        return;
      }

      // Filter files based on patterns
      const filteredFiles = FileUtils.filterFiles(
        changedFiles,
        this.config.includeGlobs,
        this.config.excludeGlobs,
      );

      if (filteredFiles.length === 0) {
        core.info('No files match the include/exclude patterns');
        return;
      }

      core.info(`📁 Found ${filteredFiles.length} files to review`);

      // Log all files that will be reviewed
      core.startGroup('📋 Files to be reviewed:');
      filteredFiles.forEach((file, index) => {
        const statusEmoji = this.getStatusEmoji(file.status);
        core.info(
          `  ${index + 1}. ${statusEmoji} ${file.filename} (+${file.additions} -${file.deletions})`,
        );
      });
      core.endGroup();

      // Review files
      const reviewResults = await this.reviewFiles(filteredFiles);

      // Post review comment
      if (reviewResults.length > 0) {
        await this.postReviewComment(reviewResults, filteredFiles);
      } else {
        core.info('No review comments generated');
      }

      core.info('✅ AI Code Review completed successfully');
    } catch (error) {
      await this.handleError(error);
    }
  }

  private async getChangedFiles(): Promise<FileChange[]> {
    try {
      core.info(`📋 Fetching changed files for PR #${this.prNumber}`);

      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner: this.repoInfo.owner,
        repo: this.repoInfo.repo,
        pull_number: this.prNumber,
        per_page: 100,
      });

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

      const summary = FileUtils.getChangesSummary(validFiles);
      const totals = FileUtils.getTotalChanges(validFiles);

      core.info(`📊 Changes summary: ${JSON.stringify(summary)}`);
      core.info(`📈 Total changes: +${totals.additions} -${totals.deletions} (~${totals.changes})`);

      return validFiles;
    } catch (error) {
      throw new FileProcessingError(
        `Failed to fetch changed files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async reviewFiles(files: FileChange[]): Promise<ReviewResult[]> {
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
        const statusEmoji = this.getStatusEmoji(file.status);
        core.info(`🔍 [${i + 1}/${files.length}] Reviewing ${statusEmoji} ${file.filename}`);

        if (!file.patch) {
          core.warning(`No patch content for file: ${file.filename}`);
          continue;
        }

        // Chunk the diff if it's too large
        const chunkedDiff = FileUtils.chunkDiff(file, this.config.maxChunkLines);

        if (chunkedDiff.chunks.length === 0) {
          core.info(`  ⚠️ No meaningful chunks found for: ${file.filename}`);
          continue;
        }

        if (chunkedDiff.chunks.length > 1) {
          core.info(`  📄 Split into ${chunkedDiff.chunks.length} chunks for review`);
        }

        // Review each chunk
        for (const chunk of chunkedDiff.chunks) {
          if (!FileUtils.isMeaningfulChunk(chunk)) {
            core.debug(`  ⏭️ Skipping non-meaningful chunk in: ${file.filename}`);
            continue;
          }

          if (chunkedDiff.chunks.length > 1) {
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
              chunkedDiff.chunks.length > 1
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
            results.push({
              ...result,
              comment: this.formatReviewComment(result.comment, file.filename, chunk),
            });

            if (result.tokensUsed) totalTokens += result.tokensUsed;
            if (result.costUSD) totalCost += result.costUSD;

            core.info(`    ✅ Review completed - Found issues to report`);
          } else {
            core.info(`    ✅ Review completed - No issues found`);
          }

          // Add small delay to avoid rate limiting
          await this.delay(100);
        }
      } catch (error) {
        core.error(
          `Failed to review ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (error instanceof ProviderError) {
          // Post error comment for this specific file and continue with others
          try {
            await this.postErrorComment(error, file.filename);
            core.info(`✅ Error details for ${file.filename} posted to PR comment`);
          } catch (commentError) {
            core.warning(
              `Failed to post error comment for ${file.filename}: ${commentError instanceof Error ? commentError.message : 'Unknown error'}`,
            );
          }
          continue;
        }

        throw error;
      }
    }

    if (totalTokens > 0) {
      core.info(`📊 Total tokens used: ${totalTokens.toLocaleString()}`);
    }

    if (totalCost > 0) {
      core.info(`💰 Estimated cost: $${totalCost.toFixed(4)}`);
    }

    return results;
  }

  private async postReviewComment(results: ReviewResult[], files: FileChange[]): Promise<void> {
    try {
      const comment = this.buildFinalComment(results, files);

      core.info('💬 Posting review comment to PR...');

      await this.octokit.rest.issues.createComment({
        owner: this.repoInfo.owner,
        repo: this.repoInfo.repo,
        issue_number: this.prNumber,
        body: comment,
      });

      core.info('✅ Review comment posted successfully');
    } catch (error) {
      throw new Error(
        `Failed to post review comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async postErrorComment(error: ProviderError, filename?: string): Promise<void> {
    try {
      const comment = this.buildErrorComment(error, filename);

      core.info('💬 Posting error details to PR...');

      await this.octokit.rest.issues.createComment({
        owner: this.repoInfo.owner,
        repo: this.repoInfo.repo,
        issue_number: this.prNumber,
        body: comment,
      });
    } catch (postError) {
      // Don't throw here - we don't want to mask the original error
      core.warning(
        `Failed to post error comment: ${postError instanceof Error ? postError.message : 'Unknown error'}`,
      );
    }
  }

  private formatReviewComment(comment: string, filename: string, chunk?: any): string {
    let formatted = `📄 **${filename}**`;

    if (chunk && chunk.index && chunk.total > 1) {
      formatted += ` *(Part ${chunk.index}/${chunk.total} - Lines ${chunk.startLine}-${chunk.endLine})*`;
    }

    formatted += `\n\n`;

    // Clean up the comment and add proper formatting
    const cleanComment = comment.trim();

    // Add some structure to the comment if it doesn't have any
    if (
      !cleanComment.includes('##') &&
      !cleanComment.includes('**') &&
      !cleanComment.includes('-')
    ) {
      // Split into sentences and format as bullet points if multiple issues
      const sentences = cleanComment.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 1) {
        formatted += sentences.map(sentence => `• ${sentence.trim()}`).join('\n') + '\n';
      } else {
        formatted += `💡 ${cleanComment}\n`;
      }
    } else {
      formatted += cleanComment;
    }

    return formatted;
  }

  private buildFinalComment(results: ReviewResult[], files: FileChange[]): string {
    const summary = FileUtils.getChangesSummary(files);
    const totals = FileUtils.getTotalChanges(files);
    const provider = results[0]?.provider || this.config.provider;
    const reviewedFilesCount = new Set(results.map(r => r.comment.match(/### 📄 (.+)/)?.[1])).size;

    let comment = `## 🤖 AI Code Review Report\n\n`;

    // Summary section with better formatting
    comment += `### 📊 Review Summary\n`;
    comment += `| Metric | Value |\n`;
    comment += `|--------|-------|\n`;
    comment += `| **🤖 AI Provider** | ${provider.toUpperCase()} |\n`;
    comment += `| **📁 Files Changed** | ${files.length} |\n`;
    comment += `| **🔍 Files Reviewed** | ${reviewedFilesCount} |\n`;
    comment += `| **📈 Total Changes** | +${totals.additions} -${totals.deletions} (~${totals.changes} lines) |\n`;
    comment += `| **🎯 Issues Found** | ${results.length} |\n\n`;

    // Files breakdown
    comment += `### 📋 Files Overview\n`;
    files.forEach(file => {
      const statusEmoji = this.getStatusEmoji(file.status);
      const hasReview = results.some(r => r.comment.includes(file.filename));
      const reviewStatus = hasReview ? '🔍 Reviewed' : '✅ Clean';
      comment += `- ${statusEmoji} \`${file.filename}\` (+${file.additions} -${file.deletions}) - ${reviewStatus}\n`;
    });
    comment += `\n`;

    if (this.config.rules.length > 0) {
      comment += `### 📝 Review Rules Applied\n`;
      this.config.rules.forEach((rule, index) => {
        comment += `${index + 1}. ${rule}\n`;
      });
      comment += `\n`;
    }

    comment += `---\n\n`;

    if (results.length === 0) {
      comment += `## ✅ Excellent Work!\n\n`;
      comment += `🎉 **No issues found!** Your code looks clean and follows best practices.\n\n`;
      comment += `All ${files.length} changed file(s) have been reviewed and everything looks good to go! 🚀\n\n`;
    } else {
      comment += `## 🔍 Detailed Review Comments\n\n`;
      results.forEach((result, index) => {
        comment += `### ${index + 1}. ${result.comment}\n\n`;
        if (index < results.length - 1) {
          comment += `---\n\n`;
        }
      });
    }

    // Statistics in collapsible section
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);

    comment += `\n<details>\n<summary>🔢 Technical Details</summary>\n\n`;
    comment += `**File Status Breakdown:**\n`;
    Object.entries(summary).forEach(([status, count]) => {
      const emoji = this.getStatusEmoji(status);
      comment += `- ${emoji} ${status}: ${count} file(s)\n`;
    });

    if (totalTokens > 0 || totalCost > 0) {
      comment += `\n**AI Usage:**\n`;
      if (totalTokens > 0) {
        comment += `- Tokens consumed: ${totalTokens.toLocaleString()}\n`;
      }
      if (totalCost > 0) {
        comment += `- Estimated cost: $${totalCost.toFixed(4)}\n`;
      }
    }

    comment += `\n**Review Configuration:**\n`;
    comment += `- Provider: ${provider}\n`;
    comment += `- Review Level: ${this.config.reviewLevel}\n`;
    comment += `- Max Chunk Lines: ${this.config.maxChunkLines}\n`;
    comment += `- Custom Rules: ${this.config.rules.length > 0 ? 'Yes' : 'No'}\n`;

    comment += `\n</details>\n\n`;
    comment += `---\n`;
    comment += `<sub>🤖 Generated by [AI Code Review Action](https://github.com/legiaquan/code-review-action) • Review ID: \`${Date.now()}\`</sub>`;

    return comment;
  }

  private buildErrorComment(error: ProviderError, filename?: string): string {
    const timestamp = new Date().toISOString();

    let comment = `## ❌ AI Code Review Error\n\n`;

    comment += `**Provider:** ${error.provider.toUpperCase()}\n`;
    comment += `**Time:** ${timestamp}\n`;
    comment += `**Status Code:** ${error.statusCode || 'N/A'}\n`;
    if (filename) {
      comment += `**File:** ${filename}\n`;
    }
    comment += `\n`;

    comment += `### 🚨 Error Details\n\n`;
    comment += `\`\`\`\n${error.message}\n\`\`\`\n\n`;

    // Add helpful suggestions based on the error type
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      comment += `### 💡 Suggested Actions\n\n`;
      comment += `This appears to be a quota or rate limit error. Here are some options:\n\n`;
      comment += `1. **Wait and retry** - The error message may include a retry delay\n`;
      comment += `2. **Check your API plan** - You may need to upgrade your ${error.provider} API plan\n`;
      comment += `3. **Use a different provider** - Consider switching to OpenAI or another provider\n`;
      comment += `4. **Review usage patterns** - Check if you're making too many requests\n\n`;

      if (error.provider === 'gemini') {
        comment += `For Gemini specifically:\n`;
        comment += `- Free tier has daily and per-minute limits\n`;
        comment += `- Consider upgrading to a paid plan for higher quotas\n`;
        comment += `- See [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) for details\n\n`;
      }
    } else if (error.message.includes('authentication') || error.message.includes('API key')) {
      comment += `### 💡 Suggested Actions\n\n`;
      comment += `This appears to be an authentication error:\n\n`;
      comment += `1. **Verify API key** - Check that your ${error.provider.toUpperCase()}_API_KEY secret is correctly set\n`;
      comment += `2. **Check key permissions** - Ensure the API key has the necessary permissions\n`;
      comment += `3. **Key expiration** - Some API keys may have expiration dates\n\n`;
    } else {
      comment += `### 💡 Suggested Actions\n\n`;
      comment += `1. **Check the error message** above for specific details\n`;
      comment += `2. **Verify your ${error.provider} API configuration**\n`;
      comment += `3. **Try again** - This might be a temporary issue\n`;
      comment += `4. **Contact support** if the problem persists\n\n`;
    }

    comment += `### 🔧 Next Steps\n\n`;
    comment += `- The code review action will be marked as failed\n`;
    comment += `- You can re-run the action after addressing the issue\n`;
    comment += `- Consider checking the GitHub Actions logs for more details\n\n`;

    comment += `---\n`;
    comment += `<sub>🤖 Generated by [AI Code Review Action](https://github.com/legiaquan/code-review-action) • Error ID: \`${Date.now()}\`</sub>`;

    return comment;
  }

  private async handleError(error: unknown): Promise<void> {
    let errorMessage = '';
    let shouldPostComment = false;

    if (error instanceof ConfigError) {
      errorMessage = `Configuration error: ${error.message}`;
    } else if (error instanceof ProviderError) {
      errorMessage = `Provider error (${error.provider}): ${error.message}`;
      shouldPostComment = true; // Post API errors as comments
    } else if (error instanceof FileProcessingError) {
      errorMessage = `File processing error: ${error.message}`;
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      errorMessage = `Unexpected error: ${message}`;
    }

    // Post error as GitHub comment if it's a provider error
    if (shouldPostComment) {
      try {
        await this.postErrorComment(error as ProviderError);
        core.info('✅ Error details posted to PR comment');
      } catch (commentError) {
        core.warning(
          `Failed to post error comment: ${commentError instanceof Error ? commentError.message : 'Unknown error'}`,
        );
      }
    }

    core.setFailed(errorMessage);
  }

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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main(): Promise<void> {
  const review = new AICodeReview();
  await review.run();
}

// Run the action
if (require.main === module) {
  main().catch(error => {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  });
}

export { AICodeReview, main };
