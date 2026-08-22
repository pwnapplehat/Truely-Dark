# Contributing to Truely Dark

Thank you for your interest in contributing to Truely Dark! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Truely-Dark.git`
3. Install dependencies: `pnpm install`
4. Start development: `pnpm dev`
5. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+ (or npm)

### Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server with HMR (Chrome)
pnpm build            # Production build for Chrome
pnpm build:firefox    # Production build for Firefox
pnpm test             # Run unit tests
pnpm typecheck        # TypeScript type checking
pnpm zip              # Create Chrome distribution zip
pnpm zip:firefox      # Create Firefox distribution zip
```

### Loading the Extension

**Chrome:** Load unpacked from `.output/chrome-mv3` (after `pnpm build`)

**Firefox:** Load temporary add-on from `.output/firefox-mv3` (after `pnpm build:firefox`)

## Code Style

- TypeScript strict mode — no `any` types
- Match existing patterns in the codebase
- Keep functions focused and under ~50 lines where practical
- No unnecessary comments — code should be self-explanatory
- Run `pnpm typecheck` and `pnpm test` before submitting

## Pull Request Process

1. Ensure tests pass: `pnpm test`
2. Ensure type checking passes: `pnpm typecheck`
3. Ensure builds succeed: `pnpm build && pnpm build:firefox`
4. Write a clear PR description explaining what changed and why
5. Link any related issues

## Architecture Overview

- `src/entrypoints/` — WXT entrypoints (background, content, popup, options)
- `src/lib/` — Core logic (detect, engine, settings, resolver)
- `src/components/` — Shared React UI components
- `tests/` — Vitest unit tests

## What We're Looking For

- Bug fixes with tests
- Performance improvements (especially flash prevention and detection speed)
- Site pack additions for popular sites
- Accessibility improvements
- Documentation improvements

## What We're NOT Looking For

- Vendoring Dark Reader or similar extensions
- Telemetry or analytics features
- Cloud sync or account systems
- Features outside the dark mode scope (ad blocking, paywall bypass, etc.)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
