#!/bin/bash

# Quick script to create a test PR for AI Code Review Action
# Usage: ./scripts/create-test-pr.sh [branch-name]

set -e

# Configuration
BRANCH_NAME=${1:-"test-ai-review-$(date +%s)"}
BASE_BRANCH="main"
TEST_FILE="test-sample.ts"

echo "🚀 Creating test PR for AI Code Review Action"
echo "================================================"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo "❌ Test file $TEST_FILE not found"
    exit 1
fi

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Create and checkout new branch
echo "🌿 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# Make some changes to the test file
echo "📝 Adding changes to $TEST_FILE"
cat >> "$TEST_FILE" << EOF

// === TEST CHANGES FOR AI REVIEW ===
// Added on $(date)

// Additional security issue for testing
const ANOTHER_SECRET = 'hardcoded-secret-$(date +%s)';

// Additional performance issue
function inefficientSearch(arr: any[], target: any): boolean {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (arr[i] === target) {
        return true;
      }
    }
  }
  return false;
}

// Additional TypeScript issue
function badTypeFunction(param: any): any {
  return param.someProperty.anotherProperty;
}

// Additional error handling issue
function riskyFunction() {
  throw new Error('Something went wrong');
}

export { ANOTHER_SECRET, inefficientSearch, badTypeFunction, riskyFunction };
EOF

# Add and commit changes
git add "$TEST_FILE"
git commit -m "test: Add sample issues for AI code review testing

This commit adds various code issues to test the AI Code Review Action:
- Security: Hardcoded secrets
- Performance: Inefficient algorithms  
- TypeScript: Any type usage
- Error handling: Poor error management

Expected AI feedback should cover all these areas."

# Push the branch
echo "📤 Pushing branch to origin"
git push origin "$BRANCH_NAME"

# Create PR using GitHub CLI (if available)
if command -v gh &> /dev/null; then
    echo "📋 Creating PR using GitHub CLI"
    
    gh pr create \
        --title "🧪 Test AI Code Review - $(date '+%Y-%m-%d %H:%M')" \
        --body "## Test AI Code Review Action

This PR was created automatically to test the AI Code Review Action.

### Test Content
- **File**: \`$TEST_FILE\`
- **Branch**: \`$BRANCH_NAME\`  
- **Created**: $(date)

### Expected AI Feedback
The test file contains various code issues that should be detected:

#### 🔒 Security Issues
- Hardcoded API keys and secrets
- SQL injection vulnerabilities
- Weak password validation

#### ⚡ Performance Issues  
- Inefficient algorithms (O(n²) complexity)
- Memory leaks (uncleaned timers)
- Synchronous file operations

#### 📝 TypeScript Issues
- \`any\` type usage instead of proper types
- Bloated interfaces
- Missing error type definitions

#### 🐛 Logic Issues
- Division by zero potential
- Race conditions in async code
- Unused variables

### Testing Instructions

1. **Manual Test**: Run the AI Code Review Action workflow manually
2. **Automatic Test**: The action should trigger automatically on this PR
3. **Multiple Providers**: Test with both Gemini and OpenAI if available

### Cleanup
This PR can be closed after testing is complete." \
        --head "$BRANCH_NAME" \
        --base "$BASE_BRANCH" \
        --draft
    
    echo "✅ PR created successfully!"
    echo "🔗 View at: $(gh pr view --web 2>/dev/null || echo 'Check GitHub web interface')"
    
else
    echo "⚠️  GitHub CLI not found. Please create PR manually:"
    echo "   Branch: $BRANCH_NAME"
    echo "   Base: $BASE_BRANCH"
    echo "   Title: 🧪 Test AI Code Review - $(date '+%Y-%m-%d %H:%M')"
fi

# Instructions
echo ""
echo "📋 Next Steps:"
echo "1. Go to your repository on GitHub"
echo "2. Navigate to Actions tab"
echo "3. Run 'Test AI Code Review Action' workflow"
echo "4. Or wait for automatic trigger if configured"
echo ""
echo "🧹 Cleanup:"
echo "git checkout $CURRENT_BRANCH"
echo "git branch -D $BRANCH_NAME"
echo "git push origin --delete $BRANCH_NAME"
echo ""
echo "✨ Happy testing!"
