"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessingError = exports.ConfigError = exports.ProviderError = exports.BaseProvider = void 0;
class BaseProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
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
//# sourceMappingURL=types.js.map