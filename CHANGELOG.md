# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial release of AI Code Review Action
- Support for Google Gemini AI provider (default)
- Support for OpenAI GPT-4 provider
- Pluggable provider architecture for easy extensibility
- Smart file filtering with include/exclude glob patterns
- Diff chunking for handling large files
- Custom review rules support
- Cost tracking and token usage monitoring
- Comprehensive error handling and logging
- Security best practices (no API key logging)
- Full TypeScript support with strict type checking
- Complete test suite with Jest (50+ tests)
- CI/CD pipeline with GitHub Actions
- Comprehensive documentation and examples

### Features
- **Multi-provider Support**: Gemini (default) and OpenAI with easy provider switching
- **Smart Filtering**: Include/exclude files using minimatch patterns
- **Chunking**: Automatically split large diffs into manageable chunks
- **Custom Rules**: Add specific review criteria via input parameters
- **Cost Tracking**: Monitor API usage and estimated costs
- **Review Levels**: Choose between `diff`, `file`, or `full` review modes
- **Security**: API keys never logged, only diff content sent to providers
- **Extensible**: Easy to add new AI providers with plugin architecture

### Technical Details
- Built with TypeScript 5+ and Node.js 20+
- Uses @octokit/rest for GitHub API integration
- Implements factory pattern for provider management
- Comprehensive error handling with custom error types
- Full test coverage with Jest
- ESLint and Prettier for code quality
- Automated CI/CD with GitHub Actions

### Documentation
- Complete README with usage examples
- Contributing guide for developers
- API documentation for adding new providers
- Example workflows for different use cases
- Security and best practices guide

## [Unreleased]

### Planned
- HuggingFace provider support
- Claude (Anthropic) provider support
- Configuration file support (.ai-review.yml)
- Review templates and presets
- Integration with more code quality tools
- Performance optimizations
- Enhanced error reporting

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
