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
  review(params: ReviewParams): Promise<ReviewResult>;
}

export abstract class BaseProvider implements AIProvider {
  protected abstract model: string;

  constructor(protected apiKey: string) {}

  abstract review(params: ReviewParams): Promise<ReviewResult>;

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
