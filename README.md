# 🚀 DevLens — AI Software Engineer Dashboard

DevLens is a full-stack developer analytics and career-readiness platform that analyzes GitHub activity, coding performance, repositories, commits, and resume information to provide actionable insights for software engineering growth.

It brings developer analytics, AI-powered career guidance, resume analysis, and internship readiness into a single dashboard.

---

## ✨ Features

### 🐙 GitHub Analytics

* GitHub profile overview
* Public repository analysis
* Repository statistics
* Commit activity analysis
* Commit quality scoring
* Developer productivity insights

### 🤖 AI Career Coach

* AI-powered career suggestions
* Personalized improvement recommendations
* Software engineering career guidance
* Learning goal suggestions

### 📄 Resume Analyzer

* Resume quality analysis
* Resume scoring
* Skill and project evaluation
* Improvement recommendations

### 💻 Coding Analytics

* LeetCode performance tracking
* Coding activity insights
* Problem-solving progress
* Developer consistency analysis

### 📊 Developer Dashboard

* Overall developer score
* Repository quality score
* Commit quality score
* Internship readiness score
* Visual analytics and statistics

### 🎯 Internship Readiness

DevLens evaluates multiple aspects of a developer's profile and generates an internship-readiness score based on:

* GitHub activity
* Repository quality
* Commit quality
* Coding practice
* Resume quality
* Overall development consistency

---

## 🛠️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Recharts

### Backend

* Python
* FastAPI
* REST APIs

### APIs & Services

* GitHub API
* LeetCode data
* OpenAI API
* NextAuth

### Development Tools

* Git
* GitHub
* npm
* Python virtual environment

---

## 🏗️ Project Architecture

```text
DevLens
│
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── github/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── commitScore.ts
│   │   ├── github.ts
│   │   ├── readinessScore.ts
│   │   └── repoScore.ts
│   │
│   └── types/
│
├── backend/
│   └── app/
│       ├── api/
│       │   ├── ai/
│       │   ├── github/
│       │   ├── github_public.py
│       │   ├── leetcode.py
│       │   └── resume.py
│       │
│       ├── services/
│       │   ├── ai_service.py
│       │   └── resume_service.py
│       │
│       └── main.py
│
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/anshikakamal2-dev/devlens.git
cd devlens
```

---

# 🖥️ Frontend Setup

Go to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Frontend will run at:

```text
http://localhost:3000
```

---

# 🐍 Backend Setup

Open another terminal and go to:

```bash
cd backend
```

Create a virtual environment:

### Windows

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create:

```text
backend/.env
```

Add your API configuration:

```env
OPENAI_API_KEY=your_openai_api_key
GITHUB_TOKEN=your_github_token
```

Start FastAPI:

```powershell
python -m uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 🔐 Environment Variables

Never commit `.env` or `.env.local` files to GitHub.

Example environment variables:

```env
OPENAI_API_KEY=your_openai_api_key
GITHUB_TOKEN=your_github_token
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Keep all real credentials private.

---

## 🔄 How DevLens Works

```text
                ┌─────────────────────┐
                │       User          │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │   Next.js Frontend  │
                │      Dashboard      │
                └──────────┬──────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        GitHub API     LeetCode       Resume
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │    FastAPI Backend  │
                └──────────┬──────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        GitHub Analysis   AI Engine   Score Engine
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  Developer Insights │
                │   & Recommendations │
                └─────────────────────┘
```

---

## 📊 Core Scoring System

DevLens combines multiple signals to evaluate developer readiness.

### Repository Score

Evaluates factors such as:

* Repository activity
* Repository quality
* Documentation
* Project structure
* Development activity

### Commit Score

Analyzes:

* Commit message quality
* Commit consistency
* Commit frequency
* Development patterns

### Internship Readiness Score

Combines multiple developer signals to provide an overall readiness assessment.

---

## 🎯 Why DevLens?

Many developers use GitHub, LeetCode, resumes, and different career resources separately.

DevLens brings these signals together into one platform.

Instead of simply showing statistics, DevLens aims to answer:

> **"How internship-ready am I, and what should I improve next?"**

---

## 🔮 Future Improvements

* PostgreSQL-based analytics storage
* Advanced developer activity tracking
* AI-generated personalized learning plans
* Automated resume generation
* Portfolio generation
* Burnout-risk prediction
* Coding habit tracking
* Developer-to-job matching
* Architecture diagram generation
* Docker-based deployment
* Cloud deployment
* Advanced AI career recommendations

---

## 📌 Project Status

**Status:** Active Development 🚧

DevLens currently provides GitHub analytics, coding insights, resume analysis, AI career assistance, and internship-readiness evaluation.

---

## 👩‍💻 Author

**Anshika Kamal**

B.Tech — Computer Science & Engineering

GitHub:
https://github.com/anshikakamal2-dev

---

## ⭐ Support

If you find this project useful, consider giving it a ⭐ on GitHub.
