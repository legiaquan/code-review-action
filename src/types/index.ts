export interface ReviewParams {
  diff: string;
  rules?: string[];
  part?: { index: number; total: number };
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

export abstract class BaseProvider implements AIProvider {
  protected abstract model: string;

  constructor(protected apiKey: string) {}

  abstract review(
    params: ReviewParams,
    maxRetries?: number,
    retryDelay?: number,
  ): Promise<ReviewResult>;

  /**
   * Get the model name being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Retry mechanism with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    operationName: string = 'operation',
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
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

        console.log(
          `${operationName} failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms...`,
        );
        console.log(`Error: ${lastError.message}`);

        await this.sleep(totalDelay);
      }
    }

    throw lastError || new Error('Unknown error occurred during retry attempts');
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(error: any): boolean {
    if (error instanceof ProviderError) {
      // Retry on rate limit, quota, and temporary server errors
      const retryableStatusCodes = [429, 500, 502, 503, 504];
      if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
        return true;
      }

      // Retry on specific error messages
      const message = error.message.toLowerCase();
      return (
        message.includes('quota') ||
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('temporary') ||
        message.includes('server error')
      );
    }

    // Retry on network errors
    if (error && typeof error === 'object') {
      const message = String(error.message || '').toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('econnreset') ||
        message.includes('enotfound')
      );
    }

    return false;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected buildPrompt(params: ReviewParams): string {
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

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class FileProcessingError extends Error {
  constructor(
    message: string,
    public filename?: string,
  ) {
    super(message);
    this.name = 'FileProcessingError';
  }
}
