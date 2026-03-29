import minimist from 'minimist';

export interface CliOptions {
  dryRun: boolean;
  revert: boolean;
  recursive: boolean;
  path?: string;
  help: boolean;
  version: boolean;
}

export function parseCli(argv: string[]): CliOptions {
  const args = minimist(argv, {
    boolean: ['dry-run', 'help', 'version', 'revert', 'recursive'],
    string: ['path'],
    alias: {
      h: 'help',
      v: 'version',
      p: 'path',
      d: 'dry-run',
      r: 'revert',
      R: 'recursive',
    },
  });

  return {
    dryRun: args['dry-run'] ?? false,
    revert: args.revert ?? false,
    recursive: args.recursive ?? false,
    path: args.path,
    help: args.help ?? false,
    version: args.version ?? false,
  };
}

export function printHelp(): void {
  console.log(`
  alias-solver - Convert relative imports to alias-based imports

  Usage:
    alias-solver [options]

  Options:
    -d, --dry-run      Preview changes without modifying files
    -r, --revert       Revert alias imports back to relative paths
    -p, --path <p>     Target a specific file or directory
    -R, --recursive    With --path, include subdirectories (default: only direct files)
    -h, --help         Show this help message
    -v, --version      Show version number

  Examples:
    alias-solver                              Convert all imports in the project
    alias-solver --dry-run                    Preview changes
    alias-solver --revert                     Revert all alias -> relative imports
    alias-solver -p src/components            Only files directly in src/components/
    alias-solver -p src/components -R         All files in src/components/ and subdirs
    alias-solver --revert -p src/hooks        Revert only files in src/hooks/
    alias-solver --revert -p src/pages -R     Revert src/pages/ and all subdirs
  `);
}

export function printVersion(): void {
  console.log('alias-solver v1.0.0');
}
