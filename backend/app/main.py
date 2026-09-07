from dotenv import load_dotenv
from app.api.leetcode import router as leetcode_router
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(
    title="DevLens API"
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    )


@app.get("/")
def root():
    return {
        "message": "Welcome to DevLens API"
    }
    

from app.api.github.commits import router as commits_router
from app.api.ai.ai import router as ai_router
from app.api.resume import router as resume_router
from app.api.github_public import router as github_public_router
app = FastAPI(
    title="DevLens API",
    description="AI Software Engineer Dashboard API",
    version="1.0.0"
)


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# ROUTERS
# =========================

app.include_router(ai_router)
app.include_router(commits_router)
app.include_router(resume_router)

app.include_router(github_public_router)
# =========================
# HOME
# =========================

@app.get("/")
def home():
    return {
        "message": "Welcome to DevLens API"
    }
app.include_router(leetcode_router)

# =========================
# HEALTH CHECK
# =========================

@app.get("/health")
def health():
    return {
        "status": "Server is running"
    }