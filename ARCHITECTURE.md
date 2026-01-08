# 🏗️ HireAI Architecture Reference

## System Overview

HireAI is a modular, extensible job application automation platform. This document provides a technical deep-dive into the system architecture for contributors and integrators.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [System Architecture](#system-architecture)
3. [Core Modules](#core-modules)
4. [Data Flow](#data-flow)
5. [Extension Points](#extension-points)
6. [Technology Decisions](#technology-decisions)
7. [Security Model](#security-model)
8. [Scalability Considerations](#scalability-considerations)

---

## Design Philosophy

### Principles

1. **Modularity First**: Each component is independent and replaceable
2. **Provider Agnostic**: LLM providers, job platforms, and databases are abstracted
3. **Fail Gracefully**: Automation failures don't crash the system
4. **Privacy by Design**: Credentials are never stored, only used in-memory
5. **Transparency**: Full audit trail of all automation actions

### Architecture Style

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLEAN ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    PRESENTATION LAYER                         │  │
│   │  Controllers → DTOs → Validation → Response Formatting       │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                    APPLICATION LAYER                          │  │
│   │  Services → Use Cases → Business Logic → State Machines      │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                      DOMAIN LAYER                             │  │
│   │  Entities → Value Objects → Domain Events → Repositories     │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                 │                                    │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                   INFRASTRUCTURE LAYER                        │  │
│   │  Database → External APIs → File System → Message Queues     │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Architecture

### High-Level Overview

```
                              ┌─────────────────┐
                              │   Load Balancer │
                              │    (Optional)   │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
             ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
             │   API Node  │    │   API Node  │    │   API Node  │
             │   (NestJS)  │    │   (NestJS)  │    │   (NestJS)  │
             └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
  ┌──────▼──────┐               ┌──────▼──────┐               ┌──────▼──────┐
  │  PostgreSQL │               │    Redis    │               │  Worker     │
  │  + pgvector │               │   (Cache)   │               │  (Jobs)     │
  └─────────────┘               └─────────────┘               └─────────────┘
                                                                     │
                                                    ┌────────────────┼────────────────┐
                                                    │                │                │
                                             ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
                                             │  Playwright │  │   Skyvern   │  │  JobSpy     │
                                             │  (Browser)  │  │  (AI Auto)  │  │  (Scraper)  │
                                             └─────────────┘  └─────────────┘  └─────────────┘
```

### Component Interaction

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              REQUEST FLOW                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  User Request                                                                 │
│       │                                                                       │
│       ▼                                                                       │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                   │
│  │ Controller  │ ───▶ │   Service   │ ───▶ │ Repository  │                   │
│  │  (Validate) │      │  (Logic)    │      │   (Data)    │                   │
│  └─────────────┘      └──────┬──────┘      └─────────────┘                   │
│                              │                                                │
│         ┌────────────────────┼────────────────────┐                          │
│         │                    │                    │                          │
│         ▼                    ▼                    ▼                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                   │
│  │ LlmService  │      │ Automation  │      │ AuditLog    │                   │
│  │ (AI/ML)     │      │ (Browser)   │      │ (Tracking)  │                   │
│  └─────────────┘      └─────────────┘      └─────────────┘                   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. Users Module (`/users`)

**Responsibility**: User identity and profile management

```typescript
interface UserModule {
  // Entities
  User: {
    id: UUID,
    email: string,
    fullname: string,
    masterResumeText: string,
    skills: string[],
    profileVector: number[1536],  // Embedding for matching
    resumeFileUrl?: string,
    phone?: string
  }
  
  // Services
  UsersService: {
    createUser(data): User,
    updateResume(userId, resume): User,
    findOne(id): User?,
    findByEmail(email): User?
  }
  
  // External Dependencies
  ResumeParserService: {
    parseResume(file): ParsedResume,  // PDF, DOCX, TXT
    extractSkills(text): string[]
  }
}
```

### 2. Jobs Module (`/jobs`)

**Responsibility**: Job listing storage and matching

```typescript
interface JobsModule {
  // Entities
  JobListing: {
    id: UUID,
    platform: 'internshala' | 'linkedin' | 'indeed' | 'glassdoor',
    externalId: string,  // Platform's ID
    title: string,
    company: string,
    description: string,
    requirements: string[],  // Extracted by LLM
    url: string,
    location?: string,
    descriptionVector: number[1536]  // For similarity matching
  }
  
  // Services
  JobsService: {
    saveScrapedJob(platform, job): JobListing,
    getFeedForUser(userId): RankedJob[],
    findOne(id): JobListing?
  }
  
  MatchingService: {
    computeMatchScore(userId, jobId): number,  // 0.0 - 1.0
    ensureUserProfileVector(userId): void,
    ensureJobDescriptionVector(jobId): void
  }
}
```

### 3. Scrapers Module (`/scrapers`)

**Responsibility**: Job platform integration and scraping

```typescript
interface ScrapersModule {
  // Scrapers (Strategy Pattern)
  IScraper: {
    scrapeJobs(maxJobs, options?): ScrapedJob[]
  }
  
  // Implementations
  InternshalaScraperV2: IScraper  // Playwright-based
  LinkedInScraper: IScraper        // Playwright-based
  // Future: JobSpyScraper (Python integration)
  
  // Orchestration
  ScrapersService: {
    scrapeForUser(userId, options): ScrapeResult,
    scrapeAllJobs(): ScrapeResult,
    clearOldJobs(): number,
    getStats(): ScrapingStats
  }
}
```

### 4. Applications Module (`/applications`)

**Responsibility**: Application workflow and state management

```typescript
interface ApplicationsModule {
  // Entities
  Application: {
    id: UUID,
    userId: UUID,
    jobId: UUID,
    status: ApplicationStatus,
    tailoredResume?: string,
    tailoredResumeUrl?: string,
    previewScreenshotUrl?: string,
    failureReason?: string,
    retryCount: number,
    timestamps: {
      createdAt, updatedAt, approvedAt?, submittedAt?
    }
  }
  
  ApplicationLog: {
    id: UUID,
    applicationId: UUID,
    event: string,
    message: string,
    metadata: object,
    timestamp: Date
  }
  
  // State Machine
  ApplicationStatus: 
    'Drafting' | 'NeedsApproval' | 'Submitted' | 'Failed'
  
  // Services
  ApplicationsService: {
    createApplication(userId, jobId, credentials?): Application,
    approveApplication(id, userId): Application,
    rejectApplication(id, userId, reason?): Application,
    retryApplication(id, credentials?): Application,
    getApplicationLogs(id): ApplicationLog[]
  }
}
```

### 5. Services Module (`/services`)

**Responsibility**: Core business capabilities

```typescript
interface ServicesModule {
  // AI/ML
  LlmService: {
    provider: 'gemini' | 'openai',
    generateEmbedding(text): number[],
    tailorResume(resume, job, requirements): string,
    extractRequirements(jobDescription): string[],
    answerApplicationQuestions(questions, profile, resume): Record<string, string>
  }
  
  // Automation
  SimpleAutomationService: {
    applyToInternshala(url, credentials, profile, resume): AutomationResult
    // Future: applyToLinkedIn(), applyToIndeed(), etc.
  }
  
  // Observability
  AuditLogService: {
    log(applicationId, event, message, metadata): void,
    getLogsForApplication(applicationId): ApplicationLog[],
    sanitizePII(data): object  // Remove sensitive data
  }
  
  // Resume Processing
  ResumeParserService: {
    parseResume(file): ParsedResume,
    saveResumeFile(userId, file): string
  }
}
```

---

## Data Flow

### Job Application Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────────┘

User: Swipe Right on Job
         │
         ▼
┌─────────────────┐
│  createApplication()                                                 │
│  ─────────────────                                                  │
│  1. Validate user & job exist                                       │
│  2. Check for duplicate application                                 │
│  3. Create Application (status: Drafting)                           │
│  4. Log: 'created'                                                  │
│  5. Start background processing ─────────────────────────┐          │
└─────────────────┬─────────────────────────────────────────┘          │
                  │                                                    │
                  ▼ (Sync Response)                                    │
         { id, status: 'Drafting' }                                   │
                                                                       │
┌──────────────────────────────────────────────────────────────────────┤
│  BACKGROUND PROCESSING                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Tailor Resume                                                   │
│     ├─ LlmService.tailorResume(masterResume, jobDescription)        │
│     ├─ Save to /resumes/tailored_{appId}.pdf                        │
│     └─ Log: 'resume_tailored'                                       │
│                                                                      │
│  2. Check Credentials                                                │
│     ├─ If provided → Continue to automation                         │
│     └─ If missing → Set status: 'NeedsApproval', STOP               │
│                                                                      │
│  3. Run Automation                                                   │
│     ├─ SimpleAutomationService.applyToInternshala(...)              │
│     ├─ Login → Navigate → Fill Form → Submit                        │
│     ├─ Capture screenshot                                            │
│     └─ Log: 'automation_complete' or 'automation_failed'            │
│                                                                      │
│  4. Update Status                                                    │
│     ├─ Success → 'Submitted'                                         │
│     └─ Failure → 'Failed' (with reason)                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Matching Algorithm Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JOB MATCHING PIPELINE                             │
└─────────────────────────────────────────────────────────────────────┘

GET /api/feed?userId={userId}
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. VECTOR PREPARATION                                               │
│     ├─ Ensure user has profileVector (generate if missing)          │
│     └─ Ensure all jobs have descriptionVector                        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. SIMILARITY COMPUTATION                                           │
│     For each job:                                                    │
│     ├─ vectorScore = cosine_similarity(userVector, jobVector)       │
│     ├─ keywordScore = matched_skills / required_skills              │
│     └─ finalScore = (vectorScore × 0.6) + (keywordScore × 0.4)     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. RANKING & RESPONSE                                               │
│     ├─ Sort by finalScore (descending)                              │
│     ├─ Convert to percentage (0-100)                                │
│     └─ Return top jobs with metadata                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Extension Points

### Adding a New Job Platform

```typescript
// 1. Create scraper implementing IScraper
@Injectable()
export class IndeedScraper {
  async scrapeJobs(maxJobs: number, options?: ScrapeOptions): Promise<ScrapedJob[]> {
    // Platform-specific implementation
  }
}

// 2. Register in ScrapersModule
@Module({
  providers: [IndeedScraper, ...],
})
export class ScrapersModule {}

// 3. Add to ScrapersService
async scrapeAllJobs() {
  const indeedJobs = await this.indeedScraper.scrapeJobs(100);
  // ...
}
```

### Adding a New LLM Provider

```typescript
// 1. Add provider detection in LlmService constructor
if (this.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
  this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// 2. Add to each method
async generateEmbedding(text: string): Promise<number[]> {
  if (this.provider === 'anthropic' && this.anthropic) {
    // Anthropic embedding implementation
  }
  // ...existing providers...
}
```

### Adding New Automation Target

```typescript
// 1. Add method to SimpleAutomationService
async applyToIndeed(
  jobUrl: string,
  credentials: Credentials,
  userProfile: UserProfile,
  resumeText: string
): Promise<AutomationResult> {
  // Indeed-specific selectors and flow
}

// 2. Add platform detection in ApplicationsService
if (job.platform === 'indeed') {
  result = await this.simpleAutomation.applyToIndeed(...);
}
```

---

## Technology Decisions

### Why NestJS?

| Consideration | Decision |
|---------------|----------|
| Modularity | Built-in module system matches our architecture |
| TypeScript | First-class support, better maintainability |
| Dependency Injection | Clean separation of concerns |
| Decorators | Declarative controller/service definitions |
| Ecosystem | Rich plugin ecosystem (@nestjs/*) |

### Why Playwright over Selenium/Puppeteer?

| Feature | Playwright | Selenium | Puppeteer |
|---------|------------|----------|-----------|
| Multi-browser | ✅ Chrome, Firefox, Safari | ✅ All | ❌ Chrome only |
| Auto-wait | ✅ Built-in | ❌ Manual | ⚠️ Partial |
| Speed | 🚀 Fast | 🐢 Slow | 🚀 Fast |
| Maintenance | Active | Active | Active |
| API Design | Modern, async/await | Legacy | Modern |

### Why pgvector?

- **Native PostgreSQL**: No additional infrastructure
- **HNSW Index**: Fast approximate nearest neighbor search
- **Exact Search**: Falls back to exact cosine similarity for small datasets
- **Integration**: Works with TypeORM seamlessly

---

## Security Model

### Credential Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CREDENTIAL LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User provides credentials via API                                   │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────┐                                                │
│  │ IN-MEMORY ONLY  │  ← Credentials NEVER written to database       │
│  │ (request scope) │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │ Passed to       │  ← Direct parameter passing                    │
│  │ Automation      │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │ Used in Browser │  ← Typed into forms, then discarded            │
│  │ Session Only    │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │ GARBAGE         │  ← No persistence anywhere                     │
│  │ COLLECTED       │                                                │
│  └─────────────────┘                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Audit Log Sanitization

```typescript
// AuditLogService automatically sanitizes:
const sensitiveFields = [
  'password',
  'apiKey', 
  'api_key',
  'secret',
  'token',
  'authorization',
  'credential'
];

// Before logging, replaces values with '[REDACTED]'
```

---

## Scalability Considerations

### Current Architecture (Single Node)

```
┌─────────────────────────────────────────────────────┐
│                 SINGLE NODE                          │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐               │
│  │   REST API   │───│   Workers    │               │
│  │   (sync)     │   │   (async)    │               │
│  └──────────────┘   └──────────────┘               │
│         │                  │                        │
│         └────────┬─────────┘                        │
│                  │                                  │
│           ┌──────▼──────┐                          │
│           │  PostgreSQL │                          │
│           └─────────────┘                          │
│                                                      │
└─────────────────────────────────────────────────────┘

Capacity: ~100 concurrent users, ~1000 jobs/day
```

### Scaled Architecture (Multi-Node)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION SCALE                                │
│                                                                      │
│  ┌──────────────┐                                                   │
│  │ Load Balancer│                                                   │
│  │   (nginx)    │                                                   │
│  └──────┬───────┘                                                   │
│         │                                                            │
│  ┌──────▼───────────────────┐                                       │
│  │  API Cluster (3+ nodes)  │                                       │
│  │  - Stateless REST API    │                                       │
│  │  - Horizontal scaling    │                                       │
│  └──────────────┬───────────┘                                       │
│                 │                                                    │
│     ┌───────────┼───────────┐                                       │
│     │           │           │                                       │
│  ┌──▼──┐    ┌───▼───┐   ┌───▼──────┐                               │
│  │Redis│    │PG Pool│   │Bull Queue│                               │
│  │Cache│    │Primary│   │(Jobs)    │                               │
│  └─────┘    │+Replc │   └────┬─────┘                               │
│             └───────┘        │                                       │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │              Worker Cluster (Autoscaling)                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │  │
│  │  │Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker N │              │  │
│  │  │Playwright│ │Playwright│ │Playwright│ │Playwright│           │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Capacity: ~10,000 concurrent users, ~100,000 jobs/day
```

### Scaling Strategies

| Component | Strategy |
|-----------|----------|
| API | Horizontal scaling behind load balancer |
| Database | Read replicas, connection pooling (PgBouncer) |
| Automation | Worker pool with job queue (Bull + Redis) |
| Embeddings | Cache in Redis, batch processing |
| Scraping | Rate-limited queue with backoff |

---

## Appendix: Directory Structure

```
hire/
├── .github/                    # GitHub workflows, issue templates
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── backend/
│   ├── src/
│   │   ├── applications/       # Application management
│   │   │   ├── entities/
│   │   │   ├── applications.controller.ts
│   │   │   ├── applications.service.ts
│   │   │   └── applications.module.ts
│   │   │
│   │   ├── jobs/               # Job listings
│   │   │   ├── entities/
│   │   │   ├── jobs.controller.ts
│   │   │   ├── jobs.service.ts
│   │   │   └── jobs.module.ts
│   │   │
│   │   ├── scrapers/           # Platform scrapers
│   │   │   ├── internshala-v2.scraper.ts
│   │   │   ├── linkedin.scraper.ts
│   │   │   ├── scrapers.service.ts
│   │   │   └── scrapers.module.ts
│   │   │
│   │   ├── services/           # Core services
│   │   │   ├── llm.service.ts
│   │   │   ├── simple-automation.service.ts
│   │   │   ├── resume-parser.service.ts
│   │   │   ├── matching.service.ts
│   │   │   └── audit-log.service.ts
│   │   │
│   │   ├── users/              # User management
│   │   │   ├── entities/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── config/             # Configuration
│   │   │   └── config.service.ts
│   │   │
│   │   ├── app.module.ts       # Root module
│   │   └── main.ts             # Entry point
│   │
│   ├── test/                   # Test files
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                # API client
│   │   ├── pages/              # React pages
│   │   ├── components/         # Reusable components
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                       # Extended documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
│
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production
├── README.md                   # Project overview
├── ARCHITECTURE.md             # This file
├── CONTRIBUTING.md             # Contribution guide
├── LICENSE                     # MIT License
└── env.example                 # Environment template
```

---

*This architecture document is maintained by the HireAI Core Team. For questions, open an issue or discussion on GitHub.*
