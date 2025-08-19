import { ProviderFactory } from '../src/providers';
import { GeminiProvider } from '../src/providers/gemini';
import { OpenAIProvider } from '../src/providers/openai';
import { ProviderError, ProviderType } from '../src/types/index';

describe('ProviderFactory', () => {
  describe('createProvider', () => {
    it('should create Gemini provider', () => {
      const provider = ProviderFactory.createProvider('gemini', 'test-key');
      expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it('should create OpenAI provider', () => {
      const provider = ProviderFactory.createProvider('openai', 'sk-test-key');
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        ProviderFactory.createProvider('unsupported' as any, 'test-key');
      }).toThrow(ProviderError);
    });

    it('should throw error for empty API key', () => {
      expect(() => {
        ProviderFactory.createProvider('gemini', '');
      }).toThrow(ProviderError);
    });

    it('should throw error for whitespace-only API key', () => {
      expect(() => {
        ProviderFactory.createProvider('gemini', '   ');
      }).toThrow(ProviderError);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
      expect(providers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('registerProvider', () => {
    class TestProvider {
      constructor(apiKey: string) {
        // Store API key to avoid unused parameter warning
        this.apiKey = apiKey;
      }
      
      private apiKey: string;
      
      async review() {
        return {
          comment: `Test review with key: ${this.apiKey.substring(0, 4)}...`,
          provider: 'test',
        };
      }
    }

    it('should register new provider', () => {
      ProviderFactory.registerProvider('test' as ProviderType, TestProvider as any);
      
      const provider = ProviderFactory.createProvider('test' as ProviderType, 'test-key');
      expect(provider).toBeInstanceOf(TestProvider);
    });

    it('should override existing provider', () => {
      class NewGeminiProvider {
        constructor(apiKey: string) {
          // Store API key to avoid unused parameter warning
          this.apiKey = apiKey;
        }
        
        private apiKey: string;
        
        async review() {
          return {
            comment: `New Gemini review with key: ${this.apiKey.substring(0, 4)}...`,
            provider: 'new-gemini',
          };
        }
      }

      ProviderFactory.registerProvider('gemini', NewGeminiProvider as any);
      
      const provider = ProviderFactory.createProvider('gemini', 'test-key');
      expect(provider).toBeInstanceOf(NewGeminiProvider);
      
      // Clean up - restore original
      ProviderFactory.registerProvider('gemini', GeminiProvider);
    });
  });
});

describe('BaseProvider', () => {
  class TestProvider extends GeminiProvider {
    async review() {
      return {
        comment: 'Test review',
        provider: 'test',
      };
    }
    
    // Expose protected method for testing
    public testBuildPrompt(params: any) {
      return this.buildPrompt(params as any);
    }
  }

  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider('test-key');
  });

  describe('buildPrompt', () => {
    it('should build basic prompt without rules', () => {
      const params = {
        diff: 'test diff content',
      };
      
      const prompt = provider.testBuildPrompt(params);
      
      expect(prompt).toContain('You are a senior software engineer');
      expect(prompt).toContain('test diff content');
      expect(prompt).not.toContain('Additional rules');
    });

    it('should include custom rules in prompt', () => {
      const params = {
        diff: 'test diff content',
        rules: ['Check security', 'Verify performance'],
      };
      
      const prompt = provider.testBuildPrompt(params);
      
      expect(prompt).toContain('Additional rules');
      expect(prompt).toContain('Check security');
      expect(prompt).toContain('Verify performance');
    });

    it('should include part information for chunked reviews', () => {
      const params = {
        diff: 'test diff content',
        fileName: 'test.ts',
        part: { index: 2, total: 3 },
      };
      
      const prompt = provider.testBuildPrompt(params);
      
      expect(prompt).toContain('[Part 2 of 3 - test.ts]');
    });

    it('should include filename without part info', () => {
      const params = {
        diff: 'test diff content',
        fileName: 'test.ts',
      };
      
      const prompt = provider.testBuildPrompt(params);
      
      expect(prompt).toContain('[File: test.ts]');
    });
  });
});
