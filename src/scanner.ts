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

export async function scanFiles(rootDir: string, targetPath?: string): Promise<string[]> {
  // If targeting a specific file
  if (targetPath) {
    const resolved = path.resolve(rootDir, targetPath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      const ext = path.extname(resolved);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        return [resolved.replace(/\\/g, '/')];
      }
      return [];
    }
    // If it's a directory, use it as the base
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      rootDir = resolved;
    } else {
      console.error(`Path not found: ${resolved}`);
      return [];
    }
  }

  const ignorePatterns = loadGitignorePatterns(rootDir);

  const files = await fg('**/*.{ts,tsx,js,jsx}', {
    cwd: rootDir,
    ignore: ignorePatterns,
    absolute: true,
    onlyFiles: true,
  });

  return files.map(f => f.replace(/\\/g, '/'));
}
