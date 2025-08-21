# Release Notes - v1.0.1

## Overview

This is a patch release that includes bug fixes and improvements to the AI Code Review GitHub Action.

## Changes

### Bug Fixes

- Fixed TypeScript compilation warnings
- Improved error handling for API failures
- Enhanced file processing reliability

### Improvements

- Updated dependencies to latest stable versions
- Optimized build process
- Enhanced code quality and linting

### Technical Details

- Version bump from v1.0.0 to v1.0.1
- All tests passing (51/51)
- Build size: ~2.2MB (optimized with ncc)
- Node.js compatibility: >=20

## Installation

To use this version in your workflows, update your action reference to:

```yaml
- uses: legiaquan/code-review-action@v1.0.1
```

## Breaking Changes

None

## Migration Guide

No migration required from v1.0.0

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/legiaquan/code-review-action).

---

_Released on: $(date)_
