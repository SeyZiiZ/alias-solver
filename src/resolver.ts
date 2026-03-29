import * as fs from 'fs';
import * as path from 'path';
import { AliasMapping } from './detector';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const INDEX_FILES = EXTENSIONS.map(ext => 'index' + ext);

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function resolveFile(absoluteTarget: string): { resolvedFile: string; isIndex: boolean } | null {
  // Check if it already has an extension and exists
  if (fs.existsSync(absoluteTarget) && fs.statSync(absoluteTarget).isFile()) {
    return { resolvedFile: normalizePath(absoluteTarget), isIndex: false };
  }

  // Try adding extensions
  for (const ext of EXTENSIONS) {
    const candidate = absoluteTarget + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { resolvedFile: normalizePath(candidate), isIndex: false };
    }
  }

  // Try index files in directory
  for (const indexFile of INDEX_FILES) {
    const candidate = path.join(absoluteTarget, indexFile);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { resolvedFile: normalizePath(candidate), isIndex: true };
    }
  }

  return null;
}

function ensureTrailingSlash(p: string): string {
  return p.endsWith('/') ? p : p + '/';
}

export function resolveImportToAlias(
  specifier: string,
  importingFile: string,
  aliases: AliasMapping[],
): string | null {
  const importingDir = path.dirname(importingFile);
  const absoluteTarget = path.resolve(importingDir, specifier);
  const resolved = resolveFile(absoluteTarget);

  if (!resolved) return null;

  // The specifier path (without extension, pointing to dir for index files)
  const specifierPath = resolved.isIndex
    ? normalizePath(absoluteTarget)
    : normalizePath(absoluteTarget);

  for (const { alias, targets } of aliases) {
    for (const target of targets) {
      const normalizedTarget = ensureTrailingSlash(target);
      const normalizedSpec = normalizePath(specifierPath);

      // Exact match: specifier points exactly to the alias target directory
      if (normalizedSpec === target || normalizedSpec + '/' === normalizedTarget) {
        // Alias points to a directory, import is that directory
        const cleanAlias = alias.endsWith('/') ? alias.slice(0, -1) : alias;
        return cleanAlias;
      }

      // Prefix match: specifier is inside the alias target directory
      if (normalizedSpec.startsWith(normalizedTarget)) {
        const remainder = normalizedSpec.slice(normalizedTarget.length);
        const aliasImport = alias + remainder;
        return aliasImport;
      }
    }
  }

  return null;
}

export function resolveAliasToRelative(
  specifier: string,
  importingFile: string,
  aliases: AliasMapping[],
): string | null {
  // Find which alias matches this specifier
  // Try longest alias first (already sorted by specificity)
  for (const { alias, targets } of aliases) {
    const cleanAlias = alias.endsWith('/') ? alias.slice(0, -1) : alias;

    // Exact alias match: e.g. specifier "@types" matches alias "@types/"
    if (specifier === cleanAlias) {
      for (const target of targets) {
        const resolved = resolveFile(target);
        if (resolved) {
          return buildRelativePath(importingFile, target);
        }
      }
      continue;
    }

    // Prefix match: specifier starts with the alias
    if (!specifier.startsWith(alias)) continue;

    const remainder = specifier.slice(alias.length);

    for (const target of targets) {
      const absoluteTarget = target + '/' + remainder;
      const resolved = resolveFile(absoluteTarget);
      if (!resolved) continue;

      return buildRelativePath(importingFile, absoluteTarget);
    }
  }

  return null;
}

function buildRelativePath(fromFile: string, toAbsolute: string): string {
  const fromDir = normalizePath(path.dirname(fromFile));
  const to = normalizePath(toAbsolute);

  let relative = normalizePath(path.relative(fromDir, to));

  // Ensure it starts with ./ or ../
  if (!relative.startsWith('.')) {
    relative = './' + relative;
  }

  return relative;
}
