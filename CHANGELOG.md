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

## [1.1.0] - 2024-12-19

### Added

- **GitHub Review Suggestions**: Action now creates GitHub Pull Request Reviews instead of single comments
- **Individual Review Comments**: Each suggestion becomes a separate, resolvable review comment
- **Line-specific Feedback**: Comments are attached to specific code lines for better context
- **Resolvable Conversations**: Users can resolve each suggestion individually when changes are made
- **Enhanced AI Prompts**: Updated provider prompts to generate better-structured suggestions
- **Review Event Support**: Supports COMMENT, REQUEST_CHANGES, and APPROVE review events
- **Better Progress Tracking**: Improved visibility into review completion status

### Changed

- **Review Format**: Changed from `createComment()` to `createReview()` for better GitHub integration
- **Comment Structure**: Enhanced AI prompts to use bullet points for better suggestion parsing
- **User Experience**: Significantly improved review workflow with native GitHub review features
- **Documentation**: Updated README and added comprehensive demo documentation

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- **Enhanced Permissions**: Added proper GitHub permissions for review creation
- **Better Token Handling**: Improved security for GitHub token validation

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
