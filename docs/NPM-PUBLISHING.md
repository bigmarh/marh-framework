# NPM Publishing Guide for MARH Framework

This guide covers how to publish the MARH framework packages to NPM and manage releases.

## Prerequisites

1. **NPM Account**: Ensure you have an NPM account with publishing permissions
2. **Authentication**: Login to NPM CLI: `npm login`
3. **Organization**: Create `@marh` organization on NPM (or update package names)
4. **Repository**: Update GitHub URLs in package.json files

## Package Structure

The MARH framework uses a monorepo structure with the following publishable packages:

- `@marh/core` - Core framework functionality
- `create-marh-app` - CLI tool for scaffolding applications

## Release Process

### 1. Prepare for Release

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test
pnpm test:e2e

# Build all packages
pnpm build

# Lint and type-check
pnpm lint
pnpm type-check
```

### 2. Version Management with Changesets

We use Changesets for version management and changelog generation:

```bash
# Add a changeset (describe your changes)
pnpm changeset

# Version packages (updates package.json versions and generates CHANGELOG.md)
pnpm version-packages

# Review the generated changelogs and version bumps
git diff
```

### 3. Manual Publishing

```bash
# Build packages
pnpm build

# Publish to NPM
pnpm release
```

This will:
- Build all packages
- Publish them to NPM with proper access settings
- Push git tags

### 4. Automated Publishing (Recommended)

Set up GitHub Actions for automated publishing:

1. **Add NPM Token to GitHub Secrets:**
   - Go to your repository settings → Secrets and variables → Actions
   - Add `NPM_TOKEN` with your NPM automation token

2. **Create Release PR:**
   ```bash
   # After adding changesets
   pnpm changeset
   git add .changeset/
   git commit -m "Add changeset for feature X"
   git push
   ```

3. **The CI will:**
   - Create a "Release" PR when changesets are detected
   - Automatically publish when the Release PR is merged

## Package Configuration

### @marh/core

```json
{
  "name": "@marh/core",
  "version": "1.0.0",
  "description": "Core functionality for MARH framework",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  }
}
```

### create-marh-app

```json
{
  "name": "create-marh-app",
  "version": "1.0.0",
  "description": "Create MARH applications with zero configuration",
  "bin": {
    "create-marh-app": "./index.js"
  },
  "files": ["index.js", "templates"],
  "publishConfig": {
    "access": "public"
  }
}
```

## Usage After Publishing

Once published, users can:

### Install the CLI globally:
```bash
npm install -g create-marh-app
```

### Create new applications:
```bash
create-marh-app my-app
# or
npx create-marh-app my-app
```

### Use the core package:
```bash
npm install @marh/core
```

## Version Strategy

We follow Semantic Versioning (SemVer):

- **Major (1.0.0)**: Breaking changes
- **Minor (1.1.0)**: New features, backward compatible
- **Patch (1.0.1)**: Bug fixes, backward compatible

### Changeset Types:

```bash
# Major version bump
pnpm changeset
# Select "major" for breaking changes

# Minor version bump  
pnpm changeset
# Select "minor" for new features

# Patch version bump
pnpm changeset
# Select "patch" for bug fixes
```

## Publishing Checklist

Before publishing a new version:

- [ ] All tests pass (`pnpm test`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Documentation is updated
- [ ] CHANGELOG is generated
- [ ] Version numbers are correct
- [ ] Git tags are created
- [ ] GitHub release is created

## Troubleshooting

### Common Issues:

1. **403 Forbidden when publishing:**
   - Check NPM authentication: `npm whoami`
   - Verify organization permissions
   - Ensure package name isn't taken

2. **Build failures:**
   - Clean node_modules and reinstall
   - Check TypeScript configuration
   - Verify all dependencies are installed

3. **Version conflicts:**
   - Use `pnpm changeset version` to update versions
   - Check for uncommitted changes
   - Resolve merge conflicts in package.json files

### Recovery Commands:

```bash
# Clean everything and start fresh
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Force rebuild
pnpm build --force

# Check what will be published
npm pack --dry-run
```

## NPM Scripts Reference

Available scripts in the root package.json:

```bash
pnpm build              # Build all packages
pnpm dev                # Development mode
pnpm test               # Run tests
pnpm test:coverage      # Run tests with coverage
pnpm test:e2e          # Run end-to-end tests
pnpm lint              # Lint all packages
pnpm type-check        # TypeScript type checking
pnpm changeset         # Add changeset
pnpm version-packages  # Update versions
pnpm release           # Build and publish
```

## Security

- Never commit NPM tokens to git
- Use NPM automation tokens for CI/CD
- Enable 2FA on your NPM account
- Regularly audit dependencies: `npm audit`
- Use `npm pack` to preview what will be published

## Support

If you encounter issues with publishing:

1. Check the [NPM documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
2. Review [Changesets documentation](https://github.com/changesets/changesets)
3. Open an issue in the MARH framework repository

The publishing process is designed to be simple and automated while maintaining high quality standards through comprehensive testing and validation.