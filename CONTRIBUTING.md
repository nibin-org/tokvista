# Contributing to Tokvista

Thank you for your interest in contributing! 🎉

## Development Setup

```bash
git clone https://github.com/nibin-org/tokvista.git
cd tokvista
source ~/.nvm/nvm.sh && nvm use 20
npm install
npm run dev
```

## Scripts

- `npm run build` - Build the package
- `npm run dev` - Build in watch mode
- `npm run typecheck` - Type checking
- `npm test` - Run tests

## CLI Smoke Test

```bash
npm run build
node dist/bin/tokvista.js ./tokens.json --no-open --port 4000
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run checks: `npm run typecheck && npm test && npm run build`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Code Style

- Use TypeScript
- Follow existing code patterns
- Add types for all new APIs
- Keep components focused and reusable

## Reporting Issues

Use GitHub Issues for:
- Bug reports
- Feature requests
- Documentation improvements

Please include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
