# alias-solver

A CLI tool that automatically converts relative imports (`../../foo`) to alias-based imports (`@/foo`) — and back. Works out of the box: auto-detects existing alias configs, or **generates them from your folder structure** if none exist.

## Features

- **Zero-config**: no aliases configured? The tool scans your `src/` folders and generates them for you
- **Auto-detection** of existing alias config from tsconfig / vite / webpack
- **Converts** relative imports → alias imports
- **Reverts** alias imports → relative imports (`--revert`)
- **Dry-run** mode to preview changes before applying
- **Targets** a specific file or directory with `--path`
- Handles `import`, `require()`, dynamic `import()`, and `export ... from` statements
- Picks the **most specific alias** (e.g. `@ui/` over `@components/` over `@/`)
- Colorized terminal output showing every change
- Fully **idempotent** — running twice produces no extra changes

## Quick start

No install needed — just run in your project:

```bash
npx alias-solver
```

That's it. If your project has no alias config, the tool will:

1. Scan your `src/` (or `app/`, `lib/`) directory
2. Generate aliases based on folder names (`@components/*`, `@utils/*`, etc.)
3. Write them to `tsconfig.json`
4. Convert all relative imports to alias imports

## Installation

```bash
# Use directly (no install)
npx alias-solver

# Or install globally
npm install -g alias-solver

# Or install locally in your project
npm install --save-dev alias-solver
```

## Usage

```
alias-solver [options]

Options:
  -d, --dry-run      Preview changes without modifying files
  -r, --revert       Revert alias imports back to relative paths
  -p, --path <p>     Target a specific file or directory
  -R, --recursive    With --path, include subdirectories (default: direct files only)
  -h, --help         Show help
  -v, --version      Show version
```

### Convert relative → alias

```bash
alias-solver
```

### Preview changes first

```bash
alias-solver --dry-run
```

### Revert alias → relative

```bash
alias-solver --revert
```

### Target a specific folder (direct files only)

```bash
alias-solver --path src/hooks
# Only processes files directly in src/hooks/ (useAuth.ts, useTheme.ts)
# Does NOT touch files in subdirectories
```

### Target a folder recursively

```bash
alias-solver --path src/components --recursive
# Processes all files in src/components/ AND all subdirectories
# (ui/buttons/Button.tsx, layout/sidebar/Sidebar.tsx, etc.)
```

### Target a single file

```bash
alias-solver --path src/pages/dashboard/Dashboard.tsx
```

### Combine flags

All flags work together. `--revert` respects `--path` and `--recursive`:

```bash
# Revert only direct files in src/hooks/
alias-solver --revert -p src/hooks

# Revert all files in src/components/ and subdirectories
alias-solver --revert -p src/components -R

# Preview a scoped revert without modifying anything
alias-solver --revert --dry-run -p src/components -R
```

## How it works

### With existing config

If your project already has aliases defined in `tsconfig.json`, `vite.config`, or `webpack.config`, the tool reads them and converts imports accordingly.

### Without config (auto-generation)

If no aliases are found, the tool scans your source directory and generates them automatically:

```
src/
├── components/    →  @components/*
├── hooks/         →  @hooks/*
├── lib/           →  @lib/*
├── pages/         →  @pages/*
├── services/      →  @services/*
├── store/         →  @store/*
├── types/         →  (via catch-all @/*)
└── utils/         →  @utils/*

Plus catch-all:      @/*  →  src/*
```

The generated aliases are written to `tsconfig.json` automatically, then imports are converted.

> **Note:** Folder names that conflict with npm scopes (like `types`) are skipped as dedicated aliases and handled by the catch-all `@/*` instead (e.g. `@/types`).

## Example

Before:
```typescript
import { Sidebar } from '../../components/layout/sidebar/Sidebar';
import { BarChart } from './widgets/charts/BarChart';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
```

After:
```typescript
import { Sidebar } from '@components/layout/sidebar/Sidebar';
import { BarChart } from '@pages/dashboard/widgets/charts/BarChart';
import { useAuth } from '@hooks/useAuth';
import { User } from '@/types';
```

## Supported alias configurations

### tsconfig.json (recommended)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

### vite.config.ts

```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
});
```

### webpack.config.js

```javascript
module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
};
```

Detection priority: `tsconfig.json` > `vite.config.{ts,js}` > `webpack.config.{js,ts}` > auto-generation from folders.

> **Warning:** Avoid naming an alias `@types/*` — it conflicts with npm's `@types` scope
> (used for DefinitelyTyped packages like `@types/node`). Use the catch-all `@/*` instead,
> which produces `@/types`.

## Man page

After installing globally, you can view the manual:

```bash
man alias-solver
```

## License

MIT
