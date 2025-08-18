"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const generative_ai_1 = require("@google/generative-ai");
const types_1 = require("../types");
class GeminiProvider extends types_1.BaseProvider {
    model = 'gemini-1.5-pro';
    genAI;
    generativeModel;
    constructor(apiKey) {
        super(apiKey);
        try {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            this.generativeModel = this.genAI.getGenerativeModel({
                model: this.model,
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 0.8,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                ],
            });
        }
        catch (error) {
            throw new types_1.ProviderError(`Failed to initialize Gemini provider: ${error instanceof Error ? error.message : 'Unknown error'}`, 'gemini', undefined, error instanceof Error ? error : undefined);
        }
    }
    async review(params) {
        try {
            const prompt = this.buildPrompt(params);
            const result = await this.generativeModel.generateContent(prompt);
            const response = await result.response;
            if (!response) {
                throw new types_1.ProviderError('No response received from Gemini', 'gemini');
            }
            const text = response.text();
            if (!text || text.trim() === '') {
                throw new types_1.ProviderError('Empty response received from Gemini', 'gemini');
            }
            // Extract token usage if available
            const tokensUsed = response.usageMetadata?.totalTokenCount;
            // Rough cost calculation for Gemini (as of 2024)
            // Input: $0.00125 per 1K tokens, Output: $0.005 per 1K tokens
            const inputTokens = response.usageMetadata?.promptTokenCount || 0;
            const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
            const costUSD = (inputTokens * 0.00125 + outputTokens * 0.005) / 1000;
            return {
                comment: text.trim(),
                tokensUsed,
                costUSD: costUSD > 0 ? costUSD : undefined,
                provider: 'gemini',
            };
        }
        catch (error) {
            if (error instanceof types_1.ProviderError) {
                throw error;
            }
            // Handle specific Gemini API errors
            if (error && typeof error === 'object' && 'status' in error) {
                const errorObj = error;
                const status = errorObj.status;
                const message = errorObj.message || 'Unknown Gemini API error';
                throw new types_1.ProviderError(`Gemini API error: ${message}`, 'gemini', status, error instanceof Error ? error : undefined);
            }
            throw new types_1.ProviderError(`Unexpected error during Gemini review: ${error instanceof Error ? error.message : 'Unknown error'}`, 'gemini', undefined, error instanceof Error ? error : undefined);
        }
    }
    buildPrompt(params) {
        const basePrompt = super.buildPrompt(params);
        // Add Gemini-specific instructions
        const geminiInstructions = `
Please respond in markdown format for better readability. Use the following structure:

## Code Review Summary

### 🐛 Potential Bugs
- List any bugs or logic errors you find

### 📝 Style & Readability
- Comment on code style, naming, structure

### 🔒 Security & Performance
- Highlight security vulnerabilities or performance issues

### 💡 Suggestions
- Provide concrete improvement suggestions with code examples

If no issues are found in a category, you can omit that section.`;
        return `${basePrompt}\n${geminiInstructions}`;
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=gemini.js.map