import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { BaseProvider, ReviewParams, ReviewResult, ProviderError } from '../types';

export class GeminiProvider extends BaseProvider {
  protected model = 'gemini-1.5-pro';
  private genAI: GoogleGenerativeAI;
  private generativeModel: GenerativeModel;

  constructor(apiKey: string) {
    super(apiKey);

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
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
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize Gemini provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gemini',
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async review(params: ReviewParams): Promise<ReviewResult> {
    try {
      const prompt = this.buildPrompt(params);

      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;

      if (!response) {
        throw new ProviderError('No response received from Gemini', 'gemini');
      }

      const text = response.text();

      if (!text || text.trim() === '') {
        throw new ProviderError('Empty response received from Gemini', 'gemini');
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
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      // Handle specific Gemini API errors
      if (error && typeof error === 'object' && 'status' in error) {
        const errorObj = error as { status?: number; message?: string };
        const status = errorObj.status;
        const message = errorObj.message || 'Unknown Gemini API error';

        throw new ProviderError(
          `Gemini API error: ${message}`,
          'gemini',
          status,
          error instanceof Error ? error : undefined,
        );
      }

      throw new ProviderError(
        `Unexpected error during Gemini review: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'gemini',
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  protected buildPrompt(params: ReviewParams): string {
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
