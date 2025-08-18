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
  FileProcessingError 
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
        this.config.excludeGlobs
      );

      if (filteredFiles.length === 0) {
        core.info('No files match the include/exclude patterns');
        return;
      }

      core.info(`📁 Found ${filteredFiles.length} files to review`);

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
      this.handleError(error);
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
          core.warning(`Invalid file change object for: ${file.filename}`);
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
        `Failed to fetch changed files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async reviewFiles(files: FileChange[]): Promise<ReviewResult[]> {
    const provider = ProviderFactory.createProvider(this.config.provider, this.config.apiKey);
    const results: ReviewResult[] = [];
    
    core.info(`🤖 Starting review with ${this.config.provider} provider`);
    
    let totalTokens = 0;
    let totalCost = 0;

    for (const file of files) {
      try {
        core.info(`🔍 Reviewing file: ${file.filename}`);
        
        if (!file.patch) {
          core.warning(`No patch content for file: ${file.filename}`);
          continue;
        }

        // Chunk the diff if it's too large
        const chunkedDiff = FileUtils.chunkDiff(file, this.config.maxChunkLines);
        
        if (chunkedDiff.chunks.length === 0) {
          core.info(`No meaningful chunks found for: ${file.filename}`);
          continue;
        }

        // Review each chunk
        for (const chunk of chunkedDiff.chunks) {
          if (!FileUtils.isMeaningfulChunk(chunk)) {
            core.debug(`Skipping non-meaningful chunk in: ${file.filename}`);
            continue;
          }

          const reviewParams = {
            diff: chunk.content,
            rules: this.config.rules,
            fileName: file.filename,
            reviewLevel: this.config.reviewLevel,
            part: chunkedDiff.chunks.length > 1 ? {
              index: chunk.index,
              total: chunk.total,
            } : undefined,
          };

          const result = await provider.review(reviewParams);
          
          if (result.comment && result.comment.trim()) {
            results.push({
              ...result,
              comment: this.formatReviewComment(result.comment, file.filename, chunk),
            });
            
            if (result.tokensUsed) totalTokens += result.tokensUsed;
            if (result.costUSD) totalCost += result.costUSD;
          }

          // Add small delay to avoid rate limiting
          await this.delay(100);
        }
      } catch (error) {
        core.error(`Failed to review ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof ProviderError) {
          // Continue with other files if one fails
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
        `Failed to post review comment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private formatReviewComment(comment: string, filename: string, chunk?: any): string {
    let formatted = `### 📄 ${filename}\n\n`;
    
    if (chunk && chunk.index && chunk.total > 1) {
      formatted += `*Part ${chunk.index} of ${chunk.total} (lines ${chunk.startLine}-${chunk.endLine})*\n\n`;
    }
    
    formatted += comment;
    
    return formatted;
  }

  private buildFinalComment(results: ReviewResult[], files: FileChange[]): string {
    const summary = FileUtils.getChangesSummary(files);
    const totals = FileUtils.getTotalChanges(files);
    const provider = results[0]?.provider || this.config.provider;
    
    let comment = `## 🤖 AI Code Review\n\n`;
    comment += `**Provider:** ${provider.toUpperCase()}\n`;
    comment += `**Files reviewed:** ${results.length} of ${files.length} changed files\n`;
    comment += `**Changes:** +${totals.additions} -${totals.deletions} (~${totals.changes} lines)\n\n`;

    if (this.config.rules.length > 0) {
      comment += `**Custom rules applied:**\n`;
      this.config.rules.forEach(rule => {
        comment += `- ${rule}\n`;
      });
      comment += `\n`;
    }

    comment += `---\n\n`;

    if (results.length === 0) {
      comment += `✅ **No issues found!** The code looks good to go.\n\n`;
    } else {
      results.forEach(result => {
        comment += `${result.comment}\n\n---\n\n`;
      });
    }

    comment += `<details>\n<summary>📊 Review Statistics</summary>\n\n`;
    comment += `- **Files changed:** ${Object.entries(summary).map(([status, count]) => `${count} ${status}`).join(', ')}\n`;
    
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
    const totalCost = results.reduce((sum, r) => sum + (r.costUSD || 0), 0);
    
    if (totalTokens > 0) {
      comment += `- **Tokens used:** ${totalTokens.toLocaleString()}\n`;
    }
    
    if (totalCost > 0) {
      comment += `- **Estimated cost:** $${totalCost.toFixed(4)}\n`;
    }
    
    comment += `\n</details>\n\n`;
    comment += `*Generated by [AI Code Review Action](https://github.com/marketplace/actions/ai-code-review)*`;

    return comment;
  }

  private handleError(error: unknown): void {
    if (error instanceof ConfigError) {
      core.setFailed(`Configuration error: ${error.message}`);
    } else if (error instanceof ProviderError) {
      core.setFailed(`Provider error (${error.provider}): ${error.message}`);
    } else if (error instanceof FileProcessingError) {
      core.setFailed(`File processing error: ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      core.setFailed(`Unexpected error: ${message}`);
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
