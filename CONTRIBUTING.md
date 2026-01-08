# Contributing to HireAI

First off, thank you for considering contributing to HireAI! 🎉

This document provides guidelines and steps for contributing. Following these guidelines helps maintain code quality and makes the review process smoother.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a friendly, safe, and welcoming environment for all contributors. We expect everyone to:

- **Be respectful** of differing viewpoints and experiences
- **Be constructive** in feedback and criticism
- **Focus on what's best** for the community and project
- **Show empathy** towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

Report issues to: [maintainer email] or open a confidential issue.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **Docker Desktop** for running PostgreSQL
- **Git** configured with your GitHub account
- A **Gemini API key** (free at https://aistudio.google.com/apikey)

### Understanding the Project

1. Read the [README.md](./README.md) for project overview
2. Read the [ARCHITECTURE.md](./ARCHITECTURE.md) for technical deep-dive
3. Browse open [Issues](https://github.com/JAYATIAHUJA/HIRE/issues) to understand current priorities

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/HIRE.git
cd HIRE

# Add upstream remote
git remote add upstream https://github.com/JAYATIAHUJA/HIRE.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment

```bash
# Copy example env
cp env.example backend/.env

# Edit backend/.env with your values:
# - GEMINI_API_KEY (required)
# - Database URL (default works with Docker)
```

### 4. Start Development Environment

```bash
# Terminal 1: Start database
docker-compose up -d

# Terminal 2: Start backend
cd backend && npm run start:dev

# Terminal 3: Start frontend (optional)
cd frontend && npm run dev
```

### 5. Verify Setup

```bash
# Test API
curl http://localhost:3000/api/scrapers/stats

# Expected: {"message":"Job statistics","total":0,...}
```

---

## How to Contribute

### 🐛 Reporting Bugs

Before reporting:
1. Search existing issues to avoid duplicates
2. Test on latest `main` branch

When reporting:
```markdown
### Bug Description
[Clear description of the bug]

### Steps to Reproduce
1. Step one
2. Step two
3. ...

### Expected Behavior
[What you expected]

### Actual Behavior
[What actually happened]

### Environment
- OS: [e.g., Windows 11]
- Node.js: [e.g., 18.17.0]
- Browser: [if frontend-related]

### Screenshots/Logs
[Attach if applicable]
```

### 💡 Suggesting Features

Open a [Feature Request](https://github.com/JAYATIAHUJA/HIRE/issues/new?template=feature_request.md):

```markdown
### Feature Description
[What feature do you want?]

### Problem It Solves
[Why is this needed?]

### Proposed Solution
[How should it work?]

### Alternatives Considered
[Other approaches you thought of]
```

### 📝 Improving Documentation

Documentation improvements are always welcome:
- Fix typos
- Clarify confusing sections
- Add examples
- Translate to other languages

### 🔧 Submitting Code

#### Good First Issues

Look for issues labeled:
- `good first issue` - Simple, well-defined tasks
- `help wanted` - Community help needed
- `documentation` - Docs improvements

#### Types of Contributions

| Type | Description | Label |
|------|-------------|-------|
| Bug Fix | Fix a reported bug | `bug` |
| Feature | New functionality | `enhancement` |
| Refactor | Code improvement without behavior change | `refactor` |
| Test | Add or improve tests | `testing` |
| Docs | Documentation updates | `documentation` |
| Scraper | New job platform support | `scraper` |

---

## Pull Request Process

### 1. Create a Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/indeed-scraper` |
| Bug Fix | `fix/description` | `fix/login-timeout` |
| Docs | `docs/description` | `docs/api-examples` |
| Refactor | `refactor/description` | `refactor/llm-service` |

### 2. Make Changes

- Write clean, readable code
- Follow [Coding Standards](#coding-standards)
- Add tests for new functionality
- Update documentation if needed

### 3. Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description

# Examples:
git commit -m "feat(scrapers): add Indeed job scraper"
git commit -m "fix(automation): handle login timeout"
git commit -m "docs(readme): add API examples"
git commit -m "test(matching): add unit tests for scoring"
git commit -m "refactor(llm): extract provider interface"
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:

```markdown
## Description
[What does this PR do?]

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactor
- [ ] Other: ___

## Testing
- [ ] I have tested this locally
- [ ] I have added tests for new functionality
- [ ] All existing tests pass

## Screenshots
[If applicable]

## Checklist
- [ ] My code follows the project style
- [ ] I have updated documentation
- [ ] I have added appropriate comments
```

### 5. Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Maintainer Review**: Code review within 48 hours
3. **Feedback**: Address any requested changes
4. **Merge**: Squash and merge after approval

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good: Clear types, descriptive names
interface UserProfile {
  name: string;
  email: string;
  skills: string[];
}

async function createApplication(
  userId: string,
  jobId: string,
  credentials?: Credentials
): Promise<Application> {
  // Implementation
}

// ❌ Bad: Any types, cryptic names
function create(u: any, j: any): any {
  // Implementation
}
```

### File Organization

```typescript
// 1. Imports (grouped: external, internal)
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { LlmService } from '../services/llm.service';

// 2. Interface/Type definitions
export interface CreateUserDto {
  name: string;
  email: string;
}

// 3. Class definition
@Injectable()
export class UsersService {
  // 4. Class members (private first)
  private readonly logger = new Logger(UsersService.name);

  // 5. Constructor
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 6. Public methods
  async createUser(dto: CreateUserDto): Promise<User> {
    // Implementation
  }

  // 7. Private methods
  private validateEmail(email: string): boolean {
    // Implementation
  }
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `user-profile.service.ts` |
| Classes | PascalCase | `UserProfileService` |
| Methods | camelCase | `getUserProfile` |
| Variables | camelCase | `userProfile` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Interfaces | PascalCase (I- prefix optional) | `UserProfile` |

### Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Retry with exponential backoff to handle rate limits
await this.withRetry(() => this.llm.generate(prompt), 3, 2000);

// ❌ Bad: States the obvious
// Loop through users
for (const user of users) {
```

---

## Testing Guidelines

### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test file
npm test -- --testPathPattern=users.service
```

### Writing Tests

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const dto = { name: 'Test', email: 'test@example.com', resume: '...' };
      const result = await service.createUser(dto);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(dto.email);
    });

    it('should throw on duplicate email', async () => {
      // Test implementation
    });
  });
});
```

### Test Coverage Requirements

| Type | Minimum Coverage |
|------|------------------|
| Services | 80% |
| Controllers | 70% |
| Utilities | 90% |

---

## Community

### Getting Help

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Discord** (coming soon): Real-time chat

### Recognition

Contributors are recognized in:
- README.md Contributors section
- Release notes
- Annual contributor spotlight

### Maintainers

| Name | Role | GitHub |
|------|------|--------|
| Jayati Ahuja | Lead Maintainer | [@JAYATIAHUJA](https://github.com/JAYATIAHUJA) |

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to HireAI!** 🚀
