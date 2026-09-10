from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.leetcode import router as leetcode_router
from app.api.github.commits import router as commits_router
from app.api.ai.ai import router as ai_router
from app.api.resume import router as resume_router
from app.api.github_public import router as github_public_router

app = FastAPI(
title="DevLens API",
description="AI Software Engineer Dashboard API",
version="1.0.0"
)

FRONTEND_URL = os.getenv(
"FRONTEND_URL",
"http://localhost:3000"
)

ALLOWED_ORIGINS = [
FRONTEND_URL,
"https://devlens-sooty.vercel.app",
]

app.add_middleware(
CORSMiddleware,
allow_origins=ALLOWED_ORIGINS,
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(commits_router)
app.include_router(resume_router)
app.include_router(github_public_router)
app.include_router(leetcode_router)

@app.get("/")
def home():
  return {"message": "Welcome to DevLens API"}

@app.get("/health")
def health():
  return {"status": "Server is running"}
