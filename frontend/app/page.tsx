"use client";

import { useEffect, useState } from "react";
import {
  Pie,
  PieChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { calculateRepositoryScore } from "@/lib/repoScore";
import {
  analyzeCommitMessage,
  analyzeCommits,
} from "@/lib/commitScore";
import { calculateInternshipReadiness } from "@/lib/readinessScore";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// =====================================================
// TYPES
// =====================================================

interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  bio: string | null;
}

interface GithubRepository {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  open_issues_count: number;
  updated_at: string;
}

interface GithubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  html_url?: string;
  qualityScore?: number;
  qualityLabel?: string;
}

interface CommitStats {
  totalCommits: number;
  goodCommits: number;
  weakCommits: number;
  qualityScore: number;
  messageClarity: number;
  meaningfulness: number;
  conventionalFormat: number;
  commitLength: number;
  actionClarity: number;
}

interface LeetCodeStats {
  username: string;
  ranking: number;
  reputation: number;
  total_solved: number;
  easy: number;
  medium: number;
  hard: number;
}

interface CommitQualityResult {
  score: number;
  label: string;
}

// =====================================================
// HELPERS
// =====================================================

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function getCommitQuality(message: string): CommitQualityResult {
  const result = analyzeCommitMessage(message) as unknown;

  if (typeof result === "number") {
    return {
      score: clamp(result),
      label: result >= 75 ? "Good" : result >= 50 ? "Average" : "Weak",
    };
  }

  if (typeof result === "object" && result !== null && "score" in result) {
    const quality = result as Partial<CommitQualityResult>;

    return {
      score: clamp(safeNumber(quality.score)),
      label:
        typeof quality.label === "string" ? quality.label : "Unknown",
    };
  }

  return { score: 0, label: "Unknown" };
}

function cleanGithubCommit(commit: unknown): GithubCommit {
  const data = commit as {
    sha?: unknown;
    message?: unknown;
    author?: unknown;
    date?: unknown;
    html_url?: unknown;
    commit?: {
      message?: unknown;
      author?: {
        name?: unknown;
        date?: unknown;
      };
    };
  };

  let message = "No commit message";
  if (typeof data.message === "string") {
    message = data.message;
  } else if (typeof data.commit?.message === "string") {
    message = data.commit.message;
  }

  let author = "Unknown author";
  if (typeof data.author === "string") {
    author = data.author;
  } else if (
    typeof data.author === "object" &&
    data.author !== null &&
    "login" in data.author &&
    typeof (data.author as { login?: unknown }).login === "string"
  ) {
    author = (data.author as { login: string }).login;
  } else if (typeof data.commit?.author?.name === "string") {
    author = data.commit.author.name;
  }

  let date = "";
  if (typeof data.date === "string") {
    date = data.date;
  } else if (typeof data.commit?.author?.date === "string") {
    date = data.commit.author.date;
  }

  const quality = getCommitQuality(message);

  return {
    sha: typeof data.sha === "string" ? data.sha : "",
    message,
    author,
    date,
    html_url:
      typeof data.html_url === "string" ? data.html_url : undefined,
    qualityScore: quality.score,
    qualityLabel: quality.label,
  };
}

function analyzeCleanedCommits(commits: GithubCommit[]): CommitStats {
  const analyzerCommits = commits.map((commit) => ({
    sha: commit.sha,
    commit: {
      message: commit.message,
      author: {
        name: commit.author,
        email: "",
        date: commit.date,
      },
    },
    html_url: commit.html_url || "",
  }));

  return analyzeCommits(analyzerCommits) as CommitStats;
}

function calculateLeetCodeScore(stats: LeetCodeStats): number {
  const solvedScore = Math.min(stats.total_solved / 150, 1) * 50;
  const difficultyScore =
    Math.min(stats.medium / 50, 1) * 25 +
    Math.min(stats.hard / 20, 1) * 25;

  return Math.round(clamp(solvedScore + difficultyScore));
}

function calculateDeveloperScore({
  githubScore,
  commitScore,
  leetcodeScore,
  resumeScore,
  internshipScore,
}: {
  githubScore: number;
  commitScore: number;
  leetcodeScore: number;
  resumeScore: number;
  internshipScore: number;
}): number {
  return Math.round(
    githubScore * 0.2 +
      commitScore * 0.2 +
      leetcodeScore * 0.25 +
      resumeScore * 0.2 +
      internshipScore * 0.15
  );
}

// =====================================================
// HOME
// =====================================================

export default function Home() {
  // ===================================================
  // STATE
  // ===================================================

  const [user, setUser] = useState<GithubUser | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [repoCommits, setRepoCommits] = useState<
    Record<string, GithubCommit[]>
  >({});
  const [commitStats, setCommitStats] = useState<Record<string, CommitStats>>(
    {}
  );

  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [commitExplanation, setCommitExplanation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Search any public GitHub user
  const [githubUsername, setGithubUsername] = useState("");
  const [githubSearchLoading, setGithubSearchLoading] = useState(false);
  const [githubSearchError, setGithubSearchError] = useState("");

  // Career Coach
  const [careerAdvice, setCareerAdvice] = useState("");
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState("");

  // Resume Analyzer
  const [resumeScore, setResumeScore] = useState<number | null>(null);
  const [resumeAdvice, setResumeAdvice] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  // LeetCode
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [leetcodeStats, setLeetcodeStats] =
    useState<LeetCodeStats | null>(null);
  const [leetcodeLoading, setLeetcodeLoading] = useState(false);
  const [leetcodeError, setLeetcodeError] = useState("");
  const [leetcodeScore, setLeetcodeScore] = useState(0);

  // ===================================================
  // LOAD LOGGED-IN GITHUB DATA
  // ===================================================

  useEffect(() => {
    let cancelled = false;

    async function loadGithubData() {
      try {
        setLoading(true);
        setError("");

        const userResponse = await fetch("/api/github/user", {
          cache: "no-store",
        });
        const userData = await userResponse.json().catch(() => ({}));

        if (!userResponse.ok || !userData?.login) {
          throw new Error("Unable to load your GitHub profile.");
        }

        if (cancelled) return;
        setUser(userData as GithubUser);

        const repoResponse = await fetch("/api/github/repos", {
          cache: "no-store",
        });
        const repoData = await repoResponse.json().catch(() => []);

        if (!repoResponse.ok || !Array.isArray(repoData)) {
          throw new Error("Unable to load GitHub repositories.");
        }

        if (cancelled) return;
        setRepositories(repoData as GithubRepository[]);

        const nextCommits: Record<string, GithubCommit[]> = {};
        const nextStats: Record<string, CommitStats> = {};

        for (const repo of repoData as GithubRepository[]) {
          if (cancelled) return;

          try {
            const response = await fetch(
              `/api/github/commits?owner=${encodeURIComponent(
                userData.login
              )}&repo=${encodeURIComponent(repo.name)}`,
              { cache: "no-store" }
            );

            const rawData = await response.json().catch(() => []);

            if (!response.ok || !Array.isArray(rawData)) {
              nextCommits[repo.name] = [];
              continue;
            }

            const cleaned = rawData.map(cleanGithubCommit);
            nextCommits[repo.name] = cleaned;
            nextStats[repo.name] = analyzeCleanedCommits(cleaned);

            setRepoCommits({ ...nextCommits });
            setCommitStats({ ...nextStats });
          } catch (commitError) {
            console.error(`Commit error for ${repo.name}:`, commitError);
            nextCommits[repo.name] = [];
          }
        }
      } catch (err) {
        console.error("GitHub loading error:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load GitHub data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGithubData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================================
  // ANALYZE ANY PUBLIC GITHUB USER
  // ===================================================

  async function analyzeGithubUser() {
    const username = githubUsername.trim();

    if (!username) {
      setGithubSearchError("Please enter a GitHub username.");
      return;
    }

    try {
      setGithubSearchLoading(true);
      setGithubSearchError("");
      setCareerAdvice("");
      setCareerError("");
      setSelectedCommit(null);
      setCommitExplanation("");
      setRepoCommits({});
      setCommitStats({});

      const profileResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const profileData = await profileResponse.json().catch(() => ({}));

      if (profileResponse.status === 404) {
        throw new Error("GitHub user not found.");
      }

      if (!profileResponse.ok || !profileData?.login) {
        throw new Error("Unable to fetch this GitHub profile.");
      }

      const publicUser: GithubUser = {
        login: profileData.login,
        name: profileData.name ?? null,
        avatar_url: profileData.avatar_url || "",
        html_url: profileData.html_url || "",
        public_repos: safeNumber(profileData.public_repos),
        followers: safeNumber(profileData.followers),
        following: safeNumber(profileData.following),
        bio: profileData.bio ?? null,
      };

      setUser(publicUser);

      const repoResponse = await fetch(
        `https://api.github.com/users/${encodeURIComponent(
          username
        )}/repos?per_page=20&sort=updated`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const repoData = await repoResponse.json().catch(() => []);

      if (!repoResponse.ok || !Array.isArray(repoData)) {
        throw new Error("Unable to fetch public repositories.");
      }

      const publicRepos: GithubRepository[] = repoData.map((repo: any) => ({
        id: safeNumber(repo.id),
        name: repo.name || "Unnamed repository",
        html_url: repo.html_url || "",
        description: repo.description ?? null,
        stargazers_count: safeNumber(repo.stargazers_count),
        forks_count: safeNumber(repo.forks_count),
        language: repo.language ?? null,
        open_issues_count: safeNumber(repo.open_issues_count),
        updated_at: repo.updated_at || "",
      }));

      setRepositories(publicRepos);

      const nextCommits: Record<string, GithubCommit[]> = {};
      const nextStats: Record<string, CommitStats> = {};

      // Keep this intentionally limited so a username search does not
      // make hundreds of GitHub API requests in the browser.
      for (const repo of publicRepos.slice(0, 20)) {
        try {
          const commitResponse = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(
              username
            )}/${encodeURIComponent(repo.name)}/commits?per_page=5`,
            {
              headers: {
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
            }
          );

          const rawCommits = await commitResponse.json().catch(() => []);

          if (!commitResponse.ok || !Array.isArray(rawCommits)) {
            nextCommits[repo.name] = [];
            continue;
          }

          const cleaned = rawCommits.map(cleanGithubCommit);
          nextCommits[repo.name] = cleaned;
          nextStats[repo.name] = analyzeCleanedCommits(cleaned);

          setRepoCommits({ ...nextCommits });
          setCommitStats({ ...nextStats });
        } catch (commitError) {
          console.error(`Public commit error for ${repo.name}:`, commitError);
          nextCommits[repo.name] = [];
        }
      }

      // Resume/LeetCode belong to the logged-in user, so clear them when
      // switching the GitHub profile being analyzed.
      setLeetcodeStats(null);
      setLeetcodeScore(0);
      setLeetcodeError("");
      setResumeScore(null);
      setResumeAdvice("");
      setResumeError("");
    } catch (err) {
      console.error("GitHub public search error:", err);
      setGithubSearchError(
        err instanceof Error
          ? err.message
          : "Unable to analyze this GitHub user."
      );
    } finally {
      setGithubSearchLoading(false);
    }
  }

  // ===================================================
  // ANALYTICS
  // ===================================================

  const repositoryScores = repositories.map((repo) =>
    calculateRepositoryScore(repo)
  );

  const averageRepoScore =
    repositoryScores.length > 0
      ? repositoryScores.reduce((sum, score) => sum + score.total, 0) /
        repositoryScores.length
      : 0;

  const allCommitStats = Object.values(commitStats);

  const totalCommits = allCommitStats.reduce(
    (sum, stats) => sum + safeNumber(stats.totalCommits),
    0
  );

  const averageCommitQuality =
    allCommitStats.length > 0
      ? allCommitStats.reduce(
          (sum, stats) => sum + safeNumber(stats.qualityScore),
          0
        ) / allCommitStats.length
      : 0;

  const totalStars = repositories.reduce(
    (sum, repo) => sum + safeNumber(repo.stargazers_count),
    0
  );

  const totalForks = repositories.reduce(
    (sum, repo) => sum + safeNumber(repo.forks_count),
    0
  );

  const languageCount: Record<string, number> = {};
  repositories.forEach((repo) => {
    if (repo.language) {
      languageCount[repo.language] =
        (languageCount[repo.language] || 0) + 1;
    }
  });

  const languageData = Object.entries(languageCount).map(([name, value]) => ({
    name,
    value,
  }));

  const mostUsedLanguage =
    Object.entries(languageCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Not available";

  // ===================================================
  // INTERNSHIP READINESS
  // ===================================================

  const internshipReadiness = calculateInternshipReadiness({
    repositories: repositories.length,
    totalStars,
    totalForks,
    averageRepoScore,
    averageCommitQuality,
    totalCommits,
  });

  // ===================================================
  // DEVELOPER SCORE
  // ===================================================

  const githubScore = clamp(
    Math.round(
      averageRepoScore * 0.7 +
        Math.min(totalStars * 2, 20) +
        Math.min(totalForks * 2, 10)
    )
  );

  const commitScore = clamp(Math.round(averageCommitQuality));
  const resumeScoreValue = resumeScore ?? 0;

  const developerScore = calculateDeveloperScore({
    githubScore,
    commitScore,
    leetcodeScore,
    resumeScore: resumeScoreValue,
    internshipScore: internshipReadiness.score,
  });

  // ===================================================
  // LEETCODE
  // ===================================================

  async function analyzeLeetCode() {
    const username = leetcodeUsername.trim();

    if (!username) {
      setLeetcodeError("Please enter a LeetCode username.");
      setLeetcodeStats(null);
      setLeetcodeScore(0);
      return;
    }

    try {
      setLeetcodeLoading(true);
      setLeetcodeError("");
      setLeetcodeStats(null);

      const response = await fetch(
        `${API_BASE_URL}/api/leetcode/${encodeURIComponent(username)}`
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to fetch LeetCode statistics."
        );
      }

      const score = calculateLeetCodeScore(data as LeetCodeStats);
      setLeetcodeScore(score);
      setLeetcodeStats(data as LeetCodeStats);
    } catch (err) {
      console.error("LeetCode analysis error:", err);
      setLeetcodeError(
        "Unable to fetch LeetCode statistics. Please check the username."
      );
      setLeetcodeStats(null);
      setLeetcodeScore(0);
    } finally {
      setLeetcodeLoading(false);
    }
  }

  // ===================================================
  // AI COMMIT EXPLANATION
  // ===================================================

  async function explainCommit(message: string) {
    try {
      setSelectedCommit(message);
      setCommitExplanation("Analyzing commit...");

      const response = await fetch(
        `${API_BASE_URL}/api/ai/explain-commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setCommitExplanation(
          "The AI service could not process this request. Please try again."
        );
        return;
      }

      setCommitExplanation(
        typeof data?.explanation === "string"
          ? data.explanation
          : typeof data?.message === "string"
            ? data.message
            : "No explanation was returned."
      );
    } catch (err) {
      console.error("AI connection error:", err);
      setCommitExplanation(
        "Unable to connect to the DevLens backend."
      );
    }
  }

  // ===================================================
  // AI CAREER COACH
  // ===================================================

  async function getCareerAdvice() {
    try {
      setCareerLoading(true);
      setCareerError("");
      setCareerAdvice("");

      const response = await fetch(
        `${API_BASE_URL}/api/ai/career-coach`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readiness_score: internshipReadiness.score,
            readiness_label: internshipReadiness.label,
            repositories: repositories.length,
            total_stars: totalStars,
            total_forks: totalForks,
            total_commits: totalCommits,
            average_repo_score: averageRepoScore,
            average_commit_quality: averageCommitQuality,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error("Unable to generate career advice.");
      }

      setCareerAdvice(
        typeof data?.advice === "string"
          ? data.advice
          : "No career advice was returned."
      );
    } catch (err) {
      console.error("Career Coach Error:", err);
      setCareerError("Unable to generate career advice. Please try again.");
    } finally {
      setCareerLoading(false);
    }
  }

  // ===================================================
  // RESUME ANALYZER
  // ===================================================

  async function analyzeResume(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf") &&
        !file.name.toLowerCase().endsWith(".docx")) {
      setResumeError("Only PDF and DOCX files are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeError("Resume file is too large. Maximum size is 5 MB.");
      return;
    }

    try {
      setResumeLoading(true);
      setResumeError("");
      setResumeScore(null);
      setResumeAdvice("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/api/resume/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to analyze resume."
        );
      }

      setResumeScore(
        typeof data?.score === "number" ? clamp(data.score) : null
      );
      setResumeAdvice(
        typeof data?.advice === "string"
          ? data.advice
          : "No resume advice was returned."
      );
    } catch (err) {
      console.error("Resume Analyzer Error:", err);
      setResumeError(
        err instanceof Error
          ? err.message
          : "Unable to analyze resume."
      );
    } finally {
      setResumeLoading(false);
    }
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 p-4 text-white sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl animate-pulse">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gray-800" />
            <div className="space-y-2">
              <div className="h-8 w-40 rounded-lg bg-gray-800" />
              <div className="h-4 w-64 rounded bg-gray-800" />
            </div>
          </div>
          <div className="h-32 rounded-2xl border border-gray-800 bg-gray-900" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-gray-800 bg-gray-900"
              />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-72 rounded-2xl border border-gray-800 bg-gray-900" />
            <div className="h-72 rounded-2xl border border-gray-800 bg-gray-900" />
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            Loading your developer profile...
          </p>
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-2xl">
            ⚠️
          </div>
          <h1 className="mt-5 text-2xl font-bold">
            {error ? "Unable to load DevLens" : "No GitHub profile found"}
          </h1>
          <p className="mt-3 text-gray-400">
            {error
              ? "We could not load your GitHub data right now. Please check your connection and try again."
              : "Sign in with GitHub and try loading the dashboard again."}
          </p>
          {error && (
            <p className="mt-3 rounded-lg bg-gray-950 px-4 py-3 text-sm text-gray-500">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ===================================================
  // MAIN DASHBOARD
  // ===================================================

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-xl">
              🚀
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                DevLens
              </h1>
              <p className="mt-1 text-sm text-gray-400 sm:text-base">
                AI Software Engineer Dashboard
              </p>
            </div>
          </div>

          <div className="w-fit rounded-full border border-gray-800 bg-gray-900/80 px-4 py-2 text-sm text-gray-400">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
            {githubUsername.trim()
              ? `Analyzing @${user.login}`
              : "GitHub Connected"}
          </div>
        </header>

        {/* SEARCH ANY GITHUB USER */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">🔎 Analyze Any GitHub User</h2>
            <p className="mt-1 text-sm text-gray-400">
              Enter any public GitHub username to inspect their profile,
              repositories and recent commit activity.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={githubUsername}
              onChange={(event) => {
                setGithubUsername(event.target.value);
                setGithubSearchError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") analyzeGithubUser();
              }}
              placeholder="Enter GitHub username e.g. octocat"
              disabled={githubSearchLoading}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 disabled:opacity-60"
            />

            <button
              type="button"
              onClick={analyzeGithubUser}
              disabled={githubSearchLoading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {githubSearchLoading ? "⏳ Analyzing..." : "🔎 Analyze"}
            </button>
          </div>

          {githubSearchError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              ⚠️ {githubSearchError}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-600">
            Public GitHub data only. Searching another profile does not change
            your GitHub login.
          </p>
        </section>

        {/* PROFILE */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <img
              src={user.avatar_url}
              alt={`${user.login} GitHub avatar`}
              className="h-20 w-20 rounded-full border-2 border-gray-700 sm:h-24 sm:w-24"
            />
            <div className="min-w-0">
              <h2 className="text-3xl font-bold">
                {user.name || user.login}
              </h2>
              <p className="text-gray-400">@{user.login}</p>
              {user.bio && <p className="mt-2 text-gray-300">{user.bio}</p>}
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-blue-400 hover:underline"
              >
                View GitHub Profile →
              </a>
            </div>
          </div>
        </section>

        {/* BASIC STATS */}
        <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="📦"
            title="Public Repositories"
            value={user.public_repos}
            description="Projects visible on GitHub"
          />
          <StatCard
            icon="👥"
            title="Followers"
            value={user.followers}
            description="Developers following this profile"
          />
          <StatCard
            icon="➕"
            title="Following"
            value={user.following}
            description="Developers this profile follows"
          />
          <StatCard
            icon="💻"
            title="Analyzed Commits"
            value={totalCommits}
            description="Recent commits analyzed"
          />
        </section>

        {/* GITHUB ANALYTICS */}
        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">📊 GitHub Analytics</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <AnalyticsCard title="Repositories" value={repositories.length} />
            <AnalyticsCard title="Total Stars" value={`⭐ ${totalStars}`} />
            <AnalyticsCard title="Total Forks" value={`🍴 ${totalForks}`} />
            <AnalyticsCard
              title="Most Used Language"
              value={`💻 ${mostUsedLanguage}`}
              small
            />
          </div>
        </section>

        {/* INTERNSHIP READINESS */}
        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">🎯 Internship Readiness</h2>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-lg shadow-black/10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
              <div className="flex items-center gap-6 lg:min-w-[320px]">
                <div
                  className="relative h-32 w-32 shrink-0 rounded-full"
                  style={{
                    background: `conic-gradient(rgb(59 130 246) ${clamp(
                      internshipReadiness.score
                    ) * 3.6}deg, rgb(31 41 55) 0deg)`,
                  }}
                >
                  <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-gray-900">
                    <span className="text-3xl font-bold">
                      {internshipReadiness.score}
                    </span>
                    <span className="text-xs text-gray-500">/ 100</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wider text-gray-500">
                    Overall Readiness
                  </p>
                  <h3 className="mt-1 text-2xl font-bold">
                    {internshipReadiness.label}
                  </h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Based on GitHub activity, projects and code quality.
                  </p>
                </div>
              </div>

              <div className="w-full lg:flex-1">
                <ScoreBar
                  name="GitHub Activity"
                  value={internshipReadiness.githubActivity}
                  max={25}
                />
                <ScoreBar
                  name="Repository Quality"
                  value={internshipReadiness.repositoryQuality}
                  max={25}
                />
                <ScoreBar
                  name="Commit Quality"
                  value={internshipReadiness.commitQuality}
                  max={25}
                />
                <ScoreBar
                  name="Project Strength"
                  value={internshipReadiness.projectStrength}
                  max={25}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-gray-800 pt-6">
              <h3 className="text-lg font-semibold">💡 Recommendations</h3>
              <p className="mt-1 text-sm text-gray-500">
                Focus on these areas to improve internship readiness.
              </p>
              <div className="mt-3 space-y-2">
                {internshipReadiness.recommendations.map(
                  (recommendation: string, index: number) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-700/60 bg-gray-800/70 p-3 text-gray-300"
                    >
                      <span className="mr-2 text-blue-400">✓</span>
                      {recommendation}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* AI CAREER COACH */}
        <section className="mt-10">
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold">🤖 AI Career Coach</h2>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                AI Powered
              </span>
            </div>
            <p className="mt-1 text-gray-500">
              Turn the current developer profile into a practical internship
              action plan.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
            <div className="p-6 md:p-7">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-2xl">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      Your personal internship coach
                    </h3>
                    <p className="mt-2 max-w-2xl leading-6 text-gray-400">
                      Get guidance based on GitHub activity, repository quality,
                      commit habits and internship readiness score.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={getCareerAdvice}
                  disabled={careerLoading}
                  className="w-full shrink-0 rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                >
                  {careerLoading
                    ? "⏳ Generating advice..."
                    : careerAdvice
                      ? "🔄 Refresh Advice"
                      : "✨ Get Career Advice"}
                </button>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniMetric title="Readiness" value={`${internshipReadiness.score}/100`} />
                <MiniMetric title="Repositories" value={repositories.length} />
                <MiniMetric title="Commits" value={totalCommits} />
                <MiniMetric
                  title="Commit Quality"
                  value={`${Math.round(averageCommitQuality)}/100`}
                />
              </div>

              {careerLoading && (
                <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                  <p className="font-medium text-blue-300">
                    Analyzing developer profile...
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Preparing internship-focused recommendations.
                  </p>
                </div>
              )}

              {careerError && (
                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                  <p className="font-semibold">⚠️ Career Coach Error</p>
                  <p className="mt-1 text-sm">{careerError}</p>
                </div>
              )}

              {careerAdvice && !careerLoading && (
                <div className="mt-7 border-t border-gray-800 pt-7">
                  <h3 className="text-xl font-semibold">💡 Personalized Career Plan</h3>
                  <div className="mt-4 whitespace-pre-line rounded-2xl border border-gray-700/60 bg-gray-800/60 p-5 leading-7 text-gray-300 md:p-6">
                    {careerAdvice}
                  </div>
                </div>
              )}

              {!careerAdvice && !careerLoading && !careerError && (
                <div className="mt-6 rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-5 text-center">
                  <p className="font-medium text-gray-300">Ready for your next step?</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Click “Get Career Advice” to generate a personalized plan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RESUME ANALYZER */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">📄 Resume Analyzer</h2>
              <p className="mt-1 text-gray-500">
                Check internship readiness and get actionable resume improvements.
              </p>
            </div>
            <span className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              ATS Focused
            </span>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-lg shadow-black/10 md:p-7">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-xl">
                    📋
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Analyze Your Resume</h3>
                    <p className="mt-2 max-w-2xl leading-6 text-gray-400">
                      Upload a PDF or DOCX resume. DevLens checks key sections,
                      projects, skills, developer profiles and measurable achievements.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {["PDF supported", "DOCX supported", "Score / 100", "Actionable feedback"].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1.5 text-xs text-gray-400"
                      >
                        ✓ {item}
                      </span>
                    )
                  )}
                </div>
              </div>

              <label className="cursor-pointer">
                <span
                  className={`inline-flex min-w-[180px] items-center justify-center rounded-xl px-5 py-3 font-semibold transition ${
                    resumeLoading
                      ? "cursor-not-allowed bg-gray-700 text-gray-400"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                >
                  {resumeLoading ? "⏳ Analyzing..." : "📤 Upload Resume"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  disabled={resumeLoading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) analyzeResume(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {resumeLoading && (
              <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
                <span className="text-blue-300">Analyzing resume...</span>
                <span className="ml-2 text-gray-500">Please wait</span>
              </div>
            )}

            {resumeError && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-semibold text-red-400">⚠️ Resume Analyzer Error</p>
                <p className="mt-1 text-sm text-red-300/80">{resumeError}</p>
              </div>
            )}

            {resumeScore !== null && (
              <div className="mt-7 border-t border-gray-800 pt-7">
                <div className="flex flex-col gap-7 md:flex-row md:items-center">
                  <div
                    className="relative mx-auto flex h-36 w-36 shrink-0 items-center justify-center rounded-full md:mx-0"
                    style={{
                      background: `conic-gradient(#3b82f6 ${clamp(
                        resumeScore
                      ) * 3.6}deg, #1f2937 0deg)`,
                    }}
                  >
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-gray-800 bg-gray-900">
                      <span className="text-3xl font-bold">{resumeScore}</span>
                      <span className="text-xs text-gray-500">out of 100</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">Resume Analysis Complete</h3>
                    <p className="mt-2 leading-6 text-gray-400">
                      Your resume has been evaluated using DevLens internship-focused checks.
                    </p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${clamp(resumeScore)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {resumeAdvice && (
              <div className="mt-7 border-t border-gray-800 pt-7">
                <h3 className="text-xl font-semibold">💡 Improvement Plan</h3>
                <div className="mt-4 whitespace-pre-line rounded-2xl border border-gray-700/60 bg-gray-800/60 p-5 leading-7 text-gray-300 md:p-6">
                  {resumeAdvice}
                </div>
              </div>
            )}

            {resumeScore === null && !resumeLoading && !resumeError && (
              <div className="mt-6 rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-5 text-center">
                <p className="font-medium text-gray-300">Ready to check your resume?</p>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your PDF or DOCX to receive a score and improvement plan.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* LANGUAGE DISTRIBUTION */}
        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">💻 Language Distribution</h2>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="h-[350px] w-full">
              {languageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  No programming language data available.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* REPOSITORIES */}
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold">
            📦 {githubUsername.trim() ? `@${user.login}'s Repositories` : "Your Repositories"}
          </h2>

          {repositories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900 p-8 text-center text-gray-500">
              No public repositories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {repositories.map((repo) => {
                const score = calculateRepositoryScore(repo);
                const commits = repoCommits[repo.name] || [];
                const stats = commitStats[repo.name];

                return (
                  <div
                    key={repo.id}
                    className="group rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-700 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xl font-semibold">
                            {repo.name}
                          </h3>
                          <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300">
                            {repo.language || "Unknown"}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                        {score.total}/100
                      </span>
                    </div>

                    <p className="mt-3 text-gray-400">
                      {repo.description || "No description available."}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <RepoMetric label="Stars" value={`⭐ ${repo.stargazers_count}`} />
                      <RepoMetric label="Forks" value={`🍴 ${repo.forks_count}`} />
                      <RepoMetric label="Issues" value={`🐛 ${repo.open_issues_count}`} />
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-400">DevLens Quality Score</p>
                        <p className="text-2xl font-bold">{score.total}/100</p>
                      </div>
                      <ScoreBar name="Documentation" value={score.documentation} />
                      <ScoreBar name="Popularity" value={score.popularity} />
                      <ScoreBar name="Community" value={score.community} />
                      <ScoreBar name="Maintenance" value={score.maintenance} />
                      <ScoreBar name="Structure" value={score.structure} />
                    </div>

                    {stats && (
                      <div className="mt-6 border-t border-gray-800 pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">🧠 Commit Intelligence</h3>
                            <p className="mt-1 text-xs text-gray-500">
                              Quality analysis of recent development activity
                            </p>
                          </div>
                          <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400">
                            Analysis
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <MiniMetric title="Commits" value={stats.totalCommits} />
                          <MiniMetric title="Good" value={stats.goodCommits} />
                          <MiniMetric title="Weak" value={stats.weakCommits} />
                        </div>

                        <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm text-gray-400">Overall Commit Quality</p>
                              <p className="mt-1 text-xs text-gray-500">
                                Based on clarity, meaningfulness and consistency
                              </p>
                            </div>
                            <p className="text-2xl font-bold">{stats.qualityScore}/100</p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${clamp(stats.qualityScore)}%` }}
                            />
                          </div>
                        </div>

                        <ScoreBar name="Message Clarity" value={stats.messageClarity} />
                        <ScoreBar name="Meaningfulness" value={stats.meaningfulness} />
                        <ScoreBar name="Conventional Format" value={stats.conventionalFormat} />
                        <ScoreBar name="Commit Length" value={stats.commitLength} />
                        <ScoreBar name="Action Clarity" value={stats.actionClarity} />
                      </div>
                    )}

                    <div className="mt-6 border-t border-gray-800 pt-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">📝 Recent Commits</h3>
                        <span className="text-xs text-gray-500">
                          {commits.length} loaded
                        </span>
                      </div>

                      {commits.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {commits.slice(0, 5).map((commit) => {
                            const isAnalyzing =
                              selectedCommit === commit.message &&
                              commitExplanation === "Analyzing commit...";

                            return (
                              <div
                                key={
                                  commit.sha ||
                                  `${repo.name}-${commit.message}-${commit.date}`
                                }
                                className="rounded-xl border border-gray-800 bg-gray-950/50 p-4"
                              >
                                <p className="font-medium text-white">
                                  {commit.message || "No commit message"}
                                </p>

                                {typeof commit.qualityScore === "number" && (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                      <span className="text-gray-500">Commit Quality</span>
                                      <span className="font-semibold text-gray-300">
                                        {commit.qualityScore}/100
                                        {commit.qualityLabel
                                          ? ` · ${commit.qualityLabel}`
                                          : ""}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
                                      <div
                                        className="h-full rounded-full bg-blue-500"
                                        style={{
                                          width: `${clamp(commit.qualityScore)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <p className="mt-1 text-sm text-gray-400">
                                  👤 {commit.author || "Unknown author"}
                                </p>
                                {commit.date && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    📅 {new Date(commit.date).toLocaleDateString()}
                                  </p>
                                )}
                                {commit.sha && (
                                  <p className="mt-1 text-xs text-gray-600">
                                    {commit.sha.slice(0, 7)}
                                  </p>
                                )}

                                <button
                                  type="button"
                                  onClick={() => explainCommit(commit.message)}
                                  disabled={isAnalyzing}
                                  className="mt-4 w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isAnalyzing ? "⏳ Analyzing..." : "🤖 Explain with AI"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg bg-gray-800 p-4 text-sm text-gray-400">
                          No recent commits found for this repository.
                        </div>
                      )}
                    </div>

                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-block text-blue-400 hover:underline"
                    >
                      View Repository →
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AI COMMIT EXPLANATION */}
        {commitExplanation && (
          <section className="mt-10">
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                      🤖
                    </span>
                    <h2 className="text-xl font-bold">AI Commit Explanation</h2>
                  </div>
                  {selectedCommit && (
                    <p className="mt-3 max-w-3xl text-sm text-gray-400">
                      <span className="text-gray-500">Commit:</span> {selectedCommit}
                    </p>
                  )}
                </div>
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                  AI Insight
                </span>
              </div>
              <div className="mt-5 whitespace-pre-line rounded-xl border border-gray-800 bg-gray-950/70 p-5 leading-7 text-gray-300">
                {commitExplanation}
              </div>
            </div>
          </section>
        )}

        {/* LEETCODE */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">💻 LeetCode Analytics</h2>
            <p className="mt-1 text-sm text-gray-400">
              Analyze problem-solving progress using a LeetCode username.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={leetcodeUsername}
              onChange={(event) => setLeetcodeUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") analyzeLeetCode();
              }}
              placeholder="Enter LeetCode username"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={analyzeLeetCode}
              disabled={leetcodeLoading}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {leetcodeLoading ? "⏳ Analyzing..." : "Analyze"}
            </button>
          </div>

          {leetcodeError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {leetcodeError}
            </div>
          )}

          {leetcodeLoading && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          )}

          {leetcodeStats && !leetcodeLoading && (
            <div className="mt-6">
              <div className="mb-5">
                <h3 className="text-lg font-semibold">@{leetcodeStats.username}</h3>
                <p className="text-sm text-gray-400">
                  LeetCode problem-solving overview
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon="🧩"
                  title="Total Solved"
                  value={leetcodeStats.total_solved}
                  description="Accepted problems"
                />
                <StatCard
                  icon="🟢"
                  title="Easy"
                  value={leetcodeStats.easy}
                  description="Easy problems solved"
                />
                <StatCard
                  icon="🟡"
                  title="Medium"
                  value={leetcodeStats.medium}
                  description="Medium problems solved"
                />
                <StatCard
                  icon="🔴"
                  title="Hard"
                  value={leetcodeStats.hard}
                  description="Hard problems solved"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MiniMetric title="Ranking" value={leetcodeStats.ranking?.toLocaleString() || "N/A"} />
                <MiniMetric title="Reputation" value={leetcodeStats.reputation} />
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-5">
                <h3 className="font-semibold">Difficulty Distribution</h3>
                <DifficultyBar label="Easy" value={leetcodeStats.easy} total={leetcodeStats.total_solved} />
                <DifficultyBar label="Medium" value={leetcodeStats.medium} total={leetcodeStats.total_solved} />
                <DifficultyBar label="Hard" value={leetcodeStats.hard} total={leetcodeStats.total_solved} />
              </div>
            </div>
          )}
        </section>

        {/* LEETCODE SCORE */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">LeetCode Skill Score</p>
              <p className="mt-2 text-4xl font-bold">{leetcodeScore}/100</p>
            </div>
            <div className="text-3xl">💻</div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${leetcodeScore}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Based on solved problems and difficulty distribution
          </p>
        </section>

        {/* DEVELOPER SCORE */}
        <section className="mt-10 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-gray-900 to-gray-950 p-6 md:p-7">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-gray-500">
                Overall Developer Score
              </p>
              <h2 className="mt-2 text-5xl font-bold">{developerScore}/100</h2>
              <p className="mt-2 max-w-2xl text-gray-400">
                Combined score from GitHub quality, commit quality, LeetCode,
                resume strength and internship readiness.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MiniMetric title="GitHub" value={githubScore} />
              <MiniMetric title="Commits" value={commitScore} />
              <MiniMetric title="LeetCode" value={leetcodeScore} />
              <MiniMetric title="Resume" value={resumeScoreValue} />
              <MiniMetric title="Readiness" value={internshipReadiness.score} />
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${developerScore}%` }}
            />
          </div>
        </section>

        {/* FEATURES */}
        <section className="mt-10 pb-10">
          <h2 className="mb-4 text-2xl font-bold">DevLens Analytics</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="GitHub Analytics"
              description="Analyze repositories, commits and coding activity."
              status="active"
            />
            <FeatureCard
              title="LeetCode Analytics"
              description="Track DSA progress and problem-solving activity."
              status="active"
            />
            <FeatureCard
              title="AI Career Coach"
              description="Get personalized career recommendations."
              status="active"
            />
            <FeatureCard
              title="Internship Readiness"
              description="Measure how prepared the developer profile is for internships."
              status="active"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

// =====================================================
// SMALL COMPONENTS
// =====================================================

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-gray-700 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-xl">
          {icon}
        </div>
        <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs font-medium text-green-400">
          Live
        </span>
      </div>
      <p className="mt-5 text-sm text-gray-400">{title}</p>
      <h2 className="mt-1 text-4xl font-bold tracking-tight">
        {value.toLocaleString()}
      </h2>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function AnalyticsCard({
  title,
  value,
  small = false,
}: {
  title: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="group rounded-2xl border border-gray-800 bg-gray-900 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-gray-700 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400">{title}</p>
        <span className="text-xs text-gray-500">Analytics</span>
      </div>
      <h3 className={small ? "mt-4 text-2xl font-bold" : "mt-3 text-4xl font-bold"}>
        {value}
      </h3>
      <div className="mt-4 h-1 w-12 rounded-full bg-blue-500/60 transition-all duration-300 group-hover:w-20" />
    </div>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-800/70 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function RepoMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-200">{value}</p>
    </div>
  );
}

function DifficultyBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? clamp((value / total) * 100) : 0;

  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ScoreBar({
  name,
  value,
  max = 20,
}: {
  name: string;
  value: number;
  max?: number;
}) {
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(max, value))
    : 0;

  const percentage = max > 0 ? (safeValue / max) * 100 : 0;

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm">
        <span>{name}</span>
        <span>
          {Math.round(safeValue)}/{max}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: "active" | "coming-soon";
}) {
  const isActive = status === "active";

  return (
    <div className="group rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:-translate-y-0.5 hover:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold">{title}</h3>
        <span
          className={
            isActive
              ? "shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400"
              : "shrink-0 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-400"
          }
        >
          {isActive ? "Live" : "Soon"}
        </span>
      </div>
      <p className="mt-3 leading-relaxed text-gray-400">{description}</p>
      <div
        className={
          isActive
            ? "mt-5 text-sm font-medium text-blue-400"
            : "mt-5 text-sm font-medium text-gray-500"
        }
      >
        {isActive ? "Available on dashboard ↑" : "Coming soon →"}
      </div>
    </div>
  );
}
