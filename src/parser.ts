export interface ImportRecord {
  specifier: string;
  start: number;  // offset of the specifier string (without quotes)
  end: number;
  kind: 'import' | 'require' | 'dynamic-import' | 're-export';
}

function stripComments(code: string): string {
  let result = '';
  let i = 0;
  let inString: string | null = null;
  let inTemplate = false;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    // Handle string literals
    if (inString) {
      result += ch;
      if (ch === '\\') {
        result += next || '';
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }

    if (inTemplate) {
      result += ch;
      if (ch === '\\') {
        result += next || '';
        i += 2;
        continue;
      }
      if (ch === '`') {
        inTemplate = false;
      }
      i++;
      continue;
    }

    // Start of string
    if (ch === '"' || ch === "'") {
      inString = ch;
      result += ch;
      i++;
      continue;
    }

    if (ch === '`') {
      inTemplate = true;
      result += ch;
      i++;
      continue;
    }

    // Single-line comment
    if (ch === '/' && next === '/') {
      // Replace with spaces to preserve offsets
      while (i < code.length && code[i] !== '\n') {
        result += ' ';
        i++;
      }
      continue;
    }

    // Multi-line comment
    if (ch === '/' && next === '*') {
      result += '  ';
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        result += code[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < code.length) {
        result += '  ';
        i += 2;
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

export function parseImports(fileContent: string, mode: 'relative' | 'alias' = 'relative', aliasPrefixes: string[] = []): ImportRecord[] {
  const cleaned = stripComments(fileContent);
  const records: ImportRecord[] = [];

  function shouldInclude(specifier: string): boolean {
    if (mode === 'relative') {
      return specifier.startsWith('.');
    }
    // alias mode: include specifiers that match any alias prefix or exact alias
    return aliasPrefixes.some(prefix => {
      const clean = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      return specifier === clean || specifier.startsWith(prefix);
    });
  }

  // Static imports: import ... from '...'
  const importFromRegex = /import\s+(?:[\s\S]*?)\s+from\s+(['"])([^'"]+)\1/g;
  let match: RegExpExecArray | null;

  while ((match = importFromRegex.exec(cleaned)) !== null) {
    const specifier = match[2];
    if (!shouldInclude(specifier)) continue;
    const quoteChar = match[1];
    const fullMatchStart = match.index;
    const specStart = cleaned.indexOf(quoteChar + specifier + quoteChar, fullMatchStart);
    records.push({
      specifier,
      start: specStart + 1, // skip opening quote
      end: specStart + 1 + specifier.length,
      kind: 'import',
    });
  }

  // Side-effect imports: import './foo'
  const sideEffectRegex = /import\s+(['"])([^'"]+)\1/g;
  while ((match = sideEffectRegex.exec(cleaned)) !== null) {
    const specifier = match[2];
    if (!shouldInclude(specifier)) continue;
    // Avoid duplicates with importFromRegex
    const specStart = match.index + match[0].indexOf(match[1]);
    const record: ImportRecord = {
      specifier,
      start: specStart + 1,
      end: specStart + 1 + specifier.length,
      kind: 'import',
    };
    if (!records.some(r => r.start === record.start)) {
      records.push(record);
    }
  }

  // require('...')
  const requireRegex = /require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  while ((match = requireRegex.exec(cleaned)) !== null) {
    const specifier = match[2];
    if (!shouldInclude(specifier)) continue;
    const quoteStart = match.index + match[0].indexOf(match[1]);
    records.push({
      specifier,
      start: quoteStart + 1,
      end: quoteStart + 1 + specifier.length,
      kind: 'require',
    });
  }

  // Dynamic imports: import('...')
  const dynamicRegex = /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  while ((match = dynamicRegex.exec(cleaned)) !== null) {
    const specifier = match[2];
    if (!shouldInclude(specifier)) continue;
    const quoteStart = match.index + match[0].indexOf(match[1]);
    const record: ImportRecord = {
      specifier,
      start: quoteStart + 1,
      end: quoteStart + 1 + specifier.length,
      kind: 'dynamic-import',
    };
    if (!records.some(r => r.start === record.start)) {
      records.push(record);
    }
  }

  // Re-exports: export { ... } from '...' and export * from '...'
  const reExportRegex = /export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+(['"])([^'"]+)\1/g;
  while ((match = reExportRegex.exec(cleaned)) !== null) {
    const specifier = match[2];
    if (!shouldInclude(specifier)) continue;
    const quoteStart = match.index + match[0].lastIndexOf(match[1] + specifier);
    records.push({
      specifier,
      start: quoteStart + 1,
      end: quoteStart + 1 + specifier.length,
      kind: 're-export',
    });
  }

  return records;
}

export function getLineNumber(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}
