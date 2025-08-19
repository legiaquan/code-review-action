"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessingError = exports.ConfigError = exports.ProviderError = exports.BaseProvider = void 0;
class BaseProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Get the model name being used
     */
    getModel() {
        return this.model;
    }
    /**
     * Retry mechanism with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000, operationName = 'operation') {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Don't retry on the last attempt
                if (attempt > maxRetries) {
                    break;
                }
                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    throw lastError;
                }
                // Calculate delay with exponential backoff and jitter
                const delay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 0.1 * delay; // 10% jitter
                const totalDelay = Math.min(delay + jitter, 30000); // Max 30 seconds
                // eslint-disable-next-line no-console
                console.log(`${operationName} failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms...`);
                // eslint-disable-next-line no-console
                console.log(`Error: ${lastError.message}`);
                await this.sleep(totalDelay);
            }
        }
        throw lastError || new Error('Unknown error occurred during retry attempts');
    }
    /**
     * Check if an error is retryable
     */
    isRetryableError(error) {
        if (error instanceof ProviderError) {
            // Retry on rate limit, quota, and temporary server errors
            const retryableStatusCodes = [429, 500, 502, 503, 504];
            if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
                return true;
            }
            // Retry on specific error messages
            const message = error.message.toLowerCase();
            return (message.includes('quota') ||
                message.includes('rate limit') ||
                message.includes('timeout') ||
                message.includes('temporary') ||
                message.includes('server error'));
        }
        // Retry on network errors
        if (error && typeof error === 'object' && 'message' in error) {
            const message = String(error.message || '').toLowerCase();
            return (message.includes('network') ||
                message.includes('timeout') ||
                message.includes('connection') ||
                message.includes('econnreset') ||
                message.includes('enotfound'));
        }
        return false;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    buildPrompt(params) {
        const base = `You are a senior software engineer. Act as a rigorous code reviewer.
Review the following patch and produce:
• Potential bugs
• Style & readability issues  
• Security or performance concerns
• Concrete suggestions with code snippets

Please provide your review in a clear, structured format. Focus on actionable feedback.`;
        const ruleBlock = params.rules?.length
            ? `\nAdditional rules to follow:\n• ${params.rules.join('\n• ')}\n`
            : '';
        const partInfo = params.part
            ? `\n[Part ${params.part.index} of ${params.part.total}${params.fileName ? ` - ${params.fileName}` : ''}]\n`
            : params.fileName
                ? `\n[File: ${params.fileName}]\n`
                : '';
        return `${base}${ruleBlock}${partInfo}\nPatch:\n\`\`\`\n${params.diff}\n\`\`\``;
    }
}
exports.BaseProvider = BaseProvider;
class ProviderError extends Error {
    provider;
    statusCode;
    originalError;
    constructor(message, provider, statusCode, originalError) {
        super(message);
        this.provider = provider;
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.name = 'ProviderError';
    }
}
exports.ProviderError = ProviderError;
class ConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigError';
    }
}
exports.ConfigError = ConfigError;
class FileProcessingError extends Error {
    filename;
    constructor(message, filename) {
        super(message);
        this.filename = filename;
        this.name = 'FileProcessingError';
    }
}
exports.FileProcessingError = FileProcessingError;
//# sourceMappingURL=index.js.map