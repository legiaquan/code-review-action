# AI-Powered Code Review Action

🤖 An intelligent GitHub Action that provides automated code reviews using AI providers like Google Gemini, OpenAI GPT-4, and more. Built with TypeScript and designed with a pluggable architecture for easy extensibility.

## Features

- 🔌 **Pluggable Architecture**: Easy to add new AI providers
- 🎯 **Smart Filtering**: Include/exclude files using glob patterns
- 📦 **Chunking Support**: Handles large diffs by splitting into manageable chunks
- 🎨 **Customizable Rules**: Add your own review criteria
- 💰 **Cost Tracking**: Monitor token usage and estimated costs
- 🔒 **Secure**: API keys are never logged, only diff content is sent
- 📊 **Detailed Reports**: Comprehensive review statistics
- 💡 **GitHub Review Suggestions**: Creates actionable review comments that users can resolve individually
- 🔄 **Resolvable Conversations**: Each suggestion creates a separate review comment for easy tracking

## How It Works

Instead of posting a single large comment, this action now creates a **GitHub Pull Request Review** with:

1. **Main Review Body**: Summary of all findings and statistics
2. **Individual Suggestions**: Each issue becomes a separate review comment
3. **Line-specific Feedback**: Comments are attached to specific code lines
4. **Resolvable Conversations**: Users can resolve each suggestion individually

This approach makes it easier for developers to:

- Address issues one by one
- Track progress on specific suggestions
- Resolve conversations when changes are made
- Get better visibility into review progress

## Supported Providers

| Provider        | Status         | Model                 | Notes                                    |
| --------------- | -------------- | --------------------- | ---------------------------------------- |
| **Gemini**      | ✅ Ready       | `gemini-1.5-flash`    | Google's latest model, great performance |
| **OpenAI**      | ✅ Ready       | `gpt-4-turbo-preview` | High quality reviews, higher cost        |
| **HuggingFace** | 🚧 Coming Soon | Various               | Open source models                       |

## Quick Start

### 1. Basic Setup

Create `.github/workflows/ai-code-review.yml`:

```yaml
name: AI-Powered Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: AI-Powered Code Review
        uses: legiaquan/code-review-action@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          pr_number: ${{ github.event_name == 'workflow_dispatch' && inputs.pr_number || github.event.pull_request.number }}
```

### 2. Advanced Configuration

```yaml
name: AI-Powered Code Review

on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: AI-Powered Code Review
        uses: legiaquan/code-review-action@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          pr_number: ${{ github.event_name == 'workflow_dispatch' && inputs.pr_number || github.event.pull_request.number }}
          review_level: 'diff'
          include_globs: 'src/**/*.ts,lib/**/*.js'
          exclude_globs: '**/*.test.ts,**/*.spec.ts'
          max_chunk_lines: 300
          rules: |
            Focus on security vulnerabilities
            Check for performance issues
            Ensure proper error handling
            Verify TypeScript best practices
```

## Configuration Options

### Inputs

| Input             | Description                                      | Required | Default                                   |
| ----------------- | ------------------------------------------------ | -------- | ----------------------------------------- |
| `provider`        | AI provider (`gemini`, `openai`)                 | No       | `gemini`                                  |
| `api_key`         | API key for the selected provider                | Yes      | -                                         |
| `review_level`    | Review scope (`diff`, `file`, `full`)            | No       | `diff`                                    |
| `include_globs`   | Files to include (comma-separated)               | No       | `src/**/*.ts,src/**/*.js,lib/**`          |
| `exclude_globs`   | Files to exclude (comma-separated)               | No       | `**/*.lock,**/dist/**,**/node_modules/**` |
| `max_chunk_lines` | Max lines per AI request                         | No       | `400`                                     |
| `rules`           | Custom review rules (comma or newline separated) | No       | -                                         |

### Review Levels

- **`diff`**: Only review changed lines (fastest, cheapest)
- **`file`**: Review entire files that have changes
- **`full`**: Review all files in the repository (expensive!)

## Required Permissions

This action requires specific GitHub permissions to function properly:

- **`issues: write`**: To create and update issues for review comments
- **`pull-requests: write`**: To add review comments to pull requests
- **`contents: read`**: To read repository contents for code analysis

**Note**: Without these permissions, the action will fail to post review comments. Make sure to include the `permissions` section in your workflow file as shown in the examples above.

## API Keys Setup

### Gemini (Google AI)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your repository secrets as `GEMINI_API_KEY`

```yaml
api_key: ${{ secrets.GEMINI_API_KEY }}
```

### OpenAI

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Add it to your repository secrets as `OPENAI_API_KEY`

```yaml
provider: 'openai'
api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Custom Rules Examples

### Security-Focused Review

```yaml
rules: |
  Check for SQL injection vulnerabilities
  Verify input validation and sanitization
  Look for hardcoded secrets or credentials
  Ensure proper authentication and authorization
  Check for XSS vulnerabilities in web code
```

### Performance-Focused Review

```yaml
rules: |
  Identify potential performance bottlenecks
  Check for memory leaks or excessive memory usage
  Look for inefficient database queries
  Verify proper caching strategies
  Check for unnecessary re-renders in React components
```

### Style and Best Practices

```yaml
rules: |
  Follow TypeScript best practices
  Ensure proper error handling
  Check for code duplication
  Verify proper naming conventions
  Ensure adequate test coverage
```

## Adding New Providers

Want to add support for a new AI provider? It's easy with our pluggable architecture!

### 1. Create Provider Class

Create `src/providers/your-provider.ts`:

```typescript
import { BaseProvider, ReviewParams, ReviewResult, ProviderError } from '../types';

export class YourProvider extends BaseProvider {
  protected model = 'your-model-name';

  constructor(apiKey: string) {
    super(apiKey);
    // Initialize your provider's client
  }

  async review(params: ReviewParams): Promise<ReviewResult> {
    try {
      const prompt = this.buildPrompt(params);

      // Call your provider's API
      const response = await yourProviderClient.generate(prompt);

      return {
        comment: response.text,
        tokensUsed: response.tokens,
        costUSD: response.cost,
        provider: 'your-provider',
      };
    } catch (error) {
      throw new ProviderError(
        `Your provider error: ${error.message}`,
        'your-provider',
        error.status,
        error,
      );
    }
  }
}
```

### 2. Register Provider

Add to `src/providers/index.ts`:

```typescript
import { YourProvider } from './your-provider';

// Add to the providers map
['your-provider', YourProvider],
```

### 3. Update Types

Add to `ProviderType` in `src/types.ts`:

```typescript
export type ProviderType = 'gemini' | 'openai' | 'your-provider';
```

### 4. Update Action Configuration

Update `action.yml` and documentation.

## Development

### Prerequisites

- Node.js 20+
- TypeScript 5+
- GitHub CLI (optional)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/ai-code-review-action.git
cd ai-code-review-action

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Project Structure

```
src/
├── index.ts              # Main entry point
├── config.ts             # Configuration management
├── file-utils.ts         # File processing utilities
├── types.ts              # TypeScript type definitions
└── providers/
    ├── index.ts          # Provider factory
    ├── ai-provider.ts    # Base provider interface
    ├── gemini.ts         # Gemini implementation
    └── openai.ts         # OpenAI implementation
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- file-utils.test.ts
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Package for distribution (includes dependencies)
npm run package
```

## Usage Examples

### Basic PR Review

```yaml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: legiaquan/code-review-action@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
          pr_number: ${{ github.event_name == 'workflow_dispatch' && inputs.pr_number || github.event.pull_request.number }}
```

### Triggered Review

```yaml
name: Manual Review
on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number'
        required: true
      provider:
        description: 'AI provider'
        default: 'gemini'
        type: choice
        options: ['gemini', 'openai']

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: legiaquan/code-review-action@v1
        with:
          provider: ${{ inputs.provider }}
          api_key: ${{ secrets.GEMINI_API_KEY }}
          pr_number: ${{ inputs.pr_number }}
```

### Multiple Providers

```yaml
name: Multi-Provider Review
on: pull_request

permissions:
  issues: write
  pull-requests: write
  contents: read

jobs:
  gemini-review:
    runs-on: ubuntu-latest
    steps:
      - uses: legiaquan/code-review-action@v1
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}

  openai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: legiaquan/code-review-action@v1
        with:
          provider: 'openai'
          api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Cost Considerations

### Gemini Pricing (2024)

- Input: ~$0.00125 per 1K tokens
- Output: ~$0.005 per 1K tokens
- Very cost-effective for most use cases

### OpenAI Pricing (2024)

- GPT-4 Turbo Input: ~$0.01 per 1K tokens
- GPT-4 Turbo Output: ~$0.03 per 1K tokens
- Higher quality but more expensive

### Cost Optimization Tips

1. Use `review_level: 'diff'` for cost efficiency
2. Adjust `max_chunk_lines` to control request size
3. Use specific `include_globs` to limit files
4. Consider Gemini for routine reviews, OpenAI for critical code

## Troubleshooting

### Common Issues

**API Key Issues**

```
Error: Invalid API key
```

- Verify the API key is correctly set in repository secrets
- Check that the key hasn't expired
- Ensure the key has the necessary permissions

**No Files to Review**

```
Info: No files match the include/exclude patterns
```

- Check your `include_globs` and `exclude_globs` patterns
- Verify files were actually changed in the PR
- Use `**/*` as include pattern to review all files

**Rate Limiting**

```
Error: Rate limit exceeded
```

- The action includes automatic delays between requests
- Consider reducing `max_chunk_lines` for smaller requests
- Check your provider's rate limits

**Large PR Issues**

```

```
