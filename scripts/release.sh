#!/bin/bash

# Release script for AI Code Review Action
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 AI Code Review Action Release Script${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: You must be on the main branch to release${NC}"
    echo -e "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Working directory is not clean${NC}"
    echo "Please commit or stash your changes before releasing"
    git status --short
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"

# Ask for new version
echo -e "${YELLOW}Enter new version (e.g., 1.0.1):${NC}"
read -r NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo -e "${RED}❌ Error: Version cannot be empty${NC}"
    exit 1
fi

# Validate version format
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: Invalid version format. Use semantic versioning (e.g., 1.0.1)${NC}"
    exit 1
fi

echo -e "${BLUE}📝 Updating version to ${NEW_VERSION}...${NC}"

# Update package.json version
npm version $NEW_VERSION --no-git-tag-version

# Update CHANGELOG.md
sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $(date +%Y-%m-%d)/" CHANGELOG.md
rm CHANGELOG.md.bak

# Build and test
echo -e "${BLUE}🔨 Building project...${NC}"
npm run ci

echo -e "${BLUE}🧪 Running tests...${NC}"
npm test

echo -e "${BLUE}📦 Packaging for distribution...${NC}"
npm run package

# Commit changes
echo -e "${BLUE}💾 Committing changes...${NC}"
git add .
git commit -m "🚀 Release v$NEW_VERSION

- Update version to $NEW_VERSION
- Update CHANGELOG.md
- Build and package for distribution"

# Create and push tag
echo -e "${BLUE}🏷️  Creating tag v$NEW_VERSION...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes and tag
echo -e "${BLUE}📤 Pushing changes and tag...${NC}"
git push origin main
git push origin "v$NEW_VERSION"

echo -e "${GREEN}✅ Release v$NEW_VERSION completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. Check GitHub Actions workflow: https://github.com/legiaquan/code-review-action/actions"
echo -e "2. Verify release: https://github.com/legiaquan/code-review-action/releases"
echo -e "3. Update GitHub Marketplace listing if needed"
echo -e "4. Share the release on social media! 🎉"
