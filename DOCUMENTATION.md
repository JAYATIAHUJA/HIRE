# HireAI - Technical Documentation

## 1. Project Vision & Objectives

### 1.1 The Problem Statement

Modern job seekers face several challenges:
1. **Volume**: Thousands of jobs posted daily across multiple platforms
2. **Repetition**: Similar forms filled repeatedly with minor variations
3. **Customization**: Each application needs tailored resume and cover letter
4. **Time**: Average of 30-45 minutes per application
5. **Tracking**: Difficulty managing dozens of applications

### 1.2 Our Solution

HireAI is an end-to-end job application automation engine that:
- **Aggregates** jobs from multiple platforms (Internshala, LinkedIn, Indeed)
- **Matches** jobs to user profile using AI-powered vector similarity
- **Tailors** resumes automatically for each position
- **Automates** the entire application process
- **Tracks** all applications with detailed audit logs

### 1.3 Target Users

1. Fresh graduates applying to internships
2. Software developers looking for new opportunities
3. Job seekers wanting to maximize their application volume
4. Anyone tired of repetitive form filling

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├────────────────────────────────────────────────────────────────────┤
│  React Frontend          │  REST API Clients      │  CLI Tools     │
│  - Swipe Interface       │  - Postman/Insomnia    │  - curl        │
│  - Dashboard             │  - Integration APIs     │  - Scripts     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                         API LAYER (NestJS)                          │
├────────────────────────────────────────────────────────────────────┤
│  Controllers:                                                       │
│  - UsersController      - Handle user registration & resume upload  │
│  - JobsController       - Job feed & manual job addition            │
│  - ScrapersController   - Trigger scraping operations               │
│  - ApplicationsController - Application lifecycle management        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  UsersService    │  │  JobsService     │  │ ApplicationsSvc  │  │
│  │  - Create user   │  │  - Save jobs     │  │ - Create app     │  │
│  │  - Update resume │  │  - Get feed      │  │ - Process app    │  │
│  │  - Find by ID    │  │  - Match scores  │  │ - Approve/Reject │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  ScrapersService │  │  LlmService      │  │ MatchingService  │  │
│  │  - Scrape jobs   │  │  - Embeddings    │  │ - Vector match   │  │
│  │  - Clear old     │  │  - Resume tailor │  │ - Keyword match  │  │
│  │  - User-based    │  │  - Form answers  │  │ - Composite score│  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ SimpleAutomation │  │ ResumeParser     │  │ AuditLogService  │  │
│  │  - Playwright    │  │ - PDF parsing    │  │ - Event logging  │  │
│  │  - Form filling  │  │ - DOCX parsing   │  │ - History        │  │
│  │  - Login/Submit  │  │ - Skill extract  │  │ - Debugging      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
├────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │    PostgreSQL   │  │    pgvector     │  │    File Storage    │ │
│  │  - Users        │  │  - profileVector│  │  - resumes/        │ │
│  │  - JobListings  │  │  - descVector   │  │  - screenshots/    │ │
│  │  - Applications │  │  - HNSW index   │  │  - uploads/        │ │
│  │  - AuditLogs    │  │                 │  │                    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                              │
├────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Google Gemini  │  │   Internshala   │  │     LinkedIn        │ │
│  │  - Embeddings   │  │   - Scraping    │  │     - Scraping      │ │
│  │  - Chat/Answer  │  │   - Automation  │  │     - (Future)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Descriptions

#### 2.2.1 InternshalaScraperV2
**Purpose**: Scrape internships and jobs from Internshala based on user skills

**Key Features**:
- Skill-to-category mapping (50+ skills → Internshala URLs)
- Infinite scroll handling
- Multi-page scraping
- Deduplication by external ID
- Headless browser for performance

**Flow**:
```
User Skills → Build Search URLs → Scrape Each URL → Handle Pagination → Deduplicate → Return Jobs
```

#### 2.2.2 SimpleAutomationService
**Purpose**: Automate job application process using Playwright

**Key Features**:
- Login detection and handling
- Smart form field detection
- AI-powered answer generation
- Multi-page form navigation
- Popup/modal dismissal
- File upload handling
- Screenshot capture
- User notifications on errors

**Flow**:
```
Login → Navigate to Job → Click Apply → Detect Fields → Generate Answers → Fill Form → Handle Next/Submit → Capture Screenshot
```

#### 2.2.3 LlmService
**Purpose**: AI operations using Gemini or OpenAI

**Capabilities**:
- **Embeddings**: Generate 1536-dimension vectors for matching
- **Resume Tailoring**: Customize resume for specific job
- **Answer Generation**: Generate form field answers
- **Requirement Extraction**: Parse job requirements from description

#### 2.2.4 MatchingService
**Purpose**: Score job-user compatibility

**Algorithm**:
```
Final Score = (Vector Similarity × 0.6) + (Keyword Match × 0.4)

Vector Similarity = cosine_similarity(user_vector, job_vector)
Keyword Match = matched_skills / total_required_skills
```

---

## 3. Data Models

### 3.1 User Entity
```typescript
interface User {
  id: UUID;
  fullname: string;
  email: string;                // Unique
  phone?: string;
  masterResumeText: string;     // Full resume text
  resumeFileUrl?: string;       // Path to uploaded file
  skills: string[];             // ["python", "react", "node"]
  profileVector: number[];      // 1536-dim embedding
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 JobListing Entity
```typescript
interface JobListing {
  id: UUID;
  platform: 'internshala' | 'linkedin';
  externalId: string;           // Platform's ID
  title: string;
  company: string;
  description: string;
  requirements: string[];       // Extracted skills
  url: string;
  location?: string;
  descriptionVector: number[];  // 1536-dim embedding
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Application Entity
```typescript
interface Application {
  id: UUID;
  userId: UUID;
  jobId: UUID;
  status: 'Drafting' | 'NeedsApproval' | 'Submitted' | 'Failed';
  tailoredResume?: string;
  tailoredResumeUrl?: string;
  previewScreenshotUrl?: string;
  failureReason?: string;
  retryCount: number;           // Max 3
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  submittedAt?: Date;
}
```

### 3.4 ApplicationLog Entity
```typescript
interface ApplicationLog {
  id: UUID;
  applicationId: UUID;
  event: string;                // 'created', 'submitted', 'failed', etc.
  message: string;
  metadata: object;             // Additional context
  timestamp: Date;
}
```

---

## 4. Application Workflow

### 4.1 State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                    APPLICATION STATES                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌──────────┐                                                   │
│   │  START   │                                                   │
│   └────┬─────┘                                                   │
│        │ createApplication()                                     │
│        ▼                                                         │
│   ┌──────────┐                                                   │
│   │ Drafting │ ←───────────────────────────────────────────┐     │
│   └────┬─────┘                                             │     │
│        │ resumeTailored + automationComplete               │     │
│        ▼                                                   │     │
│   ┌──────────────┐                                         │     │
│   │NeedsApproval │ ────────────────────────────────────┐   │     │
│   └────┬─────────┘                                     │   │     │
│        │                                               │   │     │
│   ┌────┴────────────────────────┐                      │   │     │
│   │                             │                      │   │     │
│   ▼                             ▼                      │   │     │
│  approve()                   reject()                  │   │     │
│   │                             │                      │   │     │
│   ▼                             ▼                      │   │     │
│   ┌───────────┐           ┌────────┐                   │   │     │
│   │ Submitted │           │ Failed │ ──────────────────┘   │     │
│   └───────────┘           └───┬────┘                       │     │
│                               │                            │     │
│                               │ retry() (if retryCount < 3)│     │
│                               └────────────────────────────┘     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 Background Processing

When `createApplication()` is called:

1. **Immediate Response**: Returns application ID with status "Drafting"
2. **Background Task**:
   - Tailor resume using LLM
   - Save tailored resume
   - If credentials provided:
     - Run Playwright automation
     - Fill forms with AI-generated answers
     - Take screenshot
     - Update status to "Submitted" or "Failed"
   - Else:
     - Mark as "NeedsApproval"

---

## 5. Scraping Architecture

### 5.1 Skill-Based Scraping

```typescript
// Skill to Internshala category mapping (partial)
const skillToCategory = {
  'python': 'python',
  'javascript': 'javascript',
  'react': 'reactjs',
  'machine learning': 'machine%20learning',
  'data science': 'data%20science',
  // ... 50+ mappings
};
```

### 5.2 Scraping Flow

```
User Request (userId, maxJobs)
        │
        ▼
Fetch User Skills from DB
        │
        ▼
Build Category URLs
  - /internships/python-internship
  - /internships/reactjs-internship
  - /internships/javascript-internship
  - /internships/ (general)
        │
        ▼
For Each URL:
  ┌─────────────────────────────────┐
  │ 1. Navigate to page             │
  │ 2. Wait for job cards           │
  │ 3. Extract job data             │
  │ 4. Scroll for more              │
  │ 5. Click "Load More" if exists  │
  │ 6. Repeat until maxJobs         │
  └─────────────────────────────────┘
        │
        ▼
Deduplicate by externalId
        │
        ▼
Save to Database
  - Check if exists (update)
  - Create if new
  - Generate embeddings
        │
        ▼
Return Results
```

---

## 6. AI Integration

### 6.1 LLM Provider Configuration

```env
# Choose provider
LLM_PROVIDER=gemini    # or 'openai'

# Gemini
GEMINI_API_KEY=your_key

# OpenAI
OPENAI_API_KEY=your_key
```

### 6.2 Key AI Operations

#### Resume Tailoring
```typescript
async tailorResume(
  masterResume: string,
  jobDescription: string,
  requirements: string[]
): Promise<string>
```

**Prompt Strategy**:
- Highlight relevant skills
- Use keywords from job description
- Maintain truthfulness
- Optimize for ATS

#### Form Answer Generation
```typescript
async answerApplicationQuestions(
  questions: { id: string; label: string; type: string }[],
  userProfile: object,
  resumeText: string
): Promise<Record<string, string>>
```

**Answer Types**:
- Cover letters: 3-5 professional sentences
- "Why hire you": Skills + job alignment
- Experience: Extract from resume
- Availability: "Immediately"

### 6.3 Embedding Generation

Uses 1536-dimensional embeddings for:
- User profile (resume + skills)
- Job descriptions

Stored in PostgreSQL using pgvector extension for efficient similarity search.

---

## 7. Future Enhancements

### 7.1 Skyvern Integration

For more dynamic automation that doesn't rely on hardcoded selectors:

```typescript
// Skyvern provides AI-powered element detection
interface SkyvernTaskRequest {
  url: string;
  prompt: string;
  context: {
    userProfile: UserProfile;
    resumeText: string;
    credentials?: Credentials;
  };
}
```

**Benefits**:
- No selector maintenance
- Handles website changes
- CAPTCHA awareness
- Cloud execution option

### 7.2 JobSpy Integration

For multi-platform scraping:

```python
from jobspy import scrape_jobs

jobs = scrape_jobs(
    site_name=["indeed", "linkedin", "glassdoor", "ziprecruiter"],
    search_term="software engineer",
    location="India",
    results_wanted=500
)
```

### 7.3 Planned Features

1. **Chrome Extension**: One-click apply from any job page
2. **Email Notifications**: Application status updates
3. **Analytics Dashboard**: Success rates, response tracking
4. **Resume Versions**: Multiple resume variants for different roles
5. **Interview Scheduler**: Auto-detect and calendar integration

---

## 8. Deployment

### 8.1 Development

For local development, Docker Compose is the recommended setup:

```bash
# From project root
cp .env.docker .env
# fill API keys and credentials in .env

# start postgres + backend + frontend
docker compose up --build
```

Notes:
- Keep Docker Playwright image version aligned with the playwright package version in backend/package.json.
- If Skyvern is not running locally, considered fill credentials in `backend/src/config`.

### 8.2 Production Considerations

1. **Database**: Use managed PostgreSQL (AWS RDS, Supabase)
2. **API**: Deploy on Railway, Render, or AWS Lambda
3. **Browser**: Consider Browserless.io for cloud Playwright
4. **Secrets**: Use AWS Secrets Manager or similar
5. **Monitoring**: Add Sentry for error tracking

---

## 9. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection refused | Start Docker: `docker-compose up -d` |
| LLM rate limits | Add delays, implement queue |
| Playwright timeout | Increase timeout, check network |
| Login fails | Verify credentials, check for CAPTCHA |
| No jobs found | Check skill mappings, increase maxJobs |

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run start:dev

# Run Playwright in headed mode (visible browser)
# Already configured in SimpleAutomationService
```

---

## 10. API Reference

See [README.md](./README.md) for complete API endpoint documentation.

---

*Last Updated: January 2026*



