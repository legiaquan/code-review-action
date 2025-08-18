import { minimatch } from 'minimatch';
import { FileChange, ChunkedDiff, DiffChunk } from './types';

export class FileUtils {
  /**
   * Filter files based on include/exclude glob patterns
   */
  static filterFiles(
    files: FileChange[],
    includeGlobs: string[],
    excludeGlobs: string[],
  ): FileChange[] {
    return files.filter(file => {
      // Skip removed files as they don't have content to review
      if (file.status === 'removed') {
        return false;
      }

      // Check include patterns
      const isIncluded =
        includeGlobs.length === 0 ||
        includeGlobs.some(pattern => minimatch(file.filename, pattern));

      if (!isIncluded) {
        return false;
      }

      // Check exclude patterns
      const isExcluded = excludeGlobs.some(pattern => minimatch(file.filename, pattern));

      return !isExcluded;
    });
  }

  /**
   * Split diff content into chunks based on line limit
   */
  static chunkDiff(file: FileChange, maxLines: number): ChunkedDiff {
    if (!file.patch) {
      return {
        filename: file.filename,
        chunks: [],
      };
    }

    const lines = file.patch.split('\n');
    const chunks: DiffChunk[] = [];

    if (lines.length <= maxLines) {
      // Single chunk if within limit
      chunks.push({
        content: file.patch,
        startLine: 1,
        endLine: lines.length,
        index: 1,
        total: 1,
      });
    } else {
      // Split into multiple chunks
      let currentChunk: string[] = [];
      let chunkStartLine = 1;
      let chunkIndex = 1;

      for (let i = 0; i < lines.length; i++) {
        currentChunk.push(lines[i]!);

        // Check if we should create a chunk
        const shouldCreateChunk =
          currentChunk.length >= maxLines || // Reached max lines
          i === lines.length - 1; // Last line

        if (shouldCreateChunk) {
          chunks.push({
            content: currentChunk.join('\n'),
            startLine: chunkStartLine,
            endLine: chunkStartLine + currentChunk.length - 1,
            index: chunkIndex,
            total: 0, // Will be set after all chunks are created
          });

          // Prepare for next chunk with some overlap for context
          const overlapLines = Math.min(5, Math.floor(maxLines * 0.1));
          if (i < lines.length - 1 && currentChunk.length > overlapLines) {
            const overlap = currentChunk.slice(-overlapLines);
            currentChunk = overlap;
            chunkStartLine = chunkStartLine + currentChunk.length - overlapLines;
          } else {
            currentChunk = [];
            chunkStartLine = i + 2; // +2 because i is 0-based and we want next line
          }

          chunkIndex++;
        }
      }

      // Update total count for all chunks
      chunks.forEach(chunk => {
        chunk.total = chunks.length;
      });
    }

    return {
      filename: file.filename,
      chunks,
    };
  }

  /**
   * Parse glob patterns from comma or newline separated string
   */
  static parseGlobPatterns(input: string): string[] {
    if (!input || input.trim() === '') {
      return [];
    }

    // Split by comma or newline, trim whitespace, filter empty
    return input
      .split(/[,\n]/)
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0);
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Check if file is a text file that can be reviewed
   */
  static isTextFile(filename: string): boolean {
    const textExtensions = new Set([
      // Programming languages
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'rb',
      'php',
      'java',
      'c',
      'cpp',
      'cc',
      'cxx',
      'h',
      'hpp',
      'cs',
      'go',
      'rs',
      'kt',
      'scala',
      'swift',
      'dart',
      'r',
      'matlab',
      // Web technologies
      'html',
      'htm',
      'css',
      'scss',
      'sass',
      'less',
      'vue',
      'svelte',
      // Config and data
      'json',
      'yaml',
      'yml',
      'toml',
      'ini',
      'cfg',
      'conf',
      'xml',
      // Documentation
      'md',
      'rst',
      'txt',
      'tex',
      // Shell scripts
      'sh',
      'bash',
      'zsh',
      'fish',
      'ps1',
      'bat',
      'cmd',
      // Database
      'sql',
      'plsql',
      'psql',
      // Others
      'dockerfile',
      'makefile',
      'gradle',
      'cmake',
    ]);

    const extension = this.getFileExtension(filename);
    const basename = filename.toLowerCase().split('/').pop() || '';

    return (
      textExtensions.has(extension) ||
      textExtensions.has(basename) ||
      basename.startsWith('dockerfile') ||
      basename.includes('makefile') ||
      basename.endsWith('.gradle')
    );
  }

  /**
   * Validate file change object
   */
  static validateFileChange(file: any): file is FileChange {
    if (!file || typeof file !== 'object') {
      return false;
    }

    const requiredFields = ['filename', 'status', 'additions', 'deletions', 'changes'];
    const validStatuses = ['added', 'modified', 'removed', 'renamed'];

    return (
      requiredFields.every(field => field in file) &&
      validStatuses.includes(file.status) &&
      typeof file.filename === 'string' &&
      typeof file.additions === 'number' &&
      typeof file.deletions === 'number' &&
      typeof file.changes === 'number'
    );
  }

  /**
   * Calculate total lines of changes across files
   */
  static getTotalChanges(files: FileChange[]): {
    additions: number;
    deletions: number;
    changes: number;
  } {
    return files.reduce(
      (totals, file) => ({
        additions: totals.additions + file.additions,
        deletions: totals.deletions + file.deletions,
        changes: totals.changes + file.changes,
      }),
      { additions: 0, deletions: 0, changes: 0 },
    );
  }

  /**
   * Get summary of file changes by type
   */
  static getChangesSummary(files: FileChange[]): Record<string, number> {
    return files.reduce(
      (summary, file) => {
        summary[file.status] = (summary[file.status] || 0) + 1;
        return summary;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Sanitize filename for safe processing
   */
  static sanitizeFilename(filename: string): string {
    // Remove any potentially dangerous characters
    return filename.replace(/[<>:"|?*\x00-\x1f]/g, '_');
  }

  /**
   * Check if diff chunk is meaningful (not just whitespace changes)
   */
  static isMeaningfulChunk(chunk: DiffChunk): boolean {
    const lines = chunk.content.split('\n');
    const meaningfulLines = lines.filter(line => {
      const trimmed = line.trim();
      // Skip empty lines, pure whitespace changes, and diff headers
      return (
        trimmed.length > 0 &&
        !trimmed.match(/^[@\-+\s]*$/) &&
        !trimmed.startsWith('@@') &&
        !trimmed.startsWith('diff --git') &&
        !trimmed.startsWith('index ') &&
        !trimmed.startsWith('+++') &&
        !trimmed.startsWith('---')
      );
    });

    return meaningfulLines.length > 0;
  }
}
