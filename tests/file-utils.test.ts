import { FileUtils } from '../src/utils/file-utils';
import { FileChange } from '../src/types/index';

describe('FileUtils', () => {
  describe('filterFiles', () => {
    const mockFiles: FileChange[] = [
      {
        filename: 'src/index.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
        patch: 'mock patch',
      },
      {
        filename: 'src/utils.js',
        status: 'added',
        additions: 20,
        deletions: 0,
        changes: 20,
        patch: 'mock patch',
      },
      {
        filename: 'dist/bundle.js',
        status: 'modified',
        additions: 100,
        deletions: 50,
        changes: 150,
        patch: 'mock patch',
      },
      {
        filename: 'package-lock.json',
        status: 'modified',
        additions: 5,
        deletions: 3,
        changes: 8,
        patch: 'mock patch',
      },
      {
        filename: 'deleted-file.ts',
        status: 'removed',
        additions: 0,
        deletions: 10,
        changes: 10,
      },
    ];

    it('should include files matching include patterns', () => {
      const result = FileUtils.filterFiles(mockFiles, ['src/**/*.ts'], []);
      expect(result).toHaveLength(1);
      expect(result[0]?.filename).toBe('src/index.ts');
    });

    it('should exclude files matching exclude patterns', () => {
      const result = FileUtils.filterFiles(mockFiles, ['**/*'], ['**/dist/**', '**/*.lock', '**/package-lock.json']);
      expect(result).toHaveLength(2);
      expect(result.map((f: FileChange) => f.filename)).toEqual(['src/index.ts', 'src/utils.js']);
    });

    it('should exclude removed files', () => {
      const result = FileUtils.filterFiles(mockFiles, ['**/*'], []);
      expect(result.map((f: FileChange) => f.filename)).not.toContain('deleted-file.ts');
    });

    it('should handle empty include patterns', () => {
      const result = FileUtils.filterFiles(mockFiles, [], ['**/dist/**']);
      expect(result).toHaveLength(3);
    });
  });

  describe('chunkDiff', () => {
    const mockFile: FileChange = {
      filename: 'test.ts',
      status: 'modified',
      additions: 10,
      deletions: 5,
      changes: 15,
      patch: Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n'),
    };

    it('should return single chunk for small files', () => {
      const smallFile = { ...mockFile, patch: 'line 1\nline 2\nline 3' };
      const result = FileUtils.chunkDiff(smallFile, 10);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0]?.total).toBe(1);
      expect(result.chunks[0]?.index).toBe(1);
    });

    it('should split large files into multiple chunks', () => {
      const result = FileUtils.chunkDiff(mockFile, 30);
      
      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.chunks[0]?.total).toBe(result.chunks.length);
    });

    it('should handle files without patch', () => {
      const fileWithoutPatch = { ...mockFile, patch: undefined };
      const result = FileUtils.chunkDiff(fileWithoutPatch, 100);
      
      expect(result.chunks).toHaveLength(0);
    });
  });

  describe('parseGlobPatterns', () => {
    it('should parse comma-separated patterns', () => {
      const result = FileUtils.parseGlobPatterns('*.ts,*.js,src/**');
      expect(result).toEqual(['*.ts', '*.js', 'src/**']);
    });

    it('should parse newline-separated patterns', () => {
      const result = FileUtils.parseGlobPatterns('*.ts\n*.js\nsrc/**');
      expect(result).toEqual(['*.ts', '*.js', 'src/**']);
    });

    it('should handle empty input', () => {
      expect(FileUtils.parseGlobPatterns('')).toEqual([]);
      expect(FileUtils.parseGlobPatterns('   ')).toEqual([]);
    });

    it('should trim whitespace', () => {
      const result = FileUtils.parseGlobPatterns('  *.ts  ,  *.js  ');
      expect(result).toEqual(['*.ts', '*.js']);
    });
  });

  describe('isTextFile', () => {
    it('should identify text files by extension', () => {
      expect(FileUtils.isTextFile('index.ts')).toBe(true);
      expect(FileUtils.isTextFile('script.js')).toBe(true);
      expect(FileUtils.isTextFile('styles.css')).toBe(true);
      expect(FileUtils.isTextFile('config.json')).toBe(true);
      expect(FileUtils.isTextFile('README.md')).toBe(true);
    });

    it('should identify special files by name', () => {
      expect(FileUtils.isTextFile('Dockerfile')).toBe(true);
      expect(FileUtils.isTextFile('Makefile')).toBe(true);
      expect(FileUtils.isTextFile('dockerfile.dev')).toBe(true);
    });

    it('should reject binary files', () => {
      expect(FileUtils.isTextFile('image.png')).toBe(false);
      expect(FileUtils.isTextFile('archive.zip')).toBe(false);
      expect(FileUtils.isTextFile('binary.exe')).toBe(false);
    });
  });

  describe('validateFileChange', () => {
    const validFile = {
      filename: 'test.ts',
      status: 'modified',
      additions: 10,
      deletions: 5,
      changes: 15,
    };

    it('should validate correct file change objects', () => {
      expect(FileUtils.validateFileChange(validFile)).toBe(true);
    });

    it('should reject invalid objects', () => {
      expect(FileUtils.validateFileChange(null)).toBe(false);
      expect(FileUtils.validateFileChange({})).toBe(false);
      expect(FileUtils.validateFileChange({ filename: 'test.ts' })).toBe(false);
    });

    it('should reject invalid status values', () => {
      const invalidFile = { ...validFile, status: 'invalid' };
      expect(FileUtils.validateFileChange(invalidFile)).toBe(false);
    });
  });

  describe('getTotalChanges', () => {
    const files: FileChange[] = [
      {
        filename: 'file1.ts',
        status: 'modified',
        additions: 10,
        deletions: 5,
        changes: 15,
      },
      {
        filename: 'file2.ts',
        status: 'added',
        additions: 20,
        deletions: 0,
        changes: 20,
      },
    ];

    it('should calculate total changes correctly', () => {
      const result = FileUtils.getTotalChanges(files);
      expect(result).toEqual({
        additions: 30,
        deletions: 5,
        changes: 35,
      });
    });

    it('should handle empty array', () => {
      const result = FileUtils.getTotalChanges([]);
      expect(result).toEqual({
        additions: 0,
        deletions: 0,
        changes: 0,
      });
    });
  });

  describe('isMeaningfulChunk', () => {
    it('should identify meaningful chunks', () => {
      const meaningfulChunk = {
        content: 'function test() {\n  return true;\n}',
        startLine: 1,
        endLine: 3,
        index: 1,
        total: 1,
      };
      expect(FileUtils.isMeaningfulChunk(meaningfulChunk)).toBe(true);
    });

    it('should reject empty or whitespace-only chunks', () => {
      const emptyChunk = {
        content: '\n\n   \n',
        startLine: 1,
        endLine: 3,
        index: 1,
        total: 1,
      };
      expect(FileUtils.isMeaningfulChunk(emptyChunk)).toBe(false);
    });

    it('should reject diff header chunks', () => {
      const headerChunk = {
        content: '@@ -1,3 +1,4 @@\n--- a/file.ts\n+++ b/file.ts',
        startLine: 1,
        endLine: 3,
        index: 1,
        total: 1,
      };
      expect(FileUtils.isMeaningfulChunk(headerChunk)).toBe(false);
    });
  });
});
