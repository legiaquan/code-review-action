import { BaseProvider, ReviewParams, ReviewResult } from '../types';
export declare class OpenAIProvider extends BaseProvider {
    protected model: string;
    private client;
    constructor(apiKey: string);
    review(params: ReviewParams): Promise<ReviewResult>;
    protected buildPrompt(params: ReviewParams): string;
    setModel(model: string): void;
}
//# sourceMappingURL=openai.d.ts.map