'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GeminiProvider = void 0;
const generative_ai_1 = require('@google/generative-ai');
const types_1 = require('../types');
class GeminiProvider extends types_1.BaseProvider {
  model = 'gemini-1.5-flash';
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
    } catch (error) {
      throw new types_1.ProviderError(
        `Failed to initialize Gemini provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gemini',
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
  async review(params, maxRetries = 3, retryDelay = 1000) {
    return this.retryWithBackoff(
      async () => {
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
        // Rough cost calculation for Gemini Flash (cheaper than Pro)
        // Flash: Input: $0.000075 per 1K tokens, Output: $0.0003 per 1K tokens
        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
        const costUSD = (inputTokens * 0.000075 + outputTokens * 0.0003) / 1000;
        return {
          comment: text.trim(),
          tokensUsed,
          costUSD: costUSD > 0 ? costUSD : undefined,
          provider: 'gemini',
        };
      },
      maxRetries,
      retryDelay,
      `Gemini ${this.model} API call`,
    );
  }
  buildPrompt(params) {
    const basePrompt = super.buildPrompt(params);
    // Add Gemini-specific instructions for better suggestions
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
- Use bullet points (•) for each suggestion to help with parsing

IMPORTANT: Structure your suggestions using bullet points (•) so they can be properly parsed into individual GitHub review comments. Each bullet point should be a specific, actionable suggestion.

If no issues are found in a category, you can omit that section.`;
    return `${basePrompt}\n${geminiInstructions}`;
  }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=gemini.js.map
