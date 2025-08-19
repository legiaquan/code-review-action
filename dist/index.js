"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICodeReview = void 0;
exports.main = main;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const config_1 = require("./config");
const file_utils_1 = require("./file-utils");
const providers_1 = require("./providers");
const types_1 = require("./types");
class AICodeReview {
    config;
    octokit;
    repoInfo;
    prNumber;
    constructor() {
        this.config = config_1.Config.loadFromInputs();
        this.octokit = github.getOctokit(config_1.Config.getGitHubToken());
        this.repoInfo = config_1.Config.getRepoInfo();
        this.prNumber = config_1.Config.getPullRequestNumber();
    }
    async run() {
        try {
            core.info('🚀 Starting AI Code Review...');
            // Get changed files from PR
            const changedFiles = await this.getChangedFiles();
            if (changedFiles.length === 0) {
                core.info('No files to review');
                return;
            }
            // Filter files based on patterns
            const filteredFiles = file_utils_1.FileUtils.filterFiles(changedFiles, this.config.includeGlobs, this.config.excludeGlobs);
            if (filteredFiles.length === 0) {
                core.info('No files match the include/exclude patterns');
                return;
            }
            core.info(`📁 Found ${filteredFiles.length} files to review`);
            // Log all files that will be reviewed
            core.startGroup('📋 Files to be reviewed:');
            filteredFiles.forEach((file, index) => {
                const statusEmoji = this.getStatusEmoji(file.status);
                core.info(`  ${index + 1}. ${statusEmoji} ${file.filename} (+${file.additions} -${file.deletions})`);
            });
            core.endGroup();
            // Review files
            const reviewResults = await this.reviewFiles(filteredFiles);
            // Post review comment
            if (reviewResults.length > 0) {
                await this.postReviewComment(reviewResults, filteredFiles);
            }
            else {
                core.info('No review comments generated');
            }
            core.info('✅ AI Code Review completed successfully');
        }
        catch (error) {
            this.handleError(error);
        }
    }
    async getChangedFiles() {
        try {
            core.info(`📋 Fetching changed files for PR #${this.prNumber}`);
            const { data: files } = await this.octokit.rest.pulls.listFiles({
                owner: this.repoInfo.owner,
                repo: this.repoInfo.repo,
                pull_number: this.prNumber,
                per_page: 100,
            });
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
                if (!file_utils_1.FileUtils.validateFileChange(file)) {
                    core.warning(`Invalid file change object for: ${file?.filename || 'unknown'}`);
                    return false;
                }
                if (!file_utils_1.FileUtils.isTextFile(file.filename)) {
                    core.debug(`Skipping non-text file: ${file.filename}`);
                    return false;
                }
                return true;
            });
            const summary = file_utils_1.FileUtils.getChangesSummary(validFiles);
            const totals = file_utils_1.FileUtils.getTotalChanges(validFiles);
            core.info(`📊 Changes summary: ${JSON.stringify(summary)}`);
            core.info(`📈 Total changes: +${totals.additions} -${totals.deletions} (~${totals.changes})`);
            return validFiles;
        }
        catch (error) {
            throw new types_1.FileProcessingError(`Failed to fetch changed files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async reviewFiles(files) {
        const provider = providers_1.ProviderFactory.createProvider(this.config.provider, this.config.apiKey);
        const results = [];
        core.info(`🤖 Starting review with ${this.config.provider} provider`);
        let totalTokens = 0;
        let totalCost = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const statusEmoji = this.getStatusEmoji(file.status);
                core.info(`🔍 [${i + 1}/${files.length}] Reviewing ${statusEmoji} ${file.filename}`);
                if (!file.patch) {
                    core.warning(`No patch content for file: ${file.filename}`);
                    continue;
                }
                // Chunk the diff if it's too large
                const chunkedDiff = file_utils_1.FileUtils.chunkDiff(file, this.config.maxChunkLines);
                if (chunkedDiff.chunks.length === 0) {
                    core.info(`  ⚠️ No meaningful chunks found for: ${file.filename}`);
                    continue;
                }
                if (chunkedDiff.chunks.length > 1) {
                    core.info(`  📄 Split into ${chunkedDiff.chunks.length} chunks for review`);
                }
                // Review each chunk
                for (const chunk of chunkedDiff.chunks) {
                    if (!file_utils_1.FileUtils.isMeaningfulChunk(chunk)) {
                        core.debug(`  ⏭️ Skipping non-meaningful chunk in: ${file.filename}`);
                        continue;
                    }
                    if (chunkedDiff.chunks.length > 1) {
                        core.info(`    🔎 Reviewing chunk ${chunk.index}/${chunk.total} (lines ${chunk.startLine}-${chunk.endLine})`);
                    }
                    const reviewParams = {
                        diff: chunk.content,
                        rules: this.config.rules,
                        fileName: file.filename,
                        reviewLevel: this.config.reviewLevel,
                        part: chunkedDiff.chunks.length > 1
                            ? {
                                index: chunk.index,
                                total: chunk.total,
                            }
                            : undefined,
                    };
                    const result = await provider.review(reviewParams);
                    if (result.comment && result.comment.trim()) {
                        results.push({
                            ...result,
                            comment: this.formatReviewComment(result.comment, file.filename, chunk),
                        });
                        if (result.tokensUsed)
                            totalTokens += result.tokensUsed;
                        if (result.costUSD)
                            totalCost += result.costUSD;
                        core.info(`    ✅ Review completed - Found issues to report`);
                    }
                    else {
                        core.info(`    ✅ Review completed - No issues found`);
                    }
                    // Add small delay to avoid rate limiting
                    await this.delay(100);
                }
            }
            catch (error) {
                core.error(`Failed to review ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                if (error instanceof types_1.ProviderError) {
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
    async postReviewComment(results, files) {
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
        }
        catch (error) {
            throw new Error(`Failed to post review comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    formatReviewComment(comment, filename, chunk) {
        let formatted = `📄 **${filename}**`;
        if (chunk && chunk.index && chunk.total > 1) {
            formatted += ` *(Part ${chunk.index}/${chunk.total} - Lines ${chunk.startLine}-${chunk.endLine})*`;
        }
        formatted += `\n\n`;
        // Clean up the comment and add proper formatting
        const cleanComment = comment.trim();
        // Add some structure to the comment if it doesn't have any
        if (!cleanComment.includes('##') &&
            !cleanComment.includes('**') &&
            !cleanComment.includes('-')) {
            // Split into sentences and format as bullet points if multiple issues
            const sentences = cleanComment.split(/[.!?]+/).filter(s => s.trim().length > 0);
            if (sentences.length > 1) {
                formatted += sentences.map(sentence => `• ${sentence.trim()}`).join('\n') + '\n';
            }
            else {
                formatted += `💡 ${cleanComment}\n`;
            }
        }
        else {
            formatted += cleanComment;
        }
        return formatted;
    }
    buildFinalComment(results, files) {
        const summary = file_utils_1.FileUtils.getChangesSummary(files);
        const totals = file_utils_1.FileUtils.getTotalChanges(files);
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
        }
        else {
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
    handleError(error) {
        if (error instanceof types_1.ConfigError) {
            core.setFailed(`Configuration error: ${error.message}`);
        }
        else if (error instanceof types_1.ProviderError) {
            core.setFailed(`Provider error (${error.provider}): ${error.message}`);
        }
        else if (error instanceof types_1.FileProcessingError) {
            core.setFailed(`File processing error: ${error.message}`);
        }
        else {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            core.setFailed(`Unexpected error: ${message}`);
        }
    }
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AICodeReview = AICodeReview;
// Main execution
async function main() {
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
//# sourceMappingURL=index.js.map