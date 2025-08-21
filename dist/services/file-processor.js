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
exports.FileProcessor = void 0;
const core = __importStar(require('@actions/core'));
const types_1 = require('../types');
const utils_1 = require('../utils');
const providers_1 = require('../providers');
const error_handler_1 = require('./error-handler');
/**
 * Service for processing and reviewing files
 */
class FileProcessor {
  config;
  commentBuilder;
  errorHandler;
  githubClient;
  prNumber;
  constructor(config, commentBuilder, errorHandler, githubClient, prNumber) {
    this.config = config;
    this.commentBuilder = commentBuilder;
    this.errorHandler = errorHandler;
    this.githubClient = githubClient;
    this.prNumber = prNumber;
  }
  /**
   * Get and filter changed files from PR
   */
  async getChangedFiles() {
    try {
      core.info(`📋 Fetching changed files for PR #${this.prNumber}`);
      const files = await this.githubClient.getPullRequestFiles(this.prNumber);
      const changedFiles = files.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));
      // Validate and filter text files
      const validFiles = changedFiles.filter(file => {
        if (!utils_1.FileUtils.validateFileChange(file)) {
          core.warning(`Invalid file change object for: ${file?.filename || 'unknown'}`);
          return false;
        }
        if (!utils_1.FileUtils.isTextFile(file.filename)) {
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
  filterFiles(files) {
    const filteredFiles = utils_1.FileUtils.filterFiles(
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
  async reviewFiles(files) {
    const provider = providers_1.ProviderFactory.createProvider(
      this.config.provider,
      this.config.apiKey,
    );
    const results = [];
    core.info(`🤖 Starting review with ${this.config.provider} provider`);
    core.info(`📋 Using model: ${provider.getModel?.() || 'unknown'}`);
    core.info(
      `🔄 Retry configuration: ${this.config.maxRetries} retries, ${this.config.retryDelay}ms delay`,
    );
    let totalTokens = 0;
    let totalCost = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
  async reviewSingleFile(file, fileIndex, totalFiles, provider) {
    const statusEmoji = this.getStatusEmoji(file.status);
    core.info(`🔍 [${fileIndex}/${totalFiles}] Reviewing ${statusEmoji} ${file.filename}`);
    if (!file.patch) {
      core.warning(`No patch content for file: ${file.filename}`);
      return [];
    }
    // Chunk the diff if it's too large
    const chunkedDiff = utils_1.FileUtils.chunkDiff(file, this.config.maxChunkLines);
    if (chunkedDiff.chunks.length === 0) {
      core.info(`  ⚠️ No meaningful chunks found for: ${file.filename}`);
      return [];
    }
    if (chunkedDiff.chunks.length > 1) {
      core.info(`  📄 Split into ${chunkedDiff.chunks.length} chunks for review`);
    }
    const results = [];
    // Review each chunk
    for (const chunk of chunkedDiff.chunks) {
      if (!utils_1.FileUtils.isMeaningfulChunk(chunk)) {
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
  async reviewChunk(file, chunk, totalChunks, provider) {
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
  generateSuggestionsFromComment(comment, filename, chunk) {
    const suggestions = [];
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
            side: 'RIGHT',
            startLine: startLine,
            endLine: endLine,
            startSide: 'RIGHT',
            endSide: 'RIGHT',
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
        side: 'RIGHT',
        startLine: startLine,
        endLine: endLine,
        startSide: 'RIGHT',
        endSide: 'RIGHT',
        body: comment.trim(),
      });
    }
    return suggestions;
  }
  /**
   * Handle errors during file review
   */
  async handleFileReviewError(error, file) {
    error_handler_1.ErrorHandler.logError(error, `File Review: ${file.filename}`);
    if (error instanceof types_1.ProviderError) {
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
  logFilesSummary(files) {
    const summary = utils_1.FileUtils.getChangesSummary(files);
    const totals = utils_1.FileUtils.getTotalChanges(files);
    core.info(`📊 Changes summary: ${JSON.stringify(summary)}`);
    core.info(`📈 Total changes: +${totals.additions} -${totals.deletions} (~${totals.changes})`);
  }
  /**
   * Log files to be reviewed
   */
  logFilesToReview(files) {
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
  logReviewSummary(totalTokens, totalCost) {
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
  getStatusEmoji(status) {
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
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
exports.FileProcessor = FileProcessor;
//# sourceMappingURL=file-processor.js.map
