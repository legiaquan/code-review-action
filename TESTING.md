# Testing Guide for AI Code Review Action

This guide explains how to test the AI Code Review Action using the provided test files and workflows.

## Test Files Overview

### 1. `test-sample.ts` - Sample Code with Issues

This file contains **15 different types of code issues** that the AI should detect:

| Issue Type | Description | Line(s) |
|------------|-------------|---------|
| **Security** | Hardcoded API keys and passwords | 7-8 |
| **Security** | SQL injection vulnerability | 50-53 |
| **TypeScript** | `any` type usage | 11-13 |
| **Error Handling** | Missing try-catch blocks | 16-20 |
| **Code Quality** | Unused variables | 24 |
| **Performance** | Inefficient loops | 26-31 |
| **Logic Errors** | Division by zero | 35-37 |
| **Memory Leaks** | Uncleaned timers | 40-54 |
| **Input Validation** | Weak password validation | 59-61 |
| **Error Handling** | Poor error context | 64-70 |
| **Race Conditions** | Async counter increment | 73-78 |
| **Performance** | Inefficient deduplication | 81-94 |
| **Logging** | Console.log instead of proper logger | 97-101 |
| **Magic Numbers** | Hardcoded discount values | 104-111 |
| **Architecture** | Bloated interface | 114-123 |

## Testing Methods

### Method 1: GitHub Actions Workflow (Recommended)

#### Automated Test with PR Creation

```bash
# Go to your repository's Actions tab
# Run "Test AI Code Review Action" workflow
# Select options:
# - Test scenario: basic/security-focused/performance-focused/typescript-focused
# - Provider: gemini/openai
# - Create PR: true (creates and tests automatically)
```

#### Manual Test with Existing PR

```bash
# Create a PR manually with changes to test-sample.ts
# Run "Test AI Code Review Action" workflow
# Enter the PR number
# Select test scenario and provider
```

### Method 2: Local Testing Script

```bash
# Set up environment
export GEMINI_API_KEY="your-gemini-api-key"
# OR
export OPENAI_API_KEY="your-openai-api-key"

# Run local test
node scripts/test-local.js
```

### Method 3: Direct Action Usage

Add to your workflow:

```yaml
- name: Test AI Code Review
  uses: ./
  with:
    provider: 'gemini'
    api_key: ${{ secrets.GEMINI_API_KEY }}
    review_level: 'file'
    include_globs: 'test-sample.ts'
    rules: |
      Focus on security vulnerabilities
      Check TypeScript best practices
      Look for performance issues
```

## Test Scenarios

### 1. Basic Review (`basic`)
- General code quality check
- Best practices validation
- Bug detection
- Readability improvements

**Expected AI Feedback:**
- Identifies hardcoded secrets
- Suggests proper TypeScript types
- Points out unused variables
- Recommends error handling

### 2. Security-Focused (`security-focused`)
- Hardcoded secrets detection
- SQL injection vulnerabilities
- Input validation issues
- Authentication problems

**Expected AI Feedback:**
- **CRITICAL**: Hardcoded API keys and passwords
- **CRITICAL**: SQL injection in `getUserById`
- **IMPORTANT**: Weak password validation
- **MODERATE**: Missing input sanitization

### 3. Performance-Focused (`performance-focused`)
- Inefficient algorithms
- Memory leak detection
- Synchronous operations
- Resource cleanup

**Expected AI Feedback:**
- Inefficient deduplication algorithm
- Memory leak in DataProcessor
- Synchronous file operations
- Race condition in counter

### 4. TypeScript-Focused (`typescript-focused`)
- Type safety issues
- Interface design problems
- Generic usage
- Async/await patterns

**Expected AI Feedback:**
- Replace `any` types with proper types
- Break down large interfaces
- Improve error type definitions
- Better async error handling

## Validating Test Results

### Good AI Review Should Include:

#### Security Issues ✅
```
🔒 CRITICAL: Hardcoded API key detected on line 7
🔒 CRITICAL: SQL injection vulnerability in getUserById function
🔒 IMPORTANT: Weak password validation (minimum 3 characters)
```

#### TypeScript Issues ✅
```
📝 Replace 'any' type with proper interfaces
📝 Consider breaking down the User interface
📝 Add proper error types instead of generic Error
```

#### Performance Issues ✅
```
⚡ Inefficient O(n²) deduplication algorithm - use Set instead
⚡ Memory leak: timers not cleared in DataProcessor
⚡ Use async file operations instead of readFileSync
```

#### Code Quality Issues ✅
```
🧹 Unused variable 'unusedVariable' on line 24
🧹 Magic numbers: extract discount constants
🧹 Use proper logger instead of console.log
```

### Poor AI Review Indicators ❌
- Missing critical security issues
- Generic feedback without specific line numbers
- No concrete code suggestions
- Overlooking obvious bugs (division by zero)
- Not mentioning TypeScript best practices

## Testing Different Providers

### Gemini vs OpenAI Comparison

Run the same test with both providers:

```bash
# Test with Gemini
export TEST_PROVIDER=gemini
node scripts/test-local.js

# Test with OpenAI  
export TEST_PROVIDER=openai
node scripts/test-local.js
```

**Expected Differences:**
- **Gemini**: More detailed explanations, better context
- **OpenAI**: More structured format, concise suggestions
- **Both**: Should catch the same critical issues

## Troubleshooting Tests

### Common Issues

#### 1. API Key Problems
```bash
Error: Invalid API key
```
**Solution:** Verify API key format and permissions

#### 2. Rate Limiting
```bash
Error: Rate limit exceeded
```
**Solution:** Wait a few minutes or reduce chunk size

#### 3. No Issues Found
```bash
Info: No issues found
```
**Check:**
- File patterns include `test-sample.ts`
- Rules are properly configured
- Provider is responding correctly

#### 4. Build Errors
```bash
Error: Cannot find module
```
**Solution:**
```bash
npm install
npm run build
```

## Creating Custom Tests

### Add New Test Cases

1. **Modify `test-sample.ts`:**
```typescript
// Add your test case
function yourTestFunction() {
  // Code with specific issues you want to test
}
```

2. **Update test expectations in workflows**

3. **Document expected AI feedback**

### Test New Providers

1. **Implement provider in `src/providers/`**
2. **Add to test workflows**
3. **Compare results with existing providers**

## Performance Testing

### Measure Response Times

```bash
time node scripts/test-local.js
```

### Token Usage Monitoring

Check action outputs for:
- Total tokens used
- Estimated cost
- Processing time per file

### Load Testing

Test with larger files:
```bash
# Create large test file
head -c 10000 test-sample.ts > large-test.ts
```

## Continuous Testing

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm test && node scripts/test-local.js
```

### Scheduled Testing

Add to `.github/workflows/scheduled-test.yml`:
```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
```

## Reporting Issues

When reporting issues, include:

1. **Test scenario used**
2. **Provider and model**
3. **Input file content**
4. **Expected vs actual AI feedback**
5. **Error logs (if any)**
6. **Environment details**

## Best Practices

1. **Test regularly** with different scenarios
2. **Compare providers** for consistency
3. **Update test cases** as you add new features
4. **Monitor costs** especially with OpenAI
5. **Validate security** feedback accuracy
6. **Check performance** with large files

---

Happy testing! 🧪✨
