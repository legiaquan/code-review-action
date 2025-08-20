# 🚀 AI-Powered Code Review Action v1.0.0 - Initial Release

## 🎉 What's New

We're excited to announce the initial release of **AI-Powered Code Review Action** - an intelligent GitHub Action that provides automated code reviews using cutting-edge AI providers like Google Gemini and OpenAI GPT-4.

## ✨ Key Features

### 🤖 **Multi-Provider AI Support**

- **Google Gemini** (default) - Fast, cost-effective, and powerful
- **OpenAI GPT-4** - High-quality reviews with advanced reasoning
- **Pluggable Architecture** - Easy to add new AI providers

### 🎯 **Smart Code Review**

- **Intelligent Filtering** - Include/exclude files using glob patterns
- **Chunking Support** - Handles large diffs by splitting into manageable chunks
- **Review Levels** - Choose between `diff`, `file`, or `full` review modes
- **Custom Rules** - Add your own review criteria and guidelines

### 🔒 **Security & Performance**

- **API Key Protection** - Keys are never logged or exposed
- **Cost Tracking** - Monitor token usage and estimated costs
- **Rate Limiting** - Built-in protection against API abuse
- **Error Handling** - Comprehensive error handling with retry logic

### 🛠️ **Developer Experience**

- **TypeScript Support** - Built with modern TypeScript 5+
- **Easy Integration** - Simple YAML configuration
- **Comprehensive Logging** - Detailed feedback and debugging info
- **Flexible Permissions** - Configurable GitHub permissions

## 🚀 Quick Start

### Basic Setup

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
        uses: legiaquan/code-review-action@v1.0.0
        with:
          provider: 'gemini'
          api_key: ${{ secrets.GEMINI_API_KEY }}
```

### Advanced Configuration

```yaml
- name: AI-Powered Code Review
  uses: legiaquan/code-review-action@v1.0.0
  with:
    provider: 'openai'
    api_key: ${{ secrets.OPENAI_API_KEY }}
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

## 🔧 Configuration Options

| Input             | Description                           | Required | Default                                        |
| ----------------- | ------------------------------------- | -------- | ---------------------------------------------- |
| `provider`        | AI provider (`gemini`, `openai`)      | No       | `gemini`                                       |
| `api_key`         | API key for the selected provider     | Yes      | -                                              |
| `review_level`    | Review scope (`diff`, `file`, `full`) | No       | `diff`                                         |
| `include_globs`   | Files to include (comma-separated)    | No       | `src/**/*.ts,src/**/*.js,*.ts,*.js`            |
| `exclude_globs`   | Files to exclude (comma-separated)    | No       | `**/*.test.ts,**/*.spec.ts,**/node_modules/**` |
| `max_chunk_lines` | Max lines per AI request              | No       | `400`                                          |
| `rules`           | Custom review rules                   | No       | -                                              |
| `max_retries`     | Maximum retries for API failures      | No       | `3`                                            |
| `retry_delay`     | Base retry delay in milliseconds      | No       | `1000`                                         |

## 💰 Cost Considerations

### Gemini Pricing (Recommended)

- **Input**: ~$0.00125 per 1K tokens
- **Output**: ~$0.005 per 1K tokens
- **Best for**: Most use cases, cost-effective

### OpenAI Pricing

- **GPT-4 Turbo Input**: ~$0.01 per 1K tokens
- **GPT-4 Turbo Output**: ~$0.03 per 1K tokens
- **Best for**: Critical code reviews, high quality

## 🎯 Use Cases

### 🔍 **Automated PR Reviews**

- Catch bugs and issues before they reach production
- Ensure code quality and consistency
- Reduce manual review time for developers

### 🏗️ **Code Quality Assurance**

- Enforce coding standards and best practices
- Identify potential security vulnerabilities
- Suggest performance improvements

### 📚 **Learning & Onboarding**

- Help new developers understand code patterns
- Provide educational feedback on code changes
- Maintain consistent code quality across teams

## 🚧 What's Coming Next

- **HuggingFace Models** - Support for open-source AI models
- **Claude Integration** - Anthropic's Claude models
- **Configuration Files** - `.ai-review.yml` support
- **Review Templates** - Predefined review criteria
- **Performance Optimizations** - Faster processing and better caching

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🆕 New AI provider implementations
- 🐛 Bug fixes and improvements
- 📚 Documentation updates
- 🧪 Additional test coverage
- 💡 Feature suggestions

Check out our [Contributing Guide](CONTRIBUTING.md) for details.

## 📖 Documentation

- **README**: [Complete usage guide](README.md)
- **Examples**: [Workflow examples](README.md#usage-examples)
- **API Reference**: [Provider documentation](README.md#adding-new-providers)
- **Troubleshooting**: [Common issues and solutions](README.md#troubleshooting)

## 🔗 Links

- **Repository**: https://github.com/legiaquan/code-review-action
- **Issues**: https://github.com/legiaquan/code-review-action/issues
- **Discussions**: https://github.com/legiaquan/code-review-action/discussions
- **Releases**: https://github.com/legiaquan/code-review-action/releases

## 🙏 Acknowledgments

Special thanks to:

- **Google AI** for providing Gemini models
- **OpenAI** for GPT-4 access
- **GitHub** for the Actions platform
- **The open-source community** for inspiration and feedback

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the developer community**

_Ready to revolutionize your code review process? Try AI Code Review Action today!_
