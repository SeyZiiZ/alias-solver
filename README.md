# alias-solver

A CLI tool that automatically converts relative imports (`../../foo`) to alias-based imports (`@/foo`) — and back. It auto-detects your project's alias configuration from `tsconfig.json`, `vite.config`, or `webpack.config`.

## Features

- **Auto-detection** of alias config from tsconfig / vite / webpack
- **Converts** relative imports → alias imports
- **Reverts** alias imports → relative imports (`--revert`)
- **Dry-run** mode to preview changes before applying
- **Targets** a specific file or directory with `--path`
- Handles `import`, `require()`, dynamic `import()`, and `export ... from` statements
- Picks the **most specific alias** (e.g. `@ui/` over `@components/` over `@/`)
- Colorized terminal output showing every change
- Fully **idempotent** — running twice produces no extra changes

## Installation

```bash
npm install
npm run build
```

## Usage

```
alias-solver [options]

Options:
  -d, --dry-run     Preview changes without modifying files
  -r, --revert      Revert alias imports back to relative paths
  -p, --path <p>    Target a specific file or directory
  -h, --help        Show help
  -v, --version     Show version
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

### Target a specific file or folder

```bash
alias-solver --path src/pages
alias-solver --path src/components/ui/forms/LoginForm.tsx
```

### Combine flags

```bash
alias-solver --revert --dry-run --path src/pages
```

## Try it on the test project

A ready-made test project is included with 19 source files across 4 levels of nesting and 10 alias mappings.

### 1. Build the tool

```bash
cd d:/aliasSolver
npm install
npm run build
```

### 2. Preview what would change

```bash
cd d:/aliasSolver/test-project
node ../bin/alias-solver.js --dry-run
```

Expected output — 45 imports across 13 files will be listed, e.g.:

```
  src/pages/dashboard/widgets/charts/BarChart.tsx
    L4: ../../../../lib/api/endpoints/users  ->  @lib/api/endpoints/users
    L3: ../../../../utils/formatting/string  ->  @utils/formatting/string
    L2: ../../../../utils/formatting/date    ->  @utils/formatting/date
    L1: ../../../../types                    ->  @types
```

### 3. Apply the conversion

```bash
node ../bin/alias-solver.js
```

Now check any file to confirm:

```bash
cat src/pages/dashboard/Dashboard.tsx
```

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

### 4. Verify idempotence

Running again should find nothing left to convert:

```bash
node ../bin/alias-solver.js --dry-run
# => "No relative imports to convert. Everything looks clean!"
```

### 5. Revert everything back

```bash
node ../bin/alias-solver.js --revert
```

All 45 imports are restored to their original relative form. Verify:

```bash
node ../bin/alias-solver.js --revert --dry-run
# => "No alias imports to revert. Everything is already relative!"
```

### 6. Target a specific folder

```bash
node ../bin/alias-solver.js --path src/pages --dry-run
```

Only files inside `src/pages/` are scanned.

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

The tool checks for configs in this priority order: `tsconfig.json` > `vite.config.{ts,js}` > `webpack.config.{js,ts}`.

> **Warning:** Avoid naming an alias `@types/*` — it conflicts with npm's `@types` scope
> (used for DefinitelyTyped packages like `@types/node`). TypeScript will try to resolve
> `@types` as a node_modules package, not your alias. Use the catch-all `@/*` instead,
> which produces `@/types` and works without issues.

## Test project structure

```
test-project/
├── tsconfig.json                                    # 9 alias mappings
└── src/
    ├── types/index.ts                               # Shared types
    ├── hooks/useAuth.ts, useTheme.ts                # Custom hooks
    ├── utils/formatting/date.ts, string.ts          # Formatting utils
    ├── utils/constants/index.ts                     # App constants
    ├── services/auth/authService.ts                 # Auth service
    ├── services/notifications/notificationService.ts
    ├── lib/api/endpoints/users.ts                   # API layer
    ├── lib/api/interceptors/retry.ts
    ├── store/slices/userSlice.ts                    # State management
    ├── components/ui/buttons/Button.tsx              # UI components
    ├── components/ui/forms/LoginForm.tsx
    ├── components/ui/forms/validation/rules.ts       # 4 levels deep
    ├── components/layout/sidebar/Sidebar.tsx
    ├── components/layout/sidebar/items/NavItem.tsx   # 4 levels deep
    ├── pages/dashboard/Dashboard.tsx                 # Pages
    ├── pages/dashboard/widgets/charts/BarChart.tsx   # 4 levels deep
    └── pages/auth/login/LoginPage.tsx
```

Alias mappings configured in the test project:

| Alias | Target |
|-------|--------|
| `@/*` | `src/*` |
| `@components/*` | `src/components/*` |
| `@ui/*` | `src/components/ui/*` |
| `@pages/*` | `src/pages/*` |
| `@utils/*` | `src/utils/*` |
| `@hooks/*` | `src/hooks/*` |
| `@lib/*` | `src/lib/*` |
| `@services/*` | `src/services/*` |
| `@store/*` | `src/store/*` |

> Types are resolved via the catch-all `@/*` → `@/types` (no dedicated `@types` alias to avoid npm scope conflict).
