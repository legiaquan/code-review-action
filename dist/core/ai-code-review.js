'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.AICodeReview = void 0;
exports.main = main;
const core = __importStar(require('@actions/core'));
const utils_1 = require('../utils');
const github_1 = require('../github');
const services_1 = require('../services');
/**
 * Main AI Code Review application class
 */
class AICodeReview {
  config;
  githubClient;
  commentBuilder;
  errorHandler;
  fileProcessor;
  prNumber;
  constructor() {
    // Load configuration
    this.config = utils_1.Config.loadFromInputs();
    // Initialize placeholders; actual initialization happens in init()
    const repoInfo = utils_1.Config.getRepoInfo();
    this.githubClient = new github_1.GitHubClient(repoInfo);
    this.commentBuilder = new services_1.CommentBuilder(this.config);
    // prNumber and errorHandler/fileProcessor will be finalized in init()
    this.prNumber = 0;
    this.errorHandler = new services_1.ErrorHandler(this.githubClient, this.commentBuilder, 0);
    this.fileProcessor = new services_1.FileProcessor(
      this.config,
      this.commentBuilder,
      this.errorHandler,
      this.githubClient,
      0,
    );
  }
  async init() {
    // Resolve PR number with context first, then Octokit fallbacks
    this.prNumber = await utils_1.Config.getPullRequestNumberAsync();
    // Recreate services that rely on prNumber
    this.errorHandler = new services_1.ErrorHandler(
      this.githubClient,
      this.commentBuilder,
      this.prNumber,
    );
    this.fileProcessor = new services_1.FileProcessor(
      this.config,
      this.commentBuilder,
      this.errorHandler,
      this.githubClient,
      this.prNumber,
    );
  }
  /**
   * Main execution method
   */
  async run() {
    try {
      core.info('🚀 Starting AI Code Review...');
      await this.init();
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
  async postReviewComment(reviewResults, files) {
    try {
      const comment = this.commentBuilder.buildFinalComment(reviewResults, files);
      core.info('💬 Posting review comment to PR...');
      await this.githubClient.createComment(this.prNumber, comment);
      core.info('✅ Review comment posted successfully');
    } catch (error) {
      core.error(
        `Failed to post review comment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
exports.AICodeReview = AICodeReview;
/**
 * Main execution function
 */
async function main() {
  const review = new AICodeReview();
  await review.run();
}
//# sourceMappingURL=ai-code-review.js.map
