# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release with AI-powered code review capabilities
- Support for Google Gemini and OpenAI providers
- Pluggable architecture for easy provider extension
- Smart file filtering with glob patterns
- Chunking support for large diffs
- Custom review rules support
- Cost tracking and statistics
- Comprehensive error handling and retry logic

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- API keys are never logged or exposed
- Only diff content is sent to AI providers
- Secure handling of sensitive information

## [1.0.0] - 2024-12-19

### Added

- Initial release
- Gemini AI provider integration
- OpenAI provider integration
- GitHub Actions workflow integration
- TypeScript support
- Comprehensive documentation
- Test coverage
- Linting and formatting setup
