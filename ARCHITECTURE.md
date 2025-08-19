# Architecture Overview

## Project Structure

The codebase has been refactored into a clean, maintainable architecture with clear separation of concerns:

```
src/
├── core/                    # Main application logic
│   ├── ai-code-review.ts   # Main application class
│   └── index.ts            # Core module exports
├── services/               # Business logic services
│   ├── comment-builder.ts  # Comment formatting and building
│   ├── error-handler.ts    # Centralized error handling
│   ├── file-processor.ts   # File processing and review logic
│   └── index.ts            # Services module exports
├── github/                 # GitHub-related functionality
│   ├── github-client.ts    # GitHub API client with fallback
│   └── index.ts            # GitHub module exports
├── utils/                  # Utility functions and helpers
│   ├── config.ts           # Configuration management
│   ├── file-utils.ts       # File processing utilities
│   └── index.ts            # Utils module exports
├── types/                  # Type definitions
│   └── index.ts            # All TypeScript interfaces and types
├── providers/              # AI provider implementations
│   ├── ai-provider.ts      # Base provider types
│   ├── gemini.ts          # Google Gemini implementation
│   ├── openai.ts          # OpenAI implementation
│   └── index.ts           # Provider factory and exports
└── index.ts               # Main entry point

```

## Architecture Principles

### 1. **Separation of Concerns**
Each directory has a specific responsibility:
- **Core**: Application orchestration and main business logic
- **Services**: Reusable business logic components
- **GitHub**: All GitHub API interactions
- **Utils**: Pure utility functions and configuration
- **Types**: Type definitions for better type safety
- **Providers**: AI provider implementations

### 2. **Dependency Injection**
The main `AICodeReview` class uses dependency injection to compose services:

```typescript
constructor() {
  this.config = Config.loadFromInputs();
  this.githubClient = new GitHubClient(repoInfo);
  this.commentBuilder = new CommentBuilder(this.config);
  this.errorHandler = new ErrorHandler(this.githubClient, this.commentBuilder, this.prNumber);
  this.fileProcessor = new FileProcessor(/* dependencies */);
}
```

### 3. **Single Responsibility Principle**
Each class has a single, well-defined responsibility:
- `GitHubClient`: Handle all GitHub API interactions
- `CommentBuilder`: Format and build different types of comments
- `ErrorHandler`: Centralized error handling and reporting
- `FileProcessor`: Process files and coordinate reviews
- `Config`: Configuration management and validation

### 4. **Composition over Inheritance**
Services are composed together rather than using deep inheritance hierarchies.

## Key Components

### Core Application (`src/core/`)

**AICodeReview**: The main orchestrator that:
- Initializes all services
- Coordinates the review process
- Handles the main execution flow

### Services (`src/services/`)

**CommentBuilder**: 
- Formats review comments with proper structure
- Builds comprehensive final review reports
- Creates error comments with troubleshooting guidance

**ErrorHandler**:
- Centralized error handling for different error types
- Posts error details to GitHub PRs
- Provides user-friendly error messages and solutions

**FileProcessor**:
- Fetches and filters changed files
- Coordinates file reviews with AI providers
- Manages chunking for large files

### GitHub Integration (`src/github/`)

**GitHubClient**:
- Robust GitHub API client with automatic fallback
- Permission validation
- Retry logic with exponential backoff
- Detailed error handling for different API scenarios

### Utilities (`src/utils/`)

**Config**: 
- Loads and validates configuration from GitHub Action inputs
- Provides default values and validation
- Centralized configuration management

**FileUtils**:
- File filtering based on glob patterns
- Diff chunking for large files
- File type validation and utilities

## Benefits of This Architecture

### 1. **Maintainability**
- Clear separation of concerns makes it easy to locate and modify functionality
- Each component can be updated independently
- Consistent structure across the codebase

### 2. **Testability**
- Services can be unit tested in isolation
- Dependencies can be easily mocked
- Clear interfaces between components

### 3. **Reusability**
- Services can be reused across different parts of the application
- Components are loosely coupled
- Easy to extend with new functionality

### 4. **Error Handling**
- Centralized error handling provides consistent user experience
- Detailed error messages with troubleshooting guidance
- Graceful fallback mechanisms

### 5. **Scalability**
- Easy to add new AI providers
- Simple to extend with new comment types
- Modular structure supports feature additions

## Import Strategy

### Barrel Exports
Each directory has an `index.ts` file that exports its public API:

```typescript
// src/services/index.ts
export { CommentBuilder } from './comment-builder';
export { ErrorHandler } from './error-handler';
export { FileProcessor } from './file-processor';
```

### Clean Imports
Components import from directory level rather than individual files:

```typescript
import { CommentBuilder, ErrorHandler, FileProcessor } from '../services';
import { GitHubClient } from '../github';
import { Config, FileUtils } from '../utils';
```

## Future Enhancements

The modular architecture makes it easy to add:

1. **New AI Providers**: Add to `src/providers/`
2. **Additional Services**: Add to `src/services/`
3. **New Comment Types**: Extend `CommentBuilder`
4. **Enhanced Error Handling**: Extend `ErrorHandler`
5. **New Utilities**: Add to `src/utils/`

## Development Guidelines

1. **Keep services focused**: Each service should have a single, clear responsibility
2. **Use dependency injection**: Pass dependencies through constructors
3. **Maintain barrel exports**: Update `index.ts` files when adding new exports
4. **Follow error handling patterns**: Use the centralized `ErrorHandler`
5. **Add proper TypeScript types**: Define interfaces in `src/types/`

This architecture provides a solid foundation for maintaining and extending the AI Code Review Action while keeping the codebase clean and manageable.
