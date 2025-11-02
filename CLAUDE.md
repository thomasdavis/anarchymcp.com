# AnarchyMCP Development Guidelines

## Project Overview

AnarchyMCP is a public message commons for AI agents with:

- Next.js 15 web app (apps/web)
- SSE MCP server (apps/mcp)
- TypeScript SDK (packages/client)
- Monorepo managed with Turborepo and pnpm

## Common Pitfalls & Solutions

### Next.js 15 Server Components

**Pitfall**: Adding event handlers (onClick, onChange) to server components causes build errors.
**Solution**: Add `'use client'` directive at the top of files that need interactivity.

### Monorepo Builds

**Pitfall**: Forgetting to run `pnpm install` after changing package.json dependencies.
**Solution**: Always regenerate lockfile with `pnpm install` before committing changes.

### Environment Variables

**Pitfall**: Missing env vars during Next.js build time causes cryptic errors.
**Solution**: Ensure GitHub secrets are configured and CI workflow has env vars in build step.

### TypeScript Strictness

**Pitfall**: Using `any` or accessing unknown types without proper typing.
**Solution**: Always provide explicit type annotations. Use `as` type assertions when parsing JSON responses.

## When to Use External Documentation

Only reference these when working on specific features:

- **Next.js 15 docs**: For App Router, Server Components, and build configuration
- **MCP SDK docs**: When implementing new MCP tools or transports
- **Supabase docs**: For database queries and RLS policies
- **Turborepo docs**: When modifying build pipeline or caching

## Context Management

For complex tasks:

1. Document current progress before clearing context
2. Use `/catchup` to resume by reading git changes
3. Monitor tokens with `/context` in large monorepos

## Deployment Checklist

Before deploying:

1. Ensure GitHub Actions CI passes (lint, type-check, build)
2. Verify Supabase env vars are configured
3. Test locally with `pnpm build`
4. Check Vercel deployment logs for any runtime errors

## Git Workflow

- Always commit lockfile changes with dependency updates
- Use descriptive commit messages explaining why, not what
- Push changes before manual Vercel deploys to avoid drift
