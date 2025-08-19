import * as core from '@actions/core';
import { Config } from '../utils';
import { GitHubClient } from '../github';
import { CommentBuilder, ErrorHandler, FileProcessor } from '../services';
import { ActionInputs } from '../types';

/**
 * Main AI Code Review application class
 */
export class AICodeReview {
  private config: ActionInputs;
  private githubClient: GitHubClient;
  private commentBuilder: CommentBuilder;
  private errorHandler: ErrorHandler;
  private fileProcessor: FileProcessor;
  private prNumber: number;

  constructor() {
    // Load configuration
    this.config = Config.loadFromInputs();
    
    // Get repository info and PR number
    const repoInfo = Config.getRepoInfo();
    this.prNumber = Config.getPullRequestNumber();
    
    // Initialize services
    this.githubClient = new GitHubClient(repoInfo);
    this.commentBuilder = new CommentBuilder(this.config);
    this.errorHandler = new ErrorHandler(this.githubClient, this.commentBuilder, this.prNumber);
    this.fileProcessor = new FileProcessor(
      this.config,
      this.commentBuilder,
      this.errorHandler,
      this.githubClient,
      this.prNumber
    );
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    try {
      core.info('🚀 Starting AI Code Review...');

      // Get and filter changed files from PR
      const changedFiles = await this.fileProcessor.getChangedFiles();

      if (changedFiles.length === 0) {
        core.info('No files to review');
        return;
      }

      // Filter files based on patterns
      const filteredFiles = this.fileProcessor.filterFiles(changedFiles);

      if (filteredFiles.length === 0) {
        core.info('No files match the include/exclude patterns');
        return;
      }

      // Review files
      const reviewResults = await this.fileProcessor.reviewFiles(filteredFiles);

      // Post review comment
      if (reviewResults.length > 0) {
        await this.postReviewComment(reviewResults, filteredFiles);
      } else {
        core.info('No review comments generated');
      }

      core.info('✅ AI Code Review completed successfully');
    } catch (error) {
      await this.errorHandler.handleError(error);
    }
  }

  /**
   * Post the final review comment to GitHub
   */
  private async postReviewComment(reviewResults: any[], files: any[]): Promise<void> {
    try {
      const comment = this.commentBuilder.buildFinalComment(reviewResults, files);
      core.info('💬 Posting review comment to PR...');

      await this.githubClient.createComment(this.prNumber, comment);
      core.info('✅ Review comment posted successfully');
    } catch (error) {
      core.error(`Failed to post review comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
export async function main(): Promise<void> {
  const review = new AICodeReview();
  await review.run();
}

// Run the action if this is the main module
if (require.main === module) {
  main().catch(error => {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  });
}
