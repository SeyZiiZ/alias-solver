import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

function loadGitignorePatterns(rootDir: string): string[] {
  const defaults = ['node_modules/**', 'dist/**', 'build/**', '.git/**', 'coverage/**'];
  const gitignorePath = path.join(rootDir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) return defaults;

  const lines = fs.readFileSync(gitignorePath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  return [...defaults, ...lines];
}

export async function scanFiles(rootDir: string, targetPath?: string, recursive: boolean = true): Promise<string[]> {
  // If targeting a specific file
  if (targetPath) {
    const resolved = path.resolve(rootDir, targetPath).replace(/\\/g, '/');
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const ext = path.extname(resolved);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        return [resolved];
      }
      return [];
    }
    // If it's a directory
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const pattern = recursive
        ? '**/*.{ts,tsx,js,jsx}'   // all files in all subdirs
        : '*.{ts,tsx,js,jsx}';     // only direct files in this folder

      const ignorePatterns = loadGitignorePatterns(rootDir);
      const files = await fg(pattern, {
        cwd: resolved,
        ignore: ignorePatterns,
        absolute: true,
        onlyFiles: true,
      });

      return files.map(f => f.replace(/\\/g, '/'));
    }

    console.error(`Path not found: ${resolved}`);
    return [];
  }

  // No target path: scan entire project recursively
  const ignorePatterns = loadGitignorePatterns(rootDir);

  const files = await fg('**/*.{ts,tsx,js,jsx}', {
    cwd: rootDir,
    ignore: ignorePatterns,
    absolute: true,
    onlyFiles: true,
  });

  return files.map(f => f.replace(/\\/g, '/'));
}
