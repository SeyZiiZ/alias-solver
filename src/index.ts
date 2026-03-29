import * as fs from 'fs';
import * as path from 'path';
import { parseCli, printHelp, printVersion } from './cli';
import { detectConfig, sortAliasesBySpecificity, generateAliasesFromStructure, writeAliasesToTsConfig } from './detector';
import { scanFiles } from './scanner';
import { parseImports, getLineNumber } from './parser';
import { resolveImportToAlias, resolveAliasToRelative } from './resolver';
import { transformFile, Replacement } from './transformer';

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }
  if (options.version) {
    printVersion();
    return;
  }

  const rootDir = process.cwd().replace(/\\/g, '/');

  // Step 1: Detect config
  console.log(`\n${BOLD}alias-solver${RESET} ${DIM}v1.0.0${RESET}\n`);

  let config = detectConfig(rootDir);

  if (config.configSource === 'none' || config.aliases.length === 0) {
    // Auto-generate aliases from folder structure
    const generated = generateAliasesFromStructure(rootDir);

    if (generated.length === 0) {
      console.error(`${YELLOW}No alias configuration found and no src/ directory detected.${RESET}`);
      console.error('Ensure your project has one of:');
      console.error('  - tsconfig.json with compilerOptions.paths');
      console.error('  - vite.config.ts/js with resolve.alias');
      console.error('  - webpack.config.js with resolve.alias');
      console.error('  - A src/, app/, or lib/ directory (for auto-generation)');
      process.exit(1);
    }

    console.log(`${YELLOW}No alias config found — auto-generating from folder structure:${RESET}\n`);

    for (const a of generated) {
      const displayAlias = a.alias.endsWith('/') ? a.alias + '*' : a.alias;
      const relTarget = path.relative(rootDir, a.targets[0]).replace(/\\/g, '/');
      console.log(`  ${CYAN}${displayAlias}${RESET} ${DIM}-> ${relTarget}${RESET}`);
    }

    // Write to tsconfig.json
    const configPath = writeAliasesToTsConfig(rootDir, generated);
    console.log(`\n${GREEN}Wrote aliases to ${path.relative(rootDir, configPath).replace(/\\/g, '/')}${RESET}\n`);

    // Re-detect with the newly written config
    config = detectConfig(rootDir);

    if (config.aliases.length === 0) {
      console.error(`${YELLOW}Failed to read back generated config.${RESET}`);
      process.exit(1);
    }
  }

  const relConfigPath = path.relative(rootDir, config.configPath).replace(/\\/g, '/');
  const modeLabel = options.revert ? `${YELLOW}REVERT${RESET} alias -> relative` : 'relative -> alias';
  console.log(`${DIM}Mode:${RESET}    ${modeLabel}`);
  console.log(`${DIM}Config:${RESET}  ${config.configSource} ${DIM}(${relConfigPath})${RESET}`);
  console.log(`${DIM}Aliases:${RESET} ${config.aliases.map(a => `${CYAN}${a.alias}${RESET}${DIM} -> ${a.targets[0]}${RESET}`).join(', ')}`);

  // Step 2: Scan files
  const files = await scanFiles(rootDir, options.path, options.path ? options.recursive : true);

  if (files.length === 0) {
    console.log(`\n${YELLOW}No source files found.${RESET}`);
    return;
  }

  if (options.path) {
    const scope = options.recursive ? 'recursive' : 'direct files only';
    console.log(`${DIM}Path:${RESET}    ${options.path} ${DIM}(${scope})${RESET}`);
  }
  console.log(`${DIM}Files:${RESET}   ${files.length} source file(s)\n`);

  if (options.dryRun) {
    console.log(`${YELLOW}${BOLD}DRY RUN${RESET} ${DIM}— no files will be modified${RESET}\n`);
  }

  // Step 3-4: Parse + Resolve
  const sortedAliases = sortAliasesBySpecificity(config.aliases);
  const aliasPrefixes = config.aliases.map(a => a.alias);
  let totalChanges = 0;
  let filesChanged = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const imports = options.revert
      ? parseImports(content, 'alias', aliasPrefixes)
      : parseImports(content);
    const replacements: Replacement[] = [];

    for (const imp of imports) {
      const resolved = options.revert
        ? resolveAliasToRelative(imp.specifier, file, sortedAliases)
        : resolveImportToAlias(imp.specifier, file, sortedAliases);

      if (resolved && resolved !== imp.specifier) {
        replacements.push({
          filePath: file,
          original: imp.specifier,
          replacement: resolved,
          start: imp.start,
          end: imp.end,
          line: getLineNumber(content, imp.start),
        });
      }
    }

    if (replacements.length > 0) {
      transformFile(file, replacements, options.dryRun, rootDir);
      totalChanges += replacements.length;
      filesChanged++;
    }
  }

  // Summary
  if (totalChanges === 0) {
    const msg = options.revert
      ? 'No alias imports to revert. Everything is already relative!'
      : 'No relative imports to convert. Everything looks clean!';
    console.log(`\n${GREEN}${msg}${RESET}`);
  } else {
    const verb = options.dryRun ? 'Would convert' : 'Converted';
    console.log(`\n${BOLD}${GREEN}${verb} ${totalChanges} import(s) in ${filesChanged} file(s).${RESET}`);
    if (options.dryRun) {
      console.log(`${DIM}Run without --dry-run to apply changes.${RESET}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
