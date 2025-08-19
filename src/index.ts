// Main entry point - re-export from core
export { AICodeReview, main } from './core';

// Execute when run as the main module by GitHub Actions runtime
import * as core from '@actions/core';
import { main as runMain } from './core';

runMain().catch((error: unknown) => {
  core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
