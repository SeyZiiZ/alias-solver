import minimist from 'minimist';

export interface CliOptions {
  dryRun: boolean;
  revert: boolean;
  path?: string;
  help: boolean;
  version: boolean;
}

export function parseCli(argv: string[]): CliOptions {
  const args = minimist(argv, {
    boolean: ['dry-run', 'help', 'version', 'revert'],
    string: ['path'],
    alias: {
      h: 'help',
      v: 'version',
      p: 'path',
      d: 'dry-run',
      r: 'revert',
    },
  });

  return {
    dryRun: args['dry-run'] ?? false,
    revert: args.revert ?? false,
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
    -d, --dry-run     Preview changes without modifying files
    -r, --revert      Revert alias imports back to relative paths
    -p, --path <p>    Target a specific file or directory
    -h, --help        Show this help message
    -v, --version     Show version number

  Examples:
    alias-solver                    Convert relative -> alias imports
    alias-solver --dry-run          Preview changes
    alias-solver --revert           Revert alias -> relative imports
    alias-solver --revert --dry-run Preview revert changes
    alias-solver --path src/utils   Convert only in src/utils
  `);
}

export function printVersion(): void {
  console.log('alias-solver v1.0.0');
}
