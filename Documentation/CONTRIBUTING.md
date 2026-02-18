# Contributing Guidelines

## Standards
- **Code Style**: formatting via Prettier, linting via ESLint.
- **TypeScript**: Strict mode enabled. No `any` types allowed.
- **Commits**: Conventional Commits format (feat, fix, docs, style, refactor).

## Workflow
1. Create feature branch from `main`.
2. Implement changes.
3. Verify with `npm run type-check` and `npm run lint`.
4. Submit Pull Request.

## Restrictions
- Do not modify `.gitignore` or `.env` handling without approval.
- Do not introduce new dependencies without justification.
