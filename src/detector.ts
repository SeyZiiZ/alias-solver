import * as fs from 'fs';
import * as path from 'path';

export interface AliasMapping {
  alias: string;
  targets: string[];
}

export interface ProjectConfig {
  rootDir: string;
  configSource: 'tsconfig' | 'vite' | 'webpack' | 'none';
  configPath: string;
  aliases: AliasMapping[];
}

function stripJsonComments(text: string): string {
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  while (i < text.length) {
    if (inString) {
      if (text[i] === '\\') {
        result += text[i] + (text[i + 1] || '');
        i += 2;
        continue;
      }
      if (text[i] === stringChar) {
        inString = false;
      }
      result += text[i];
      i++;
    } else {
      if (text[i] === '"' || text[i] === "'") {
        inString = true;
        stringChar = text[i];
        result += text[i];
        i++;
      } else if (text[i] === '/' && text[i + 1] === '/') {
        // Skip until end of line
        while (i < text.length && text[i] !== '\n') i++;
      } else if (text[i] === '/' && text[i + 1] === '*') {
        i += 2;
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i += 2;
      } else {
        result += text[i];
        i++;
      }
    }
  }
  return result;
}

function readJsonc(filePath: string): any {
  const text = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(stripJsonComments(text));
}

function parseTsConfig(configPath: string, rootDir: string, visited: Set<string> = new Set()): AliasMapping[] {
  const realPath = path.resolve(configPath);
  if (visited.has(realPath)) return [];
  visited.add(realPath);

  let config: any;
  try {
    config = readJsonc(configPath);
  } catch {
    console.warn(`Warning: Could not parse ${configPath}`);
    return [];
  }

  const configDir = path.dirname(realPath);
  let aliases: AliasMapping[] = [];

  // Handle extends
  if (config.extends) {
    const extendsPath = config.extends.startsWith('.')
      ? path.resolve(configDir, config.extends)
      : resolveExtendsPackage(config.extends, configDir);
    if (extendsPath && fs.existsSync(extendsPath)) {
      aliases = parseTsConfig(extendsPath, rootDir, visited);
    }
  }

  const compilerOptions = config.compilerOptions;
  if (!compilerOptions?.paths) return aliases;

  const baseUrl = compilerOptions.baseUrl
    ? path.resolve(configDir, compilerOptions.baseUrl)
    : configDir;

  const paths: Record<string, string[]> = compilerOptions.paths;

  for (const [pattern, targets] of Object.entries(paths)) {
    const isWildcard = pattern.endsWith('/*');
    const aliasPrefix = isWildcard ? pattern.slice(0, -1) : pattern; // "@/*" -> "@/"  or "@config" -> "@config"

    const resolvedTargets = targets.map(t => {
      const stripped = isWildcard && t.endsWith('/*') ? t.slice(0, -2) : t;
      return normalizePath(path.resolve(baseUrl, stripped));
    });

    // Override parent alias if child redefines it
    aliases = aliases.filter(a => a.alias !== aliasPrefix);
    aliases.push({ alias: aliasPrefix, targets: resolvedTargets });
  }

  return aliases;
}

function resolveExtendsPackage(name: string, fromDir: string): string | null {
  try {
    // Try to resolve as a package (e.g. "@tsconfig/node18/tsconfig.json")
    const resolved = require.resolve(name, { paths: [fromDir] });
    return resolved;
  } catch {
    // Try adding /tsconfig.json
    try {
      return require.resolve(name + '/tsconfig.json', { paths: [fromDir] });
    } catch {
      return null;
    }
  }
}

function parseViteConfig(configPath: string): AliasMapping[] {
  const content = fs.readFileSync(configPath, 'utf-8');
  const configDir = path.dirname(path.resolve(configPath));
  const aliases: AliasMapping[] = [];

  // Match object form: { '@': resolve(__dirname, 'src'), '@utils': resolve(__dirname, 'src/utils') }
  // Match patterns like: '@': path.resolve(__dirname, 'src') or '@': resolve(__dirname, './src')
  const objectPattern = /['"](@[^'"]*)['"]\s*:\s*(?:path\.)?(?:resolve|join)\s*\(\s*(?:__dirname|import\.meta\.dirname)\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = objectPattern.exec(content)) !== null) {
    const alias = match[1].endsWith('/') ? match[1] : match[1] + '/';
    const target = normalizePath(path.resolve(configDir, match[2]));
    aliases.push({ alias, targets: [target] });
  }

  // Match string form: '@': './src'
  const stringPattern = /['"](@[^'"]*)['"]\s*:\s*['"](\.[^'"]+)['"]/g;
  while ((match = stringPattern.exec(content)) !== null) {
    const aliasName = match[1];
    // Skip if already found by objectPattern
    const alias = aliasName.endsWith('/') ? aliasName : aliasName + '/';
    if (aliases.some(a => a.alias === alias)) continue;
    const target = normalizePath(path.resolve(configDir, match[2]));
    aliases.push({ alias, targets: [target] });
  }

  // Match array form: { find: '@', replacement: resolve(__dirname, 'src') }
  const arrayPattern = /find\s*:\s*['"](@[^'"]*)['"]\s*,\s*replacement\s*:\s*(?:path\.)?(?:resolve|join)\s*\(\s*(?:__dirname|import\.meta\.dirname)\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = arrayPattern.exec(content)) !== null) {
    const alias = match[1].endsWith('/') ? match[1] : match[1] + '/';
    const target = normalizePath(path.resolve(configDir, match[2]));
    aliases.push({ alias, targets: [target] });
  }

  if (aliases.length === 0) {
    console.warn(`Warning: Could not statically parse aliases from ${configPath}. Consider adding a tsconfig.json with paths.`);
  }

  return aliases;
}

function parseWebpackConfig(configPath: string): AliasMapping[] {
  const content = fs.readFileSync(configPath, 'utf-8');
  const configDir = path.dirname(path.resolve(configPath));
  const aliases: AliasMapping[] = [];

  // Match: '@': path.resolve(__dirname, 'src')
  const pattern = /['"](@[^'"]*)['"]\s*:\s*(?:path\.)?(?:resolve|join)\s*\(\s*__dirname\s*,\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const alias = match[1].endsWith('/') ? match[1] : match[1] + '/';
    const target = normalizePath(path.resolve(configDir, match[2]));
    aliases.push({ alias, targets: [target] });
  }

  // Match string form: '@': './src'
  const stringPattern = /['"](@[^'"]*)['"]\s*:\s*['"](\.[^'"]+)['"]/g;
  while ((match = stringPattern.exec(content)) !== null) {
    const aliasName = match[1];
    const alias = aliasName.endsWith('/') ? aliasName : aliasName + '/';
    if (aliases.some(a => a.alias === alias)) continue;
    const target = normalizePath(path.resolve(configDir, match[2]));
    aliases.push({ alias, targets: [target] });
  }

  if (aliases.length === 0) {
    console.warn(`Warning: Could not statically parse aliases from ${configPath}. Consider adding a tsconfig.json with paths.`);
  }

  return aliases;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function sortAliasesBySpecificity(aliases: AliasMapping[]): AliasMapping[] {
  return [...aliases].sort((a, b) => {
    const aMaxLen = Math.max(...a.targets.map(t => t.length));
    const bMaxLen = Math.max(...b.targets.map(t => t.length));
    return bMaxLen - aMaxLen; // longer targets first = more specific
  });
}

// Reserved npm scopes that should not be used as alias names
const RESERVED_ALIAS_NAMES = new Set(['types', 'type']);

export function generateAliasesFromStructure(rootDir: string): AliasMapping[] {
  // Find the source root: src/, app/, or lib/
  const candidates = ['src', 'app', 'lib'];
  let sourceRoot = '';

  for (const dir of candidates) {
    const full = path.join(rootDir, dir);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      sourceRoot = dir;
      break;
    }
  }

  if (!sourceRoot) return [];

  const sourceDir = path.join(rootDir, sourceRoot);
  const aliases: AliasMapping[] = [];

  // Always add catch-all @/* -> src/*
  aliases.push({
    alias: '@/',
    targets: [normalizePath(sourceDir)],
  });

  // Scan top-level directories in source root
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    // Skip reserved names that conflict with npm scopes
    if (RESERVED_ALIAS_NAMES.has(entry.name)) continue;

    const alias = `@${entry.name}/`;
    const target = normalizePath(path.join(sourceDir, entry.name));
    aliases.push({ alias, targets: [target] });
  }

  return aliases;
}

export function writeAliasesToTsConfig(rootDir: string, aliases: AliasMapping[]): string {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');

  let config: any = {};
  if (fs.existsSync(tsconfigPath)) {
    try {
      config = readJsonc(tsconfigPath);
    } catch {
      config = {};
    }
  }

  if (!config.compilerOptions) config.compilerOptions = {};
  if (!config.compilerOptions.baseUrl) config.compilerOptions.baseUrl = '.';

  // Build paths object from aliases
  const paths: Record<string, string[]> = {};
  for (const { alias, targets } of aliases) {
    const isExact = !alias.endsWith('/');
    const pattern = isExact ? alias : alias + '*';
    const targetPaths = targets.map(t => {
      let rel = normalizePath(path.relative(rootDir, t));
      return isExact ? rel : rel + '/*';
    });
    paths[pattern] = targetPaths;
  }

  config.compilerOptions.paths = paths;

  fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return tsconfigPath;
}

export function detectConfig(rootDir: string): ProjectConfig {
  const none: ProjectConfig = { rootDir, configSource: 'none', configPath: '', aliases: [] };

  // 1. tsconfig.json
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const aliases = parseTsConfig(tsconfigPath, rootDir);
    if (aliases.length > 0) {
      return { rootDir, configSource: 'tsconfig', configPath: tsconfigPath, aliases };
    }
  }

  // 2. Vite config
  const viteConfigs = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs'];
  for (const name of viteConfigs) {
    const configPath = path.join(rootDir, name);
    if (fs.existsSync(configPath)) {
      const aliases = parseViteConfig(configPath);
      if (aliases.length > 0) {
        return { rootDir, configSource: 'vite', configPath, aliases };
      }
    }
  }

  // 3. Webpack config
  const webpackConfigs = ['webpack.config.js', 'webpack.config.ts'];
  for (const name of webpackConfigs) {
    const configPath = path.join(rootDir, name);
    if (fs.existsSync(configPath)) {
      const aliases = parseWebpackConfig(configPath);
      if (aliases.length > 0) {
        return { rootDir, configSource: 'webpack', configPath, aliases };
      }
    }
  }

  return none;
}
