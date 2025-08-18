"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = exports.GeminiProvider = exports.ProviderFactory = void 0;
const types_1 = require("../types");
const gemini_1 = require("./gemini");
const openai_1 = require("./openai");
class ProviderFactory {
    static providers = new Map([
        ['gemini', gemini_1.GeminiProvider],
        ['openai', openai_1.OpenAIProvider],
    ]);
    static createProvider(type, apiKey) {
        const ProviderClass = this.providers.get(type);
        if (!ProviderClass) {
            throw new types_1.ProviderError(`Unsupported provider: ${type}. Available providers: ${Array.from(this.providers.keys()).join(', ')}`, type);
        }
        if (!apiKey || apiKey.trim() === '') {
            throw new types_1.ProviderError(`API key is required for provider: ${type}`, type);
        }
        try {
            return new ProviderClass(apiKey);
        }
        catch (error) {
            throw new types_1.ProviderError(`Failed to initialize provider ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`, type, undefined, error instanceof Error ? error : undefined);
        }
    }
    static getSupportedProviders() {
        return Array.from(this.providers.keys());
    }
    static registerProvider(type, providerClass) {
        this.providers.set(type, providerClass);
    }
}
exports.ProviderFactory = ProviderFactory;
// Export provider classes for direct use if needed
var gemini_2 = require("./gemini");
Object.defineProperty(exports, "GeminiProvider", { enumerable: true, get: function () { return gemini_2.GeminiProvider; } });
var openai_2 = require("./openai");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_2.OpenAIProvider; } });
__exportStar(require("../types"), exports);
//# sourceMappingURL=index.js.map