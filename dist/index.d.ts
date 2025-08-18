declare class AICodeReview {
    private config;
    private octokit;
    private repoInfo;
    private prNumber;
    constructor();
    run(): Promise<void>;
    private getChangedFiles;
    private reviewFiles;
    private postReviewComment;
    private formatReviewComment;
    private buildFinalComment;
    private handleError;
    private delay;
}
declare function main(): Promise<void>;
export { AICodeReview, main };
//# sourceMappingURL=index.d.ts.map