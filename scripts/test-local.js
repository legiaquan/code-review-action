#!/usr/bin/env node

/**
 * Local testing script for AI Code Review Action
 * This script helps test the action locally without GitHub Actions environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  provider: process.env.TEST_PROVIDER || 'gemini',
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.TEST_API_KEY || 'test-api-key',
  testFile: 'test-sample.ts',
  mockPrNumber: 999,
  skipAI: process.env.SKIP_AI_CALL !== 'false', // Skip actual AI call for testing (default: true)
};

console.log('🧪 AI Code Review Action - Local Test Script');
console.log('='.repeat(50));

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run test:local

Environment Variables:
  GEMINI_API_KEY      - Your Gemini API key (for real testing)
  OPENAI_API_KEY      - Your OpenAI API key (for real testing)
  TEST_API_KEY        - Alternative API key for testing
  TEST_PROVIDER       - AI provider to test (gemini|openai)
  SKIP_AI_CALL        - Set to 'true' to use mock AI responses (offline testing)

Examples:
  npm run test:local                                    # Use mock AI responses (default)
  TEST_PROVIDER=openai npm run test:local              # Test with OpenAI (mock)
  SKIP_AI_CALL=false GEMINI_API_KEY=key npm run test:local  # Real Gemini testing
  SKIP_AI_CALL=false TEST_PROVIDER=openai npm run test:local # Real OpenAI testing

For real API testing, set SKIP_AI_CALL=false and provide API key:
  export GEMINI_API_KEY="your-actual-api-key"
  SKIP_AI_CALL=false npm run test:local
`);
  process.exit(0);
}

// Check prerequisites
function checkPrerequisites() {
  console.log('📋 Checking prerequisites...');
  
  if (!CONFIG.apiKey) {
    console.error('❌ API key not found. Please set GEMINI_API_KEY or OPENAI_API_KEY environment variable.');
    process.exit(1);
  }
  
  if (!fs.existsSync(CONFIG.testFile)) {
    console.error(`❌ Test file ${CONFIG.testFile} not found.`);
    process.exit(1);
  }
  
  console.log('✅ Prerequisites check passed');
}

// Build the action
function buildAction() {
  console.log('🔨 Building action...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Action built successfully');
  } catch (error) {
    console.error('❌ Failed to build action:', error.message);
    process.exit(1);
  }
}

// Create mock GitHub environment
function setupMockEnvironment() {
  console.log('🌍 Setting up mock GitHub environment...');
  
  // Set required environment variables
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
  process.env.GITHUB_TOKEN = 'mock-token';
  process.env.GITHUB_EVENT_NAME = 'pull_request';
  
  // Mock GitHub Actions inputs
  process.env.INPUT_PROVIDER = CONFIG.provider;
  process.env.INPUT_API_KEY = CONFIG.apiKey;
  process.env.INPUT_REVIEW_LEVEL = 'diff';
  process.env.INPUT_INCLUDE_GLOBS = '*.ts,src/**/*.ts';
  process.env.INPUT_EXCLUDE_GLOBS = '**/*.test.ts,**/node_modules/**';
  process.env.INPUT_MAX_CHUNK_LINES = '300';
  process.env.INPUT_RULES = 'Focus on code quality and best practices\nCheck for potential bugs and logic errors';
  process.env.INPUT_PR_NUMBER = CONFIG.mockPrNumber.toString();
  
  // Create mock event payload
  const eventPayload = {
    number: CONFIG.mockPrNumber,
    pull_request: {
      number: CONFIG.mockPrNumber,
      head: {
        sha: 'mock-sha'
      }
    }
  };
  
  const eventPath = path.join(__dirname, '..', 'mock-event.json');
  fs.writeFileSync(eventPath, JSON.stringify(eventPayload, null, 2));
  process.env.GITHUB_EVENT_PATH = eventPath;
  
  console.log('✅ Mock environment setup complete');
  console.log(`   Provider: ${CONFIG.provider}`);
  console.log(`   API Key: ${CONFIG.apiKey.substring(0, 10)}...`);
  console.log(`   Mode: ${CONFIG.skipAI ? 'Mock AI (offline)' : 'Real AI (online)'}`);
}

// Create a simple diff for testing
function createMockDiff() {
  console.log('📝 Creating mock diff...');
  
  const mockDiff = `
diff --git a/test-sample.ts b/test-sample.ts
index 1234567..abcdefg 100644
--- a/test-sample.ts
+++ b/test-sample.ts
@@ -1,10 +1,15 @@
 // Sample TypeScript file for testing AI Code Review Action
 // This file contains various code issues that AI should catch
 
+// New line added for testing
 import * as fs from 'fs';
 import { promisify } from 'util';
 
 // Issue 1: Hardcoded API key (security vulnerability)
 const API_KEY = 'sk-1234567890abcdef';
+const NEW_SECRET = 'another-secret-key';
 const DATABASE_PASSWORD = 'admin123';
 
 // Issue 2: Any type usage (TypeScript best practice)
`;
  
  return mockDiff;
}

// Mock Octokit for testing
function mockOctokit() {
  const mockFiles = [
    {
      filename: CONFIG.testFile,
      status: 'modified',
      additions: 5,
      deletions: 2,
      changes: 7,
      patch: createMockDiff()
    }
  ];
  
  // Create a simple mock that returns our test data
  global.mockOctokitData = {
    pulls: {
      listFiles: () => Promise.resolve({ data: mockFiles })
    },
    issues: {
      createComment: (params) => {
        console.log('📝 Mock comment would be posted:');
        console.log('---');
        console.log(params.body);
        console.log('---');
        return Promise.resolve({ data: { id: 123 } });
      }
    }
  };
}

// Run the test
async function runTest() {
  console.log('🚀 Running AI Code Review test...');
  
  try {
    // Mock @actions/github before importing the action
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
      if (id === '@actions/github') {
        return {
          getOctokit: () => ({
            rest: global.mockOctokitData
          }),
          context: {
            repo: {
              owner: 'test-owner',
              repo: 'test-repo'
            },
            payload: {
              pull_request: {
                number: CONFIG.mockPrNumber
              }
            }
          }
        };
      }
      
      // Mock AI providers if SKIP_AI_CALL is true
      if (CONFIG.skipAI) {
        if (id === '@google/generative-ai') {
          return {
            GoogleGenerativeAI: function() {
              return {
                getGenerativeModel: () => ({
                  generateContent: async () => ({
                    response: {
                      text: () => `## Mock AI Review Results

### 🐛 Potential Issues Found:
- **Security**: Hardcoded API key detected on line 7
- **TypeScript**: Usage of 'any' type on line 11 - consider using specific types
- **Performance**: Inefficient loop on line 26 - consider using array methods

### 💡 Suggestions:
1. Move sensitive data to environment variables
2. Add proper TypeScript types for better type safety
3. Use \`reduce\` or similar array methods for better performance

### ✅ Positive Notes:
- Good use of async/await patterns
- Proper error handling in most functions`,
                      usageMetadata: {
                        totalTokenCount: 150,
                        promptTokenCount: 100,
                        candidatesTokenCount: 50
                      }
                    }
                  })
                })
              };
            },
            HarmCategory: {
              HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
              HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT'
            },
            HarmBlockThreshold: {
              BLOCK_NONE: 'BLOCK_NONE'
            }
          };
        }
        
        if (id === 'openai') {
          function MockOpenAI() {
            return {
              chat: {
                completions: {
                  create: async () => ({
                    choices: [{
                      message: {
                        content: `## Mock OpenAI Review Results

**Issues Found:**

### 🔒 Security Concerns
- Hardcoded API key on line 7 - move to environment variables
- SQL injection vulnerability in getUserById function

### 📝 Code Quality  
- Replace 'any' types with specific interfaces
- Add proper error handling with try-catch blocks

### ⚡ Performance
- Inefficient O(n²) algorithm in removeDuplicates function
- Consider using Set for deduplication

**Overall Assessment:** The code has several areas for improvement, particularly around security and type safety.`
                      }
                    }],
                    usage: {
                      total_tokens: 200,
                      prompt_tokens: 120,
                      completion_tokens: 80
                    }
                  })
                }
              }
            };
          }
          
          return {
            default: MockOpenAI
          };
        }
      }
      
      return originalRequire.apply(this, arguments);
    };
    
    // Import the action after setting up mocks
    const { AICodeReview } = require('../dist/index.js');
    
    // Mock the Octokit data
    mockOctokit();
    
    // Create and run the action
    const review = new AICodeReview();
    await review.run();
    
    console.log('✅ Test completed successfully!');
    
    // Restore original require
    Module.prototype.require = originalRequire;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Cleanup
function cleanup() {
  console.log('🧹 Cleaning up...');
  
  const eventPath = path.join(__dirname, '..', 'mock-event.json');
  if (fs.existsSync(eventPath)) {
    fs.unlinkSync(eventPath);
  }
  
  console.log('✅ Cleanup complete');
}

// Main execution
async function main() {
  try {
    checkPrerequisites();
    buildAction();
    setupMockEnvironment();
    await runTest();
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  cleanup();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
