import { FileChange, ReviewResult, ActionInputs } from '../types';
import { CommentBuilder } from './comment-builder';
import { ErrorHandler } from './error-handler';
import { GitHubClient } from '../github';
/**
 * Service for processing and reviewing files
 */
export declare class FileProcessor {
    private config;
    private commentBuilder;
    private errorHandler;
    private githubClient;
    private prNumber;
    constructor(config: ActionInputs, commentBuilder: CommentBuilder, errorHandler: ErrorHandler, githubClient: GitHubClient, prNumber: number);
    /**
     * Get and filter changed files from PR
     */
    getChangedFiles(): Promise<FileChange[]>;
    /**
     * Filter files based on include/exclude patterns
     */
    filterFiles(files: FileChange[]): FileChange[];
    /**
     * Review all files and return results
     */
    reviewFiles(files: FileChange[]): Promise<ReviewResult[]>;
    /**
     * Review a single file
     */
    private reviewSingleFile;
    /**
     * Review a single chunk
     */
    private reviewChunk;
    /**
     * Handle errors during file review
     */
    private handleFileReviewError;
    /**
     * Log files summary
     */
    private logFilesSummary;
    /**
     * Log files to be reviewed
     */
    private logFilesToReview;
    /**
     * Log review summary
     */
    private logReviewSummary;
    /**
     * Get emoji for file status
     */
    private getStatusEmoji;
    /**
     * Utility delay function
     */
    private delay;
}
//# sourceMappingURL=file-processor.d.ts.map