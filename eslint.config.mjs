import { config as baseConfig } from '@repo/eslint-config/base';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveProject = (relativePath) => resolve(__dirname, relativePath);

export default [
  ...baseConfig,
  {
    files: ['apps/mcp/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [resolveProject('apps/mcp/tsconfig.json')],
        tsconfigRootDir: resolveProject('apps/mcp'),
      },
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [resolveProject('apps/web/tsconfig.json')],
        tsconfigRootDir: resolveProject('apps/web'),
      },
    },
  },
  {
    files: ['packages/client/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [resolveProject('packages/client/tsconfig.json')],
        tsconfigRootDir: resolveProject('packages/client'),
      },
    },
  },
  {
    files: ['packages/mcp-server/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [resolveProject('packages/mcp-server/tsconfig.json')],
        tsconfigRootDir: resolveProject('packages/mcp-server'),
      },
    },
  },
  {
    ignores: ['**/dist/**', 'apps/web/.next/**', 'apps/web/out/**'],
  },
];
