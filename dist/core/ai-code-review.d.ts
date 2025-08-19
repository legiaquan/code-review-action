/**
 * Main AI Code Review application class
 */
export declare class AICodeReview {
    private config;
    private githubClient;
    private commentBuilder;
    private errorHandler;
    private fileProcessor;
    private prNumber;
    constructor();
    /**
     * Main execution method
     */
    run(): Promise<void>;
    /**
     * Post the final review comment to GitHub
     */
    private postReviewComment;
}
/**
 * Main execution function
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=ai-code-review.d.ts.map