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
exports.ErrorHandler = void 0;
const core = __importStar(require("@actions/core"));
const types_1 = require("../types");
/**
 * Centralized error handling service
 */
class ErrorHandler {
    githubClient;
    commentBuilder;
    prNumber;
    constructor(githubClient, commentBuilder, prNumber) {
        this.githubClient = githubClient;
        this.commentBuilder = commentBuilder;
        this.prNumber = prNumber;
    }
    /**
     * Handle different types of errors with appropriate actions
     */
    async handleError(error) {
        let errorMessage = '';
        let shouldPostComment = false;
        if (error instanceof types_1.ConfigError) {
            errorMessage = `Configuration error: ${error.message}`;
            core.error('❌ Configuration Error:');
            core.error(`   ${error.message}`);
            core.error('💡 Please check your action configuration and try again.');
        }
        else if (error instanceof types_1.ProviderError) {
            errorMessage = `Provider error (${error.provider}): ${error.message}`;
            shouldPostComment = true; // Post API errors as comments
            core.error('❌ AI Provider Error:');
            core.error(`   Provider: ${error.provider}`);
            core.error(`   Status: ${error.statusCode || 'N/A'}`);
            core.error(`   Message: ${error.message}`);
            core.error('💡 Check your API key and provider configuration.');
        }
        else if (error instanceof types_1.FileProcessingError) {
            errorMessage = `File processing error: ${error.message}`;
            core.error('❌ File Processing Error:');
            core.error(`   ${error.message}`);
            core.error('💡 This might be due to file size limits or format issues.');
        }
        else {
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
            await this.postErrorComment(error);
        }
        core.setFailed(errorMessage);
    }
    /**
     * Handle provider-specific errors with detailed guidance
     */
    async handleProviderError(error, filename) {
        try {
            await this.postErrorComment(error, filename);
            core.info(`✅ Error details for ${filename || 'general error'} posted to PR comment`);
        }
        catch (commentError) {
            core.warning(`Failed to post error comment: ${commentError instanceof Error ? commentError.message : 'Unknown error'}`);
        }
    }
    /**
     * Post error comment to GitHub PR
     */
    async postErrorComment(error, filename) {
        try {
            const comment = this.commentBuilder.buildErrorComment(error, filename);
            core.info('💬 Posting error details to PR...');
            await this.githubClient.createComment(this.prNumber, comment);
            core.info('✅ Error details posted to PR comment');
        }
        catch (postError) {
            // Don't throw here - we don't want to mask the original error
            core.warning(`Failed to post error comment: ${postError instanceof Error ? postError.message : 'Unknown error'}`);
        }
    }
    /**
     * Log error with context for debugging
     */
    static logError(error, context) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        core.error(`[${context}] ${errorMessage}`);
        if (error instanceof Error && error.stack) {
            core.debug(`[${context}] Stack trace: ${error.stack}`);
        }
    }
    /**
     * Create a user-friendly error message
     */
    static formatErrorForUser(error) {
        if (error instanceof types_1.ConfigError) {
            return `Configuration issue: ${error.message}. Please check your action inputs.`;
        }
        if (error instanceof types_1.ProviderError) {
            return `AI Provider (${error.provider}) error: ${error.message}. Check your API key and quota.`;
        }
        if (error instanceof types_1.FileProcessingError) {
            return `File processing issue: ${error.message}. This might be due to file size or format.`;
        }
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return `Unexpected error: ${message}. Please check the logs for more details.`;
    }
    /**
     * Check if error is retryable
     */
    static isRetryableError(error) {
        if (error instanceof types_1.ProviderError) {
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
    static getErrorSeverity(error) {
        if (error instanceof types_1.ConfigError) {
            return 'high'; // Configuration errors prevent execution
        }
        if (error instanceof types_1.ProviderError) {
            if (error.message.includes('authentication') || error.message.includes('API key')) {
                return 'high'; // Auth errors are serious
            }
            if (error.message.includes('quota') || error.message.includes('rate limit')) {
                return 'medium'; // Quota issues are manageable
            }
            return 'medium';
        }
        if (error instanceof types_1.FileProcessingError) {
            return 'low'; // File processing errors affect individual files
        }
        return 'critical'; // Unknown errors are treated as critical
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.js.map