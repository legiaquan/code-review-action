'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require('openai'));
const types_1 = require('../types');
class OpenAIProvider extends types_1.BaseProvider {
  model = 'gpt-4-turbo-preview';
  client;
  constructor(apiKey) {
    super(apiKey);
    try {
      this.client = new openai_1.default({
        apiKey: apiKey,
      });
    } catch (error) {
      throw new types_1.ProviderError(
        `Failed to initialize OpenAI provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'openai',
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
  async review(params, maxRetries = 3, retryDelay = 1000) {
    return this.retryWithBackoff(
      async () => {
        const prompt = this.buildPrompt(params);
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior software engineer and expert code reviewer. Provide thorough, constructive feedback on code changes.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 2048,
          top_p: 0.8,
          frequency_penalty: 0,
          presence_penalty: 0,
        });
        const response = completion.choices[0]?.message?.content;
        if (!response || response.trim() === '') {
          throw new types_1.ProviderError('Empty response received from OpenAI', 'openai');
        }
        // Extract usage information
        const tokensUsed = completion.usage?.total_tokens;
        // Cost calculation for GPT-4 Turbo (as of 2024)
        // Input: $0.01 per 1K tokens, Output: $0.03 per 1K tokens
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        const costUSD = (inputTokens * 0.01 + outputTokens * 0.03) / 1000;
        return {
          comment: response.trim(),
          tokensUsed,
          costUSD: costUSD > 0 ? costUSD : undefined,
          provider: 'openai',
        };
      },
      maxRetries,
      retryDelay,
      `OpenAI ${this.model} API call`,
    );
  }
  buildPrompt(params) {
    const basePrompt = super.buildPrompt(params);
    // Add OpenAI-specific instructions for better suggestions
    const openaiInstructions = `
Please structure your response as follows:

## Code Review

### Issues Found
- **Bugs**: Any logic errors or potential runtime issues
- **Security**: Security vulnerabilities or concerns  
- **Performance**: Performance bottlenecks or inefficiencies
- **Style**: Code style, readability, and maintainability issues

### Recommendations
- Provide specific, actionable suggestions
- Include code examples where helpful
- Prioritize the most critical issues
- Use bullet points (•) for each suggestion to help with parsing

### Summary
- Brief overall assessment of the code quality
- Any positive aspects worth noting

IMPORTANT: Structure your suggestions using bullet points (•) so they can be properly parsed into individual GitHub review comments. Each bullet point should be a specific, actionable suggestion.

Format your response in clear markdown for readability.`;
    return `${basePrompt}\n${openaiInstructions}`;
  }
  // Method to change model (useful for different OpenAI models)
  setModel(model) {
    this.model = model;
  }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map
