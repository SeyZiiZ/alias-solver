import * as fs from 'fs';

export interface Replacement {
  filePath: string;
  original: string;
  replacement: string;
  start: number;
  end: number;
  line: number;
}

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';

function formatFilePath(filePath: string, rootDir: string): string {
  const relative = filePath.startsWith(rootDir)
    ? filePath.slice(rootDir.length + 1)
    : filePath;
  return relative;
}

export function transformFile(
  filePath: string,
  replacements: Replacement[],
  dryRun: boolean,
  rootDir: string,
): void {
  if (replacements.length === 0) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  const displayPath = formatFilePath(filePath, rootDir.replace(/\\/g, '/'));

  console.log(`\n${BOLD}${CYAN}  ${displayPath}${RESET}`);

  // Sort by offset descending to preserve positions when splicing
  const sorted = [...replacements].sort((a, b) => b.start - a.start);

  for (const rep of sorted) {
    console.log(`${DIM}    L${rep.line}:${RESET} ${RED}${rep.original}${RESET} ${DIM}->${RESET} ${GREEN}${rep.replacement}${RESET}`);

    if (!dryRun) {
      content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
    }
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
