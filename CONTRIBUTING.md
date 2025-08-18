# Contributing to AI Code Review Action

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ai-code-review-action.git
   cd ai-code-review-action
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Add tests for new functionality
4. Run the test suite:
   ```bash
   npm test
   npm run lint
   ```

5. Build the project:
   ```bash
   npm run build
   npm run package
   ```

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (Prettier + ESLint)
- Add JSDoc comments for public APIs
- Write meaningful commit messages

### Testing

- Write unit tests for all new functionality
- Ensure test coverage remains above 70%
- Test both success and error scenarios
- Use descriptive test names

## Adding New Providers

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
        error
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

### 4. Add Tests

Create `tests/your-provider.test.ts` with comprehensive tests.

### 5. Update Documentation

- Update README.md
- Add provider-specific configuration
- Update action.yml if needed

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear description of your changes
4. Link any related issues
5. Request review from maintainers

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (if applicable)

## Issue Guidelines

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, etc.)
- Relevant logs or error messages

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Breaking changes (if any)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Getting Help

- Check existing issues and discussions
- Read the documentation
- Ask questions in GitHub Discussions
- Contact maintainers for urgent issues

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing! 🚀
