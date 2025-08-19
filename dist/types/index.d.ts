export interface ReviewParams {
    diff: string;
    rules?: string[];
    part?: {
        index: number;
        total: number;
    };
    fileName?: string;
    reviewLevel?: ReviewLevel;
}
export interface ReviewResult {
    comment: string;
    tokensUsed?: number | undefined;
    costUSD?: number | undefined;
    provider?: string;
}
export interface AIProvider {
    review(params: ReviewParams, maxRetries?: number, retryDelay?: number): Promise<ReviewResult>;
}
export declare abstract class BaseProvider implements AIProvider {
    protected apiKey: string;
    protected abstract model: string;
    constructor(apiKey: string);
    abstract review(params: ReviewParams, maxRetries?: number, retryDelay?: number): Promise<ReviewResult>;
    /**
     * Get the model name being used
     */
    getModel(): string;
    /**
     * Retry mechanism with exponential backoff
     */
    protected retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number, operationName?: string): Promise<T>;
    /**
     * Check if an error is retryable
     */
    protected isRetryableError(error: any): boolean;
    /**
     * Sleep utility
     */
    protected sleep(ms: number): Promise<void>;
    protected buildPrompt(params: ReviewParams): string;
}
export type ReviewLevel = 'diff' | 'file' | 'full';
export type ProviderType = 'gemini' | 'openai' | 'huggingface';
export interface ActionInputs {
    provider: ProviderType;
    apiKey: string;
    reviewLevel: ReviewLevel;
    includeGlobs: string[];
    excludeGlobs: string[];
    maxChunkLines: number;
    rules: string[];
    maxRetries: number;
    retryDelay: number;
}
export interface FileChange {
    filename: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string | undefined;
}
export interface ChunkedDiff {
    filename: string;
    chunks: DiffChunk[];
}
export interface DiffChunk {
    content: string;
    startLine: number;
    endLine: number;
    index: number;
    total: number;
}
export declare class ProviderError extends Error {
    provider: string;
    statusCode?: number | undefined;
    originalError?: Error | undefined;
    constructor(message: string, provider: string, statusCode?: number | undefined, originalError?: Error | undefined);
}
export declare class ConfigError extends Error {
    constructor(message: string);
}
export declare class FileProcessingError extends Error {
    filename?: string | undefined;
    constructor(message: string, filename?: string | undefined);
}
//# sourceMappingURL=index.d.ts.map