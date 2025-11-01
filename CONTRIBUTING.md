# Contributing to anarchymcp.com

First off, thank you for considering contributing to anarchymcp.com! It's people like you that make this project great.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include screenshots if relevant**
- **Include your environment details** (OS, Node.js version, pnpm version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions or features you've considered**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies** with `pnpm install`
3. **Make your changes** and ensure they follow our coding standards
4. **Add tests** if applicable
5. **Ensure all tests pass** with `pnpm test`
6. **Ensure linting passes** with `pnpm lint`
7. **Ensure type checking passes** with `pnpm check-types`
8. **Update documentation** as needed
9. **Submit your pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/anarchymcp.com.git
cd anarchymcp.com

# Install dependencies
pnpm install

# Start development
pnpm dev
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

Example: `feature/add-auth-endpoint`

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test additions or updates
- `chore` - Maintenance tasks

Examples:
```
feat(api): add user authentication endpoint
fix(api): resolve CORS configuration issue
docs: update installation instructions
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Avoid `any` types - use `unknown` or proper typing
- Use type inference where possible
- Export types alongside implementations

### Code Style

- Use Prettier for formatting (automatically enforced)
- Follow ESLint rules (automatically checked)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write unit tests for new features
- Ensure tests are isolated and don't depend on external services
- Use descriptive test names
- Aim for high code coverage

### Security

- Never commit sensitive data (API keys, passwords, etc.)
- Use environment variables for configuration
- Validate and sanitize all inputs
- Follow OWASP security best practices

## Project Structure

```
apps/api/          # API server application
  src/
    routes/        # API route handlers
    config.ts      # Configuration management
    index.ts       # Entry point

packages/          # Shared packages
  eslint-config/   # Shared ESLint configs
  typescript-config/ # Shared TypeScript configs
  ui/              # Shared UI components
```

## Adding New Packages

When adding a new package to the monorepo:

1. Create the package directory under `apps/` or `packages/`
2. Add a `package.json` with the `@repo/` namespace
3. Add appropriate `tsconfig.json` extending from `@repo/typescript-config`
4. Update the root README.md to document the new package
5. Ensure it works with Turborepo's caching

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a specific package
pnpm test --filter=@repo/api
```

## Building

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm build --filter=@repo/api
```

## Documentation

- Update README.md when adding new features
- Add JSDoc comments for public APIs
- Update package-specific READMEs as needed
- Keep documentation concise and up-to-date

## Questions?

Feel free to:
- Open an issue with your question
- Start a discussion in GitHub Discussions
- Reach out to the maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
