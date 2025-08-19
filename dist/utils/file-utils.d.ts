import { FileChange, ChunkedDiff, DiffChunk } from '../types';
export declare class FileUtils {
    /**
     * Filter files based on include/exclude glob patterns
     */
    static filterFiles(files: FileChange[], includeGlobs: string[], excludeGlobs: string[]): FileChange[];
    /**
     * Split diff content into chunks based on line limit
     */
    static chunkDiff(file: FileChange, maxLines: number): ChunkedDiff;
    /**
     * Parse glob patterns from comma or newline separated string
     */
    static parseGlobPatterns(input: string): string[];
    /**
     * Get file extension from filename
     */
    static getFileExtension(filename: string): string;
    /**
     * Check if file is a text file that can be reviewed
     */
    static isTextFile(filename: string): boolean;
    /**
     * Validate file change object
     */
    static validateFileChange(file: any): file is FileChange;
    /**
     * Calculate total lines of changes across files
     */
    static getTotalChanges(files: FileChange[]): {
        additions: number;
        deletions: number;
        changes: number;
    };
    /**
     * Get summary of file changes by type
     */
    static getChangesSummary(files: FileChange[]): Record<string, number>;
    /**
     * Sanitize filename for safe processing
     */
    static sanitizeFilename(filename: string): string;
    /**
     * Check if diff chunk is meaningful (not just whitespace changes)
     */
    static isMeaningfulChunk(chunk: DiffChunk): boolean;
}
//# sourceMappingURL=file-utils.d.ts.map