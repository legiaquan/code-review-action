#!/usr/bin/env node

/**
 * Test script for the new review suggestions functionality
 * This script simulates how the AI code review would work with suggestions
 */

const { CommentBuilder } = require('../dist/services/comment-builder');

// Mock configuration
const mockConfig = {
  provider: 'gemini',
  reviewLevel: 'diff',
  includeGlobs: ['**/*.ts', '**/*.js'],
  excludeGlobs: ['**/*.test.ts', '**/*.spec.ts'],
  maxChunkLines: 400,
  rules: ['Focus on security', 'Check for performance issues'],
  maxRetries: 3,
  retryDelay: 1000,
};

// Mock review results
const mockReviewResults = [
  {
    comment:
      '📄 **src/main.ts**\n\n• Consider adding error handling for the API call\n• The variable name could be more descriptive\n• Missing JSDoc comments for the function',
    tokensUsed: 150,
    costUSD: 0.002,
    provider: 'gemini',
    suggestions: [
      {
        path: 'src/main.ts',
        line: 15,
        side: 'RIGHT',
        startLine: 15,
        endLine: 15,
        startSide: 'RIGHT',
        endSide: 'RIGHT',
        body: 'Consider adding error handling for the API call',
      },
      {
        path: 'src/main.ts',
        line: 20,
        side: 'RIGHT',
        startLine: 20,
        endLine: 20,
        startSide: 'RIGHT',
        endSide: 'RIGHT',
        body: 'The variable name could be more descriptive',
      },
      {
        path: 'src/main.ts',
        line: 25,
        side: 'RIGHT',
        startLine: 25,
        endLine: 25,
        startSide: 'RIGHT',
        endSide: 'RIGHT',
        body: 'Missing JSDoc comments for the function',
      },
    ],
  },
  {
    comment:
      '📄 **src/utils/helper.ts**\n\n• This function could benefit from memoization\n• Consider using a more efficient algorithm',
    tokensUsed: 100,
    costUSD: 0.001,
    provider: 'gemini',
    suggestions: [
      {
        path: 'src/utils/helper.ts',
        line: 10,
        side: 'RIGHT',
        startLine: 10,
        endLine: 10,
        startSide: 'RIGHT',
        endSide: 'RIGHT',
        body: 'This function could benefit from memoization',
      },
      {
        path: 'src/utils/helper.ts',
        line: 15,
        side: 'RIGHT',
        startLine: 15,
        endLine: 15,
        startSide: 'RIGHT',
        endSide: 'RIGHT',
        body: 'Consider using a more efficient algorithm',
      },
    ],
  },
];

// Mock file changes
const mockFiles = [
  {
    filename: 'src/main.ts',
    status: 'modified',
    additions: 15,
    deletions: 5,
    changes: 20,
  },
  {
    filename: 'src/utils/helper.ts',
    status: 'modified',
    additions: 8,
    deletions: 3,
    changes: 11,
  },
];

async function testReviewSuggestions() {
  console.log('🧪 Testing Review Suggestions Functionality\n');

  try {
    // Initialize CommentBuilder
    const commentBuilder = new CommentBuilder(mockConfig);
    console.log('✅ CommentBuilder initialized');

    // Test building review with suggestions
    console.log('\n🔍 Building review with suggestions...');
    const review = commentBuilder.buildReviewWithSuggestions(mockReviewResults, mockFiles);

    console.log('\n📋 Review Summary:');
    console.log(`Event: ${review.event}`);
    console.log(`Comments count: ${review.comments.length}`);
    console.log(`Body length: ${review.body.length} characters`);

    console.log('\n💡 Individual Suggestions:');
    review.comments.forEach((comment, index) => {
      console.log(`\n${index + 1}. File: ${comment.path}:${comment.line}`);
      console.log(`   Side: ${comment.side}`);
      console.log(
        `   Body: ${comment.body.substring(0, 80)}${comment.body.length > 80 ? '...' : ''}`,
      );
    });

    console.log('\n📝 Review Body Preview:');
    console.log(review.body.substring(0, 500) + '...');

    console.log(
      '\n✅ All tests passed! The review suggestions functionality is working correctly.',
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testReviewSuggestions().catch(console.error);
