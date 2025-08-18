import { AIProvider, ProviderType, ProviderError } from '../types';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';

export class ProviderFactory {
  private static providers = new Map<ProviderType, new (apiKey: string) => AIProvider>([
    ['gemini', GeminiProvider],
    ['openai', OpenAIProvider],
  ]);

  static createProvider(type: ProviderType, apiKey: string): AIProvider {
    const ProviderClass = this.providers.get(type);
    
    if (!ProviderClass) {
      throw new ProviderError(
        `Unsupported provider: ${type}. Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
        type
      );
    }

    if (!apiKey || apiKey.trim() === '') {
      throw new ProviderError(`API key is required for provider: ${type}`, type);
    }

    try {
      return new ProviderClass(apiKey);
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize provider ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  static getSupportedProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  static registerProvider(type: ProviderType, providerClass: new (apiKey: string) => AIProvider): void {
    this.providers.set(type, providerClass);
  }
}

// Export provider classes for direct use if needed
export { GeminiProvider } from './gemini';
export { OpenAIProvider } from './openai';
export * from '../types';
