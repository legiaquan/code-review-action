import { AIProvider, ProviderType } from '../types';
export declare class ProviderFactory {
    private static providers;
    static createProvider(type: ProviderType, apiKey: string): AIProvider;
    static getSupportedProviders(): ProviderType[];
    static registerProvider(type: ProviderType, providerClass: new (apiKey: string) => AIProvider): void;
}
export { GeminiProvider } from './gemini';
export { OpenAIProvider } from './openai';
export * from '@types';
//# sourceMappingURL=index.d.ts.map