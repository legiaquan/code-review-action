# GitHub Permissions Fix for Code Review Action

## Problem

The error "Resource not accessible by integration" occurs when the GitHub token doesn't have sufficient permissions to create comments on issues/PRs.

## Solution Implemented

### 1. Enhanced Dual API Approach

- **Primary**: Uses Octokit (GitHub's official SDK)
- **Fallback**: Uses direct fetch API calls to GitHub REST API
- **Smart switching**: Automatically detects permission errors and switches to fallback

### 2. Key Improvements Made

#### Permission Validation

- Proactive token validation before attempting to post comments
- Lightweight repository access test to verify permissions

#### Retry Logic with Exponential Backoff

- Automatic retry for transient failures
- Exponential backoff to avoid rate limiting
- Smart detection of non-retryable errors (401, 403, 404, 422)

#### Enhanced Error Handling

- Specific error messages for different HTTP status codes
- Detailed troubleshooting guidance in error messages
- Comprehensive logging for debugging

#### Robust Fallback API

- Direct GitHub REST API implementation using fetch
- Proper error parsing and status code handling
- Enhanced debugging information

## How to Fix Permission Issues

### For GitHub Actions (Recommended)

Add explicit permissions to your workflow file:

```yaml
name: AI-Powered Code Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  issues: write # Required to create comments
  pull-requests: write # Required for PR operations
  contents: read # Required to read repository content

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - name: AI-Powered Code Review
        uses: your-username/code-review-action@main
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### For Personal Access Tokens

Create a token with these scopes:

- `repo` (for private repositories) or `public_repo` (for public repositories)
- `write:discussion` (for creating comments)

### For GitHub Apps

Configure the app with these permissions:

- **Issues**: Write
- **Pull requests**: Write
- **Contents**: Read

## API Usage Examples

### Direct cURL Usage (as requested)

```bash
# Create a comment using GitHub REST API
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  -H "User-Agent: AI-Code-Review-Action/1.0" \
  https://api.github.com/repos/OWNER/REPO/issues/ISSUE_NUMBER/comments \
  -d '{"body":"Your review comment here"}'
```

### Testing Token Permissions

```bash
# Test if your token can access the repository
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO

# Test if your token can create comments
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/issues/PR_NUMBER/comments \
  -d '{"body":"Test comment"}'
```

## Error Messages and Solutions

### Common Error Codes

- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Repository/PR doesn't exist or no access
- **422 Unprocessable Entity**: Invalid request data

### Debugging Steps

1. **Check token validity**:

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/user
   ```

2. **Verify repository access**:

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.github.com/repos/OWNER/REPO
   ```

3. **Test comment creation**:
   ```bash
   curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
        -d '{"body":"test"}' \
        https://api.github.com/repos/OWNER/REPO/issues/PR_NUMBER/comments
   ```

## Features of the Enhanced Implementation

### Smart Error Detection

- Automatically detects permission-related errors
- Distinguishes between retryable and non-retryable errors
- Provides context-specific error messages

### Comprehensive Logging

- Debug information for API calls
- Token validation results
- Detailed error information
- Success confirmations with comment IDs

### Resilient Operation

- Multiple retry attempts with backoff
- Graceful fallback between APIs
- Detailed troubleshooting guidance
- Non-blocking error handling for individual files

## Testing the Fix

1. **Local Testing**: Use the provided test script in `scripts/test-local.js`
2. **GitHub Actions**: The enhanced error messages will guide you to the exact permission issue
3. **Manual API Testing**: Use the cURL examples above to verify token permissions

The implementation now handles all common permission scenarios and provides clear guidance for resolution.
