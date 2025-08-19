import { BaseProvider, ReviewParams, ReviewResult } from '@types';
export declare class GeminiProvider extends BaseProvider {
    protected model: string;
    private genAI;
    private generativeModel;
    constructor(apiKey: string);
    review(params: ReviewParams, maxRetries?: number, retryDelay?: number): Promise<ReviewResult>;
    protected buildPrompt(params: ReviewParams): string;
}
//# sourceMappingURL=gemini.d.ts.map