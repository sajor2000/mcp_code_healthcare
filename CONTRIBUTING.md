# Contributing to Healthcare Research MCP Server

Thank you for your interest in contributing to the Healthcare Research MCP Server! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/healthcare-research-mcp.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit: `git commit -m "Add your descriptive commit message"`
7. Push: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure your API keys:
   ```bash
   cp .env.example .env
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Write descriptive variable names

## Adding New Features

### Adding a New MCP Tool

1. Create a new tool file in `src/tools/research/` or `src/tools/ontology/`
2. Implement the Tool interface from MCP SDK
3. Register the tool in `src/server/index.ts`
4. Add tests in `tests/`
5. Update documentation

Example tool structure:
```typescript
export class YourNewTool implements Tool {
  name = 'your_tool_name';
  description = 'Clear description of what the tool does';
  
  inputSchema = {
    // Define input parameters
  };
  
  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    // Implementation
  }
}
```

### Adding New Data Sources

1. Create a collection script in `scripts/collection/`
2. Use Firecrawl and Brave APIs for data collection
3. Add processing logic in `scripts/processing/`
4. Update the main collection orchestrator

## Testing

- Write tests for all new features
- Ensure existing tests pass
- Test with different data models (OMOP and CLIF)
- Validate SQL generation
- Check error handling

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API documentation for new tools
- Include examples for new features

## Pull Request Guidelines

1. **Title**: Use a clear, descriptive title
2. **Description**: Explain what changes you made and why
3. **Testing**: Describe how you tested your changes
4. **Screenshots**: Include screenshots for UI changes
5. **Breaking Changes**: Clearly mark any breaking changes

## Code Review Process

- All PRs require at least one review
- Address all feedback comments
- Keep PRs focused on a single feature/fix
- Ensure CI tests pass

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Error messages/logs

## Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Clearly describe the feature
- Explain the use case
- Provide examples if possible

## Questions?

- Open an issue for questions
- Tag with "question" label
- Be specific about what you need help with

Thank you for contributing!