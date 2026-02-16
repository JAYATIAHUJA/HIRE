# 🚀 HIRE - Intelligent Job Application Automation Engine

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

**An AI-powered job application automation platform that scrapes jobs, matches them to your profile, and automates the application process.**

[Getting Started](#-quick-start) · [Contributing](#-contributing) · [Documentation](./DOCUMENTATION.md) · [Architecture](./ARCHITECTURE.md)

</div>

---

## 📖 Table of Contents

- [What is HIRE?](#-what-is-hire)
- [Why HIRE?](#-why-hire)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
  - [Docker Setup ](#option-1-docker-setup-recommended-)
  - [Local Development](#option-2-local-development-setup)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Apertre 3.0 Contributors](#-apertre-30-contributors)
- [License](#-license)

---

## 💡 What is HIRE?

HIRE is an **intelligent job application automation engine** that streamlines the job hunting process using AI and browser automation. Instead of spending hours applying to jobs manually, HIRE does the heavy lifting for you!

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. SCRAPE      │ ──▶ │  2. MATCH       │ ──▶ │  3. TAILOR      │ ──▶ │  4. APPLY       │
│  Jobs from      │     │  Jobs to your   │     │  Resume for     │     │  Automatically  │
│  platforms      │     │  profile        │     │  each job       │     │  using AI       │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🎯 Why HIRE?

### The Problem

Applying to jobs is **time-consuming and repetitive**. Job seekers spend hours:

| Pain Point | Time Wasted |
|------------|-------------|
| 🔍 Searching for relevant jobs | 2-3 hours/day |
| 📝 Tailoring resumes | 30 mins/application |
| ✍️ Filling forms repeatedly | 15-20 mins/application |
| 💌 Writing cover letters | 20-30 mins/application |

### The Solution

HIRE automates the entire workflow:

| Feature | What HIRE Does |
|---------|----------------|
| 🕷️ **Smart Scraping** | Scrapes jobs from platforms based on your skills |
| 🎯 **AI Matching** | Ranks jobs by relevance using vector embeddings |
| 📄 **Resume Tailoring** | Customizes your resume for each job using LLM |
| 🤖 **Auto-Apply** | Fills applications with AI-generated answers |
| 🔄 **Handles Complexity** | Manages popups, multi-page forms, file uploads |

---

## ✨ Features

### Core Features

- **🕷️ Multi-Platform Job Scraping** - Currently supports Internshala, with more platforms coming!
- **🎯 AI-Powered Job Matching** - Uses vector similarity (pgvector) to find relevant jobs
- **📄 Smart Resume Tailoring** - LLM-powered resume customization for each application
- **🤖 Automated Form Filling** - Playwright-based browser automation with AI-generated responses
- **📊 Application Dashboard** - Track all your applications in one place

### Automation Capabilities

| Capability | Description |
|------------|-------------|
| Smart Form Detection | Detects all form fields and their labels |
| Multi-Page Forms | Navigates through form pages automatically |
| Popup Handling | Auto-dismisses alerts, modals, and cookie popups |
| File Uploads | Uploads resume to file inputs (PDF, DOCX, DOC) |

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | NestJS + TypeScript | REST API, business logic |
| **Database** | PostgreSQL + pgvector | Data storage, vector similarity |
| **Automation** | Playwright | Browser automation |
| **AI/LLM** | Google Gemini / OpenAI | Resume tailoring, form answers |
| **Frontend** | React + Vite | User interface |
| **Containerization** | Docker + Docker Compose | Easy deployment, development |

---

## 📁 Project Structure

```
HIRE/
├── 📂 backend/                 # NestJS Backend
│   ├── 📂 src/
│   │   ├── 📂 applications/    # Application workflow management
│   │   ├── 📂 jobs/            # Job listing management
│   │   ├── 📂 scrapers/        # ⭐ Job scraping services
│   │   ├── 📂 services/        # Core services (LLM, automation)
│   │   ├── 📂 users/           # User management & resume handling
│   │   └── 📂 config/          # Database & app configuration
│   ├── 📂 resumes/             # Tailored resume storage
│   ├── 📂 screenshots/         # Automation screenshots
│   └── 📂 uploads/             # User uploaded files
│
├── 📂 frontend/                # React Frontend (Vite)
│   ├── 📂 src/
│   │   ├── 📂 components/      # Reusable UI components
│   │   └── 📂 pages/           # Application pages
│
├── 📂 .github/                 # GitHub Actions & Issue Templates
│   └── 📂 ISSUE_TEMPLATE/      # Issue templates for contributors
│
├── 📄 docker-compose.yml       # PostgreSQL container setup
├── 📄 CONTRIBUTING.md          # Contribution guidelines
├── 📄 ARCHITECTURE.md          # System architecture details
└── 📄 README.md                # You are here! 👋
```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, make sure you have:

- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **Gemini API Key** - [Get Free Key](https://aistudio.google.com/apikey)

### Option 1: Docker Setup 

The easiest way to get started! Docker handles all dependencies including Playwright browsers.

```bash
# Clone the repository
git clone https://github.com/JAYATIAHUJA/HIRE.git
cd HIRE

# Configure environment
cp .env.docker .env
# Edit .env with your API keys and credentials

# Start all services (database, backend, frontend)
npm run docker:dev

# View logs
npm run docker:logs

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

That's it! All services are running in containers with hot reload enabled.

Docker notes:
- Local development uses Docker Compose (Postgres + backend + frontend) with hot reload.
- Backend uses mcr.microsoft.com/playwright:v1.40.1-jammy-chromium for Playwright + Chromium.
- Keep Docker Playwright version aligned with backend/package.json Playwright version.
- Docker is intended for local development; production deployment should use managed cloud services.

### Option 2: Local Development Setup

If you prefer running services locally:

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/JAYATIAHUJA/HIRE.git
cd HIRE

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Step 2: Start Database

```bash
# From project root
docker compose up -d postgres

# Verify database is running
docker compose ps
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp env.example backend/.env
```

Edit `backend/.env` with your values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hire_db
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
INTERNSHALA_EMAIL=your_internshala_email
INTERNSHALA_PASSWORD=your_internshala_password
```

### Step 4: Start the Application

```bash
# Terminal 1: Start Backend
cd backend
npm run start:dev

# Terminal 2: Start Frontend (Optional)
cd frontend
npm run dev
```

### Step 5: Verify Setup

```bash
# Test the API
curl http://localhost:3000/api/scrapers/stats

# Expected response:
# {"message":"Job statistics","total":0,...}
```

🎉 **Congratulations!** You're all set up!

---

## 📡 API Reference

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | POST | Create user with resume |
| `/api/users/:id` | GET | Get user profile |
| `/api/users/:id/upload-resume` | POST | Upload PDF/Word resume |
| `/api/feed?userId=X` | GET | Get personalized job feed |
| `/api/scrapers/stats` | GET | Get job statistics |
| `/api/scrapers/scrape-for-user` | POST | Scrape jobs for user's skills |
| `/api/applications` | POST | Create job application |
| `/api/applications/:id` | GET | Get application status |
| `/api/applications/:id/approve` | POST | Approve & submit |

For detailed API documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## 🤝 Contributing

We love contributions! Whether you're fixing a bug, adding a feature, or improving documentation, we appreciate your help.

### Quick Contribution Guide

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
5. **Push** to your branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Contribution Types

| Type | Description | Good For |
|------|-------------|----------|
| 🐛 **Bug Fixes** | Fix reported issues | Everyone |
| ✨ **Features** | Add new functionality | Intermediate+ |
| 📝 **Documentation** | Improve docs, fix typos | Beginners |
| 🧪 **Tests** | Add or improve tests | All levels |
| 🕷️ **Scrapers** | Add new job platform support | Intermediate+ |

### 🕷️ Scraper Contributions

We especially welcome scrapers for new job platforms! You can contribute:

#### Option 1: Individual Platform Scrapers

Create a dedicated scraper for a specific job platform:

**Platforms we'd love scrapers for:**
- LinkedIn Jobs
- Indeed
- Glassdoor
- Naukri
- AngelList/Wellfound
- RemoteOK
- WeWorkRemotely
- Hacker News Jobs

#### Option 2: Unified Multi-Platform Scraper

Build a single scraper that aggregates jobs from multiple platforms using libraries like [JobSpy](https://github.com/speedyapply/JobSpy).

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed scraper guidelines.

---

## 🌟 Apertre 3.0 Contributors

### Welcome, Apertre 3.0 Mentees! 🎉

If you're participating in **Apertre 3.0**, we're excited to have you here! This project is beginner-friendly and we're here to help you succeed.

### 📋 Important: Identifying Yourself

> **⚠️ When creating any issue (bug report, feature request, scraper proposal), please add `Apertre 3.0` in your issue description if you are a participant!**

This helps maintainers identify and prioritize your contributions during the program.

### How to Mention Apertre 3.0

When creating an issue, add this at the top of your description:

```markdown
**Program:** Apertre 3.0 Participant
```

Or use our dedicated [Apertre 3.0 Contributor Template](https://github.com/JAYATIAHUJA/HIRE/issues/new?template=apertre_contributor.yml) when requesting to work on issues!

### Good First Issues for Apertre 3.0

Look for issues labeled:
- 🏷️ `good first issue` - Perfect for beginners
- 🏷️ `apertre3.0` - Specifically for program participants
- 🏷️ `documentation` - Great for getting started
- 🏷️ `help wanted` - We need your help!

### 🏷️ PR Labels

Maintain proper labels before merging any Pull Requests.

**Available Labels:** `easy`, `medium`, `hard`, `apertre3.0`

| Rule | Description |
|------|-------------|
| ⚠️ **MANDATORY** | `apertre3.0` label is **required** for all PRs from program participants |
| ⚠️ **ONE Only** | Admin should give only **ONE** difficulty label (`easy`, `medium`, or `hard`) per PR |

### 🚨 Points System

Earn points for your contributions based on difficulty!

| Difficulty | Points |
|------------|--------|
| **EASY** | 5 PTS |
| **MEDIUM** | 7 PTS |
| **HARD** | 10 PTS |

🏆 **Points contribute to the Apertre 3.0 leaderboard!**

### Getting Help

- 💬 **Discord**: Join our community server
- 📝 **Issues**: Ask questions on GitHub issues
- 📚 **Docs**: Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🔮 Roadmap

### Current Focus
- [x] Internshala scraper
- [x] Basic automation pipeline
- [ ] LinkedIn scraper
- [ ] Indeed scraper
- [ ] Multi-platform unified scraper

### Future Plans
- [ ] Chrome extension for quick applications
- [ ] Mobile app
- [ ] Interview preparation AI
- [ ] Salary negotiation assistant

---

## 📊 Architecture Overview

For a detailed technical deep-dive, see [ARCHITECTURE.md](./ARCHITECTURE.md).

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│              Backend API (NestJS + TypeScript)               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ScrapersService │ MatchingService │ LlmService      │    │
│  │ ApplicationsService │ AutomationService │ ...       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │   Playwright  │ │  LLM Provider │
│  + pgvector   │ │   Browser     │ │ (Gemini/GPT)  │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## 🛡️ Security

- 🔒 Never commit `.env` files
- 🔑 Rotate API keys regularly
- 🔐 Use environment variables for secrets
- 🕵️ Credentials are only used during automation sessions

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Backend framework
- [Playwright](https://playwright.dev/) - Browser automation
- [Google Gemini](https://ai.google.dev/) - AI/LLM capabilities
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search

---

<div align="center">

**Built with ❤️ by [Jayati Ahuja](https://github.com/JAYATIAHUJA) and contributors**

⭐ **Star this repo if you find it helpful!** ⭐

[Report Bug](https://github.com/JAYATIAHUJA/HIRE/issues/new?template=bug_report.yml) · [Request Feature](https://github.com/JAYATIAHUJA/HIRE/issues/new?template=feature_request.yml) · [Join Community](#)

</div>



