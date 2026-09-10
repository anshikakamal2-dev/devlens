"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { calculateRepositoryScore } from "@/lib/repoScore";
import { analyzeCommits } from "@/lib/commitScore";
import { calculateInternshipReadiness } from "@/lib/readinessScore";

// ============================================================
// TYPES
// ============================================================

interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  fork: boolean;
}

interface GithubCommit {
  sha: string;
  html_url: string;

  commit: {
    message: string;

    author: {
      name: string;
      email: string;
      date: string;
    } | null;
  };

  author: {
    login: string;
    avatar_url: string;
  } | null;
}

interface CommitStats {
  totalCommits: number;
  goodCommits: number;
  weakCommits: number;
  qualityScore: number;
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

// ============================================================
// CONSTANTS
// ============================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://devlens-ajdn.onrender.com";

const MAX_REPOS_TO_ANALYZE = 10;

const PIE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

// ============================================================
// HELPERS
// ============================================================

function safeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function clamp(
  value: number,
  min = 0,
  max = 100
): number {
  return Math.min(
    max,
    Math.max(
      min,
      Number.isFinite(value) ? value : 0
    )
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(
    safeNumber(value)
  );
}

function formatDate(date: string | null): string {
  if (!date) {
    return "Not available";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncateText(
  text: string,
  maxLength = 100
): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function getScoreLabel(score: number): string {
  if (score >= 85) {
    return "Excellent";
  }

  if (score >= 70) {
    return "Strong";
  }

  if (score >= 55) {
    return "Good";
  }

  if (score >= 40) {
    return "Developing";
  }

  return "Needs Improvement";
}

function getScoreTextClass(score: number): string {
  if (score >= 85) {
    return "text-green-400";
  }

  if (score >= 70) {
    return "text-blue-400";
  }

  if (score >= 55) {
    return "text-yellow-400";
  }

  if (score >= 40) {
    return "text-orange-400";
  }

  return "text-red-400";
}

// ============================================================
// LEETCODE SCORE
// ============================================================

function calculateLeetCodeScore(
  stats: LeetCodeStats
): number {
  const solvedScore = Math.min(
    safeNumber(stats.total_solved) * 0.15,
    45
  );

  const easyScore = Math.min(
    safeNumber(stats.easy) * 0.1,
    10
  );

  const mediumScore = Math.min(
    safeNumber(stats.medium) * 0.2,
    20
  );

  const hardScore = Math.min(
    safeNumber(stats.hard) * 0.4,
    15
  );

  const ranking = safeNumber(stats.ranking);

  const rankingScore =
    ranking > 0
      ? Math.max(
          0,
          Math.min(
            10,
            10 - Math.log10(Math.max(1, ranking))
          )
        )
      : 0;

  return Math.round(
    clamp(
      solvedScore +
        easyScore +
        mediumScore +
        hardScore +
        rankingScore
    )
  );
}

// ============================================================
// DEVELOPER SCORE
// ============================================================

function calculateDeveloperScore({
  githubScore,
  commitScore,
  leetcodeScore,
  resumeScore,
  internshipScore,
  hasGithub,
  hasCommits,
  hasLeetCode,
  hasResume,
  hasInternship,
}: {
  githubScore: number;
  commitScore: number;
  leetcodeScore: number;
  resumeScore: number;
  internshipScore: number;
  hasGithub: boolean;
  hasCommits: boolean;
  hasLeetCode: boolean;
  hasResume: boolean;
  hasInternship: boolean;
}): number {
  const components = [
    {
      score: githubScore,
      weight: 0.2,
      available: hasGithub,
    },
    {
      score: commitScore,
      weight: 0.2,
      available: hasCommits,
    },
    {
      score: leetcodeScore,
      weight: 0.25,
      available: hasLeetCode,
    },
    {
      score: resumeScore,
      weight: 0.2,
      available: hasResume,
    },
    {
      score: internshipScore,
      weight: 0.15,
      available: hasInternship,
    },
  ];

  const availableComponents = components.filter(
    (component) => component.available
  );

  if (availableComponents.length === 0) {
    return 0;
  }

  const totalWeight = availableComponents.reduce(
    (sum, component) => sum + component.weight,
    0
  );

  const score = availableComponents.reduce(
    (sum, component) =>
      sum +
      component.score *
        (component.weight / totalWeight),
    0
  );

  return Math.round(clamp(score));
}

// ============================================================
// SMALL UI COMPONENTS
// ============================================================

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-white">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">
          {subtitle}
        </p>
      )}
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
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-center">
      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({
  score,
}: {
  score: number;
}) {
  return (
    <span
      className={`text-sm font-semibold ${getScoreTextClass(
        score
      )}`}
    >
      {Math.round(score)}/100
    </span>
  );
}

function DeveloperScoreBar({
  name,
  value,
}: {
  name: string;
  value: number | null;
}) {
  const available = value !== null;

  const safeValue = available
    ? clamp(value)
    : 0;

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-300">
          {name}
        </span>

        <span className="font-semibold text-gray-200">
          {available
            ? `${Math.round(safeValue)}/100`
            : "Not analyzed"}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

function LoadingBox({
  text = "Loading...",
}: {
  text?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
      <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />

      <p className="text-sm text-gray-400">
        {text}
      </p>
    </div>
  );
}

function EmptyBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-8 text-center">
      <p className="text-sm text-gray-500">
        {text}
      </p>
    </div>
  );
}

function ErrorBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
      {text}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {
  // ==========================================================
  // GITHUB STATE
  // ==========================================================

  const [user, setUser] =
    useState<GithubUser | null>(null);

  const [repositories, setRepositories] =
    useState<GithubRepository[]>([]);

  const [repoCommits, setRepoCommits] =
    useState<Record<string, GithubCommit[]>>({});

  const [commitStats, setCommitStats] =
    useState<Record<string, CommitStats>>({});

  const [selectedCommit, setSelectedCommit] =
    useState<string | null>(null);

  const [commitExplanation, setCommitExplanation] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // ==========================================================
  // GITHUB SEARCH
  // ==========================================================

  const [githubUsername, setGithubUsername] =
    useState("");

  const [githubSearchLoading, setGithubSearchLoading] =
    useState(false);

  const [githubSearchError, setGithubSearchError] =
    useState("");

  // ==========================================================
  // CAREER COACH
  // ==========================================================

  const [careerAdvice, setCareerAdvice] =
    useState("");

  const [careerLoading, setCareerLoading] =
    useState(false);

  const [careerError, setCareerError] =
    useState("");

  // ==========================================================
  // RESUME
  // ==========================================================

  const [resumeScore, setResumeScore] =
    useState<number | null>(null);

  const [resumeAdvice, setResumeAdvice] =
    useState("");

  const [resumeLoading, setResumeLoading] =
    useState(false);

  const [resumeError, setResumeError] =
    useState("");

  // ==========================================================
  // LEETCODE
  // ==========================================================

  const [leetcodeUsername, setLeetcodeUsername] =
    useState("");

  const [leetcodeStats, setLeetcodeStats] =
    useState<LeetCodeStats | null>(null);

  const [leetcodeLoading, setLeetcodeLoading] =
    useState(false);

  const [leetcodeError, setLeetcodeError] =
    useState("");

  const [leetcodeScore, setLeetcodeScore] =
    useState(0);

  // ==========================================================
  // LOAD AUTHENTICATED GITHUB DATA
  // ==========================================================

useEffect(() => {
  let cancelled = false;

  const loadGithubData = async () => {
    try {
      if (!cancelled) {
        setLoading(true);
        setError("");
      }

      const [userResponse, repoResponse] = await Promise.all([
        fetch("/api/github/user", {
          cache: "no-store",
        }),

        fetch("/api/github/repos", {
          cache: "no-store",
        }),
      ]);

      const userData = await userResponse.json().catch(() => ({}));
      const repoData = await repoResponse.json().catch(() => ({}));

      if (!userResponse.ok) {
        throw new Error(
          userData?.error || "Unable to fetch GitHub user."
        );
      }

      if (!repoResponse.ok) {
        throw new Error(
          repoData?.error || "Unable to fetch GitHub repositories."
        );
      }

      const repos = Array.isArray(repoData)
        ? repoData
        : Array.isArray(repoData?.repositories)
          ? repoData.repositories
          : [];

      if (!cancelled) {
        setUser(userData);
        setRepositories(repos);
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
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadGithubData();

  return () => {
    cancelled = true;
  };
}, []);


  
  // ==========================================================
  // FETCH REPOSITORY COMMITS
  // ==========================================================

  async function fetchRepositoryCommits(
    repo: GithubRepository
  ) {
    try {
      const owner =
        user?.login ||
        repo.full_name.split("/")[0];

      const response = await fetch(
        `/api/github/commits?owner=${encodeURIComponent(
          owner
        )}&repo=${encodeURIComponent(
          repo.name
        )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response
          .json()
          .catch(() => []);

      if (!response.ok) {
        console.error(
          `Failed to fetch commits for ${repo.name}:`,
          data
        );

        return;
      }

      if (!Array.isArray(data)) {
        return;
      }

      setRepoCommits((previous) => ({
        ...previous,
        [repo.name]: data,
      }));

      const stats =
        analyzeCommits(data);

      setCommitStats((previous) => ({
        ...previous,
        [repo.name]: stats,
      }));
    } catch (err) {
      console.error(
        `Commit fetch error for ${repo.name}:`,
        err
      );
    }
  }

  useEffect(() => {
    if (
      !user ||
      repositories.length === 0
    ) {
      return;
    }

    const reposToAnalyze =
      repositories
        .filter((repo) => !repo.fork)
        .slice(
          0,
          MAX_REPOS_TO_ANALYZE
        );

    reposToAnalyze.forEach((repo) => {
      if (!repoCommits[repo.name]) {
        fetchRepositoryCommits(repo);
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, repositories]);

  // ==========================================================
  // GITHUB PUBLIC USER SEARCH
  // ==========================================================

  async function searchGithubUser() {
    const username =
      githubUsername.trim();

    if (!username) {
      setGithubSearchError(
        "Please enter a GitHub username."
      );

      return;
    }

    try {
      setGithubSearchLoading(true);
      setGithubSearchError("");

      const response = await fetch(
        `/api/github/public/${encodeURIComponent(
          username
        )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to analyze GitHub profile."
        );
      }

      const githubUser =
        data?.user;

      const githubRepos =
        Array.isArray(
          data?.repositories
        )
          ? data.repositories
          : [];

      if (!githubUser) {
        throw new Error(
          "Invalid GitHub profile data received."
        );
      }

      // Update searched user's profile
      setUser(githubUser);

      // Update searched user's repositories
      setRepositories(githubRepos);

      // Reset old analytics
      setRepoCommits({});
      setCommitStats({});

      // Reset selected commit
      setSelectedCommit(null);
      setCommitExplanation("");
    } catch (err) {
      console.error(
        "GitHub profile search error:",
        err
      );

      setGithubSearchError(
        err instanceof Error
          ? err.message
          : "Unable to analyze GitHub profile."
      );
    } finally {
      setGithubSearchLoading(false);
    }
  }

  // ==========================================================
  // AI COMMIT EXPLANATION
  // ==========================================================

  async function explainCommit(
    message: string
  ) {
    try {
      setSelectedCommit(message);
      setCommitExplanation(
        "Analyzing commit..."
      );

      const response = await fetch(
        `${API_BASE_URL}/api/ai/explain-commit`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setCommitExplanation(
          "The AI service could not process this request. Please try again."
        );

        return;
      }

      setCommitExplanation(
        typeof data?.explanation ===
          "string"
          ? data.explanation
          : typeof data?.message ===
              "string"
            ? data.message
            : "No explanation was returned."
      );
    } catch (err) {
      console.error(
        "AI connection error:",
        err
      );

      setCommitExplanation(
        "Unable to connect to the DevLens backend."
      );
    }
  }

  // ==========================================================
  // LEETCODE ANALYZER
  // ==========================================================

  async function analyzeLeetCode() {
    const username =
      leetcodeUsername.trim();

    if (!username) {
      setLeetcodeError(
        "Please enter a LeetCode username."
      );

      setLeetcodeStats(null);
      setLeetcodeScore(0);

      return;
    }

    try {
      setLeetcodeLoading(true);
      setLeetcodeError("");
      setLeetcodeStats(null);

      const response = await fetch(
        `${API_BASE_URL}/api/leetcode/${encodeURIComponent(
          username
        )}`
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.detail ===
            "string"
            ? data.detail
            : "Unable to fetch LeetCode statistics."
        );
      }

      const stats =
        data as LeetCodeStats;

      const score =
        calculateLeetCodeScore(stats);

      setLeetcodeScore(score);
      setLeetcodeStats(stats);
    } catch (err) {
      console.error(
        "LeetCode analysis error:",
        err
      );

      setLeetcodeError(
        err instanceof Error
          ? err.message
          : "Unable to fetch LeetCode statistics."
      );

      setLeetcodeStats(null);
      setLeetcodeScore(0);
    } finally {
      setLeetcodeLoading(false);
    }
  }

  // ==========================================================
  // RESUME ANALYZER
  // ==========================================================

  async function analyzeResume(
    file: File
  ) {
    const filename =
      file.name.toLowerCase();

    if (
      !filename.endsWith(".pdf") &&
      !filename.endsWith(".docx")
    ) {
      setResumeError(
        "Only PDF and DOCX files are supported."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setResumeError(
        "Resume file is too large. Maximum size is 5 MB."
      );

      return;
    }

    try {
      setResumeLoading(true);
      setResumeError("");
      setResumeScore(null);
      setResumeAdvice("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response = await fetch(
        `${API_BASE_URL}/api/resume/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.detail ===
            "string"
            ? data.detail
            : "Unable to analyze resume."
        );
      }

      setResumeScore(
        typeof data?.score ===
          "number"
          ? clamp(data.score)
          : null
      );

      setResumeAdvice(
        typeof data?.advice ===
          "string"
          ? data.advice
          : "No resume advice was returned."
      );
    } catch (err) {
      console.error(
        "Resume Analyzer Error:",
        err
      );

      setResumeError(
        err instanceof Error
          ? err.message
          : "Unable to analyze resume."
      );
    } finally {
      setResumeLoading(false);
    }
  }

  // ==========================================================
  // ANALYTICS
  // ==========================================================

  const repositoryScores =
    useMemo(
      () =>
        repositories.map((repo) =>
          calculateRepositoryScore(repo)
        ),
      [repositories]
    );

  const averageRepoScore =
    repositoryScores.length > 0
      ? repositoryScores.reduce(
          (sum, score) =>
            sum + safeNumber(score.total),
          0
        ) /
        repositoryScores.length
      : 0;

  const allCommitStats =
    Object.values(commitStats);

  const totalCommits =
    allCommitStats.reduce(
      (sum, stats) =>
        sum +
        safeNumber(
          stats.totalCommits
        ),
      0
    );

  const totalCommitQualityPoints =
    allCommitStats.reduce(
      (sum, stats) =>
        sum +
        safeNumber(
          stats.qualityScore
        ) *
          safeNumber(
            stats.totalCommits
          ),
      0
    );

  const averageCommitQuality =
    totalCommits > 0
      ? totalCommitQualityPoints /
        totalCommits
      : 0;

  const totalGoodCommits =
    allCommitStats.reduce(
      (sum, stats) =>
        sum +
        safeNumber(
          stats.goodCommits
        ),
      0
    );

  const totalWeakCommits =
    allCommitStats.reduce(
      (sum, stats) =>
        sum +
        safeNumber(
          stats.weakCommits
        ),
      0
    );

  const totalStars =
    repositories.reduce(
      (sum, repo) =>
        sum +
        safeNumber(
          repo.stargazers_count
        ),
      0
    );

  const totalForks =
    repositories.reduce(
      (sum, repo) =>
        sum +
        safeNumber(
          repo.forks_count
        ),
      0
    );

  // ==========================================================
  // LANGUAGE ANALYTICS
  // ==========================================================

  const languageData =
    useMemo(() => {
      const languageCount: Record<
        string,
        number
      > = {};

      repositories.forEach(
        (repo) => {
          if (!repo.language) {
            return;
          }

          languageCount[repo.language] =
            (languageCount[
              repo.language
            ] || 0) + 1;
        }
      );

      return Object.entries(
        languageCount
      ).map(
        ([name, value]) => ({
          name,
          value,
        })
      );
    }, [repositories]);

  const mostUsedLanguage =
    languageData.length > 0
      ? [...languageData].sort(
          (a, b) =>
            b.value - a.value
        )[0]?.name ||
        "Not available"
      : "Not available";

  // ==========================================================
  // INTERNSHIP READINESS
  // ==========================================================

  const internshipReadiness =
    calculateInternshipReadiness({
      repositories:
        repositories.length,

      totalStars,

      totalForks,

      averageRepoScore,

      averageCommitQuality,

      totalCommits,
    });

  // ==========================================================
  // DEVELOPER SCORE
  // ==========================================================

  const githubScore = clamp(
    Math.round(
      averageRepoScore * 0.7 +
        Math.min(
          totalStars * 2,
          20
        ) +
        Math.min(
          totalForks * 2,
          10
        )
    )
  );

  const commitScore = clamp(
    Math.round(
      averageCommitQuality
    )
  );

  const resumeScoreValue =
    resumeScore ?? 0;

  const developerScore =
    calculateDeveloperScore({
      githubScore,

      commitScore,

      leetcodeScore,

      resumeScore:
        resumeScoreValue,

      internshipScore:
        internshipReadiness.score,

      hasGithub:
        user !== null,

      hasCommits:
        totalCommits > 0,

      hasLeetCode:
        leetcodeStats !== null,

      hasResume:
        resumeScore !== null,

      hasInternship: true,
    });

  const developerScoreLabel =
    getScoreLabel(
      developerScore
    );

  // ==========================================================
  // AI CAREER COACH
  // ==========================================================

  async function getCareerAdvice() {
    try {
      setCareerLoading(true);
      setCareerError("");
      setCareerAdvice("");

      const response = await fetch(
        `${API_BASE_URL}/api/ai/career-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            readiness_score:
              Math.round(
                internshipReadiness.score
              ),

            readiness_label:
              internshipReadiness.label,

            repositories:
              repositories.length,

            total_stars:
              totalStars,

            total_forks:
              totalForks,

            total_commits:
              totalCommits,

            average_repo_score:
              averageRepoScore,

            average_commit_quality:
              averageCommitQuality,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.detail ===
            "string"
            ? data.detail
            : "Unable to generate career advice."
        );
      }

      setCareerAdvice(
        typeof data?.advice ===
          "string"
          ? data.advice
          : "No career advice was returned."
      );
    } catch (err) {
      console.error(
        "Career Coach Error:",
        err
      );

      setCareerError(
        err instanceof Error
          ? err.message
          : "Unable to generate career advice."
      );
    } finally {
      setCareerLoading(false);
    }
  }

  // ==========================================================
  // RECENT COMMITS
  // ==========================================================

  const recentCommits =
    Object.entries(repoCommits)
      .flatMap(
        ([repoName, commits]) =>
          commits.map(
            (commit) => ({
              repoName,
              commit,
            })
          )
      )
      .sort(
        (a, b) =>
          new Date(
            b.commit.commit.author?.date ||
              0
          ).getTime() -
          new Date(
            a.commit.commit.author?.date ||
              0
          ).getTime()
      )
      .slice(0, 10);

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <h1 className="text-4xl font-bold">
              DevLens
            </h1>

            <p className="mt-2 text-gray-500">
              AI Software Engineer Dashboard
            </p>
          </div>

          <LoadingBox
            text="Loading your GitHub profile..."
          />
        </div>
      </main>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
              DevLens
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              AI Software Engineer Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Analyze GitHub activity, coding
              performance, resume strength and
              internship readiness in one place.
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-10 w-10 rounded-full"
              />

              <div>
                <p className="font-semibold">
                  {user.name ||
                    user.login}
                </p>

                <p className="text-xs text-gray-500">
                  @{user.login}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* ==================================================
            GLOBAL ERROR
        ================================================== */}

        {error && (
          <div className="mb-8">
            <ErrorBox text={error} />
          </div>
        )}

        {/* ==================================================
            GITHUB PROFILE SEARCH
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-6">
          <SectionTitle
            title="GitHub Profile Search"
            description="Analyze any public GitHub profile."
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={githubUsername}
              onChange={(event) =>
                setGithubUsername(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  searchGithubUser();
                }
              }}
              placeholder="Enter GitHub username"
              className="flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            />

            <button
              onClick={
                searchGithubUser
              }
              disabled={
                githubSearchLoading
              }
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {githubSearchLoading
                ? "Searching..."
                : "Analyze GitHub"}
            </button>
          </div>

          {githubSearchError && (
            <div className="mt-4">
              <ErrorBox
                text={
                  githubSearchError
                }
              />
            </div>
          )}
        </section>

        {/* ==================================================
            PROFILE
        ================================================== */}

        {user && (
          <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-24 w-24 rounded-2xl"
              />

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">
                    {user.name ||
                      user.login}
                  </h2>

                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    View GitHub →
                  </a>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  @{user.login}
                </p>

                {user.bio && (
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                    {user.bio}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MiniMetric
                  title="Repos"
                  value={
                    user.public_repos
                  }
                />

                <MiniMetric
                  title="Followers"
                  value={
                    user.followers
                  }
                />

                <MiniMetric
                  title="Following"
                  value={
                    user.following
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* ==================================================
            OVERALL DEVELOPER SCORE
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-lg md:p-7">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-sm uppercase tracking-wider text-gray-500">
                Overall Developer Score
              </p>

              <div className="mt-2 flex items-end gap-2">
                <h2 className="text-5xl font-bold tracking-tight">
                  {developerScore}
                </h2>

                <span className="mb-1 text-lg text-gray-500">
                  /100
                </span>
              </div>

              <p
                className={`mt-2 text-lg font-semibold ${getScoreTextClass(
                  developerScore
                )}`}
              >
                {developerScoreLabel}
              </p>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Combined score from GitHub quality,
                commit quality, LeetCode, resume
                strength and internship readiness.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MiniMetric
                title="GitHub"
                value={githubScore}
              />

              <MiniMetric
                title="Commits"
                value={commitScore}
              />

              <MiniMetric
                title="LeetCode"
                value={leetcodeScore}
              />

              <MiniMetric
                title="Resume"
                value={
                  resumeScore !== null
                    ? resumeScoreValue
                    : "N/A"
                }
              />

              <MiniMetric
                title="Readiness"
                value={Math.round(
                  internshipReadiness.score
                )}
              />
            </div>
          </div>

          {/* SCORE PROGRESS */}

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Developer Score
              </span>

              <span className="font-semibold text-gray-200">
                {developerScore}/100
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-700"
                style={{
                  width: `${clamp(
                    developerScore
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* SCORE BREAKDOWN */}

          <div className="mt-8 border-t border-gray-800 pt-7">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">
                📊 Score Breakdown
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Each available section contributes
                according to its importance.
              </p>
            </div>

            <DeveloperScoreBar
              name="GitHub Quality"
              value={
                user
                  ? githubScore
                  : null
              }
            />

            <DeveloperScoreBar
              name="Commit Quality"
              value={
                totalCommits > 0
                  ? commitScore
                  : null
              }
            />

            <DeveloperScoreBar
              name="LeetCode"
              value={
                leetcodeStats
                  ? leetcodeScore
                  : null
              }
            />

            <DeveloperScoreBar
              name="Resume"
              value={
                resumeScore !== null
                  ? resumeScore
                  : null
              }
            />

            <DeveloperScoreBar
              name="Internship Readiness"
              value={Math.round(
                internshipReadiness.score
              )}
            />
          </div>
        </section>

        {/* ==================================================
            DEVELOPER OVERVIEW
        ================================================== */}

        <section className="mb-8">
          <SectionTitle
            title="Developer Overview"
            description="Quick snapshot of your engineering activity."
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              title="Repositories"
              value={
                repositories.length
              }
              subtitle="Public repositories"
            />

            <StatCard
              title="Commits"
              value={formatNumber(
                totalCommits
              )}
              subtitle="Analyzed commits"
            />

            <StatCard
              title="Stars"
              value={formatNumber(
                totalStars
              )}
              subtitle="Total repository stars"
            />

            <StatCard
              title="Forks"
              value={formatNumber(
                totalForks
              )}
              subtitle="Total repository forks"
            />
          </div>
        </section>

        {/* ==================================================
            GITHUB ANALYTICS
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="GitHub Analytics"
            description="Repository quality and development activity."
          />

          <div className="grid gap-5 md:grid-cols-3">
            <StatCard
              title="Average Repository Score"
              value={`${Math.round(
                averageRepoScore
              )}/100`}
            />

            <StatCard
              title="Average Commit Quality"
              value={`${Math.round(
                averageCommitQuality
              )}/100`}
            />

            <StatCard
              title="Most Used Language"
              value={
                mostUsedLanguage
              }
            />
          </div>
        </section>

        {/* ==================================================
            PROGRAMMING LANGUAGES
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="Programming Languages"
            description="Languages used across your repositories."
          />

          {languageData.length === 0 ? (
            <EmptyBox
              text="No programming language data available."
            />
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={languageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    label
                  >
                    {languageData.map(
                      (_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* ==================================================
            REPOSITORIES
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="Repositories"
            description="Repository-wise quality analysis."
          />

          {repositories.length === 0 ? (
            <EmptyBox
              text="No repositories found."
            />
          ) : (
            <div className="space-y-4">
              {repositories
                .slice(0, 12)
                .map((repo) => {
                  const score =
                    calculateRepositoryScore(
                      repo
                    );

                  return (
                    <div
                      key={repo.id}
                      className="rounded-xl border border-gray-800 bg-gray-950 p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <a
                              href={
                                repo.html_url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-lg font-semibold text-blue-400 hover:underline"
                            >
                              {repo.name}
                            </a>

                            {repo.language && (
                              <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
                                {
                                  repo.language
                                }
                              </span>
                            )}

                            {repo.fork && (
                              <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                                Fork
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            {repo.description ||
                              "No description provided."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>
                              ⭐{" "}
                              {
                                repo.stargazers_count
                              }
                            </span>

                            <span>
                              🍴{" "}
                              {
                                repo.forks_count
                              }
                            </span>

                            <span>
                              Issues:{" "}
                              {
                                repo.open_issues_count
                              }
                            </span>

                            <span>
                              Updated:{" "}
                              {formatDate(
                                repo.updated_at
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-left md:text-right">
                          <p className="text-xs text-gray-500">
                            Repository Score
                          </p>

                          <p className="mt-1 text-3xl font-bold">
                            {Math.round(
                              safeNumber(
                                score.total
                              )
                            )}
                          </p>

                          <ScoreBadge
                            score={safeNumber(
                              score.total
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* ==================================================
            COMMIT INTELLIGENCE
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="Commit Intelligence"
            description="Analyze the quality and consistency of your Git commits."
          />

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total Commits"
              value={formatNumber(
                totalCommits
              )}
            />

            <StatCard
              title="Good Commits"
              value={formatNumber(
                totalGoodCommits
              )}
            />

            <StatCard
              title="Weak Commits"
              value={formatNumber(
                totalWeakCommits
              )}
            />

            <StatCard
              title="Quality"
              value={`${Math.round(
                averageCommitQuality
              )}/100`}
            />
          </div>
        </section>

        {/* ==================================================
            RECENT COMMITS
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="Recent Commits"
            description="Click a commit to generate an explanation."
          />

          {recentCommits.length === 0 ? (
            <EmptyBox
              text="No commit data available yet."
            />
          ) : (
            <div className="space-y-3">
              {recentCommits.map(
                ({
                  repoName,
                  commit,
                }) => {
                  const message =
                    commit.commit.message;

                  // FIXED:
                  // Previously stats was undefined.
                  const stats =
                    commitStats[
                      repoName
                    ];

                  const quality =
                    safeNumber(
                      stats?.qualityScore
                    );

                  return (
                    <div
                      key={`${repoName}-${commit.sha}`}
                      className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                              {
                                repoName
                              }
                            </span>

                            <span
                              className={`rounded-md px-2 py-1 text-xs ${
                                quality >= 70
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}
                            >
                              Quality{" "}
                              {Math.round(
                                quality
                              )}
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-gray-300">
                            {truncateText(
                              message,
                              140
                            )}
                          </p>

                          <p className="mt-2 text-xs text-gray-600">
                            {formatDate(
                              commit
                                .commit
                                .author
                                ?.date ||
                                null
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            explainCommit(
                              message
                            )
                          }
                          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-blue-500 hover:text-blue-400"
                        >
                          Explain with AI
                        </button>
                      </div>

                      {selectedCommit ===
                        message && (
                        <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                            AI Explanation
                          </p>

                          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
                            {
                              commitExplanation
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ==================================================
            LEETCODE ANALYZER
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="LeetCode Analyzer"
            description="Analyze problem-solving activity and generate a coding score."
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={
                leetcodeUsername
              }
              onChange={(event) =>
                setLeetcodeUsername(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  analyzeLeetCode();
                }
              }}
              placeholder="Enter LeetCode username"
              className="flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              onClick={
                analyzeLeetCode
              }
              disabled={
                leetcodeLoading
              }
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {leetcodeLoading
                ? "Analyzing..."
                : "Analyze LeetCode"}
            </button>
          </div>

          {leetcodeError && (
            <div className="mt-4">
              <ErrorBox
                text={
                  leetcodeError
                }
              />
            </div>
          )}

          {leetcodeStats && (
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <StatCard
                  title="Score"
                  value={`${leetcodeScore}/100`}
                />

                <StatCard
                  title="Solved"
                  value={
                    leetcodeStats.total_solved
                  }
                />

                <StatCard
                  title="Easy"
                  value={
                    leetcodeStats.easy
                  }
                />

                <StatCard
                  title="Medium"
                  value={
                    leetcodeStats.medium
                  }
                />

                <StatCard
                  title="Hard"
                  value={
                    leetcodeStats.hard
                  }
                />
              </div>

              <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950 p-5">
                <div className="flex flex-wrap justify-between gap-5">
                  <div>
                    <p className="text-sm text-gray-500">
                      Username
                    </p>

                    <p className="mt-1 font-semibold">
                      @
                      {
                        leetcodeStats.username
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Ranking
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatNumber(
                        leetcodeStats.ranking
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Reputation
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatNumber(
                        leetcodeStats.reputation
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ==================================================
            AI RESUME ANALYZER
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="AI Resume Analyzer"
            description="Upload your resume and get an internship-focused score."
          />

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-950 p-8 text-center transition hover:border-blue-500">
            <span className="text-3xl">
              📄
            </span>

            <span className="mt-3 font-semibold">
              Upload Resume
            </span>

            <span className="mt-1 text-xs text-gray-500">
              PDF or DOCX • Maximum 5 MB
            </span>

            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  analyzeResume(file);
                }
              }}
            />
          </label>

          {resumeLoading && (
            <div className="mt-5">
              <LoadingBox
                text="Analyzing your resume..."
              />
            </div>
          )}

          {resumeError && (
            <div className="mt-5">
              <ErrorBox
                text={resumeError}
              />
            </div>
          )}

          {resumeScore !== null &&
            !resumeLoading && (
              <div className="mt-6">
                <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6">

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        Resume Score
                      </p>

                      <p className="mt-1 text-5xl font-bold">
                        {Math.round(
                          resumeScore
                        )}

                        <span className="text-lg text-gray-600">
                          /100
                        </span>
                      </p>

                      <p
                        className={`mt-2 font-semibold ${getScoreTextClass(
                          resumeScore
                        )}`}
                      >
                        {getScoreLabel(
                          resumeScore
                        )}
                      </p>
                    </div>

                    <div className="w-full max-w-md">
                      <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${clamp(
                              resumeScore
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {resumeAdvice && (
                    <div className="mt-6 border-t border-gray-800 pt-5">
                      <p className="mb-2 text-sm font-semibold text-blue-400">
                        Resume Feedback
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-gray-400">
                        {
                          resumeAdvice
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
        </section>

        {/* ==================================================
            INTERNSHIP READINESS
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <SectionTitle
            title="Internship Readiness"
            description="Estimate how prepared your current developer profile is for internships."
          />

          <div className="grid gap-6 md:grid-cols-[220px_1fr]">

            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-gray-950 p-6">
              <p className="text-5xl font-bold">
                {Math.round(
                  internshipReadiness.score
                )}
              </p>

              <p className="mt-1 text-gray-600">
                /100
              </p>

              <p
                className={`mt-3 font-semibold ${getScoreTextClass(
                  internshipReadiness.score
                )}`}
              >
                {
                  internshipReadiness.label
                }
              </p>
            </div>

            <div>
              <DeveloperScoreBar
                name="Repository Quality"
                value={clamp(
                  averageRepoScore
                )}
              />

              <DeveloperScoreBar
                name="Commit Quality"
                value={
                  totalCommits > 0
                    ? clamp(
                        averageCommitQuality
                      )
                    : null
                }
              />

              <DeveloperScoreBar
                name="Project Experience"
                value={clamp(
                  repositories.length *
                    15
                )}
              />

              <DeveloperScoreBar
                name="Community Reach"
                value={clamp(
                  totalStars * 5 +
                    totalForks * 3
                )}
              />
            </div>
          </div>
        </section>

        {/* ==================================================
            AI CAREER COACH
        ================================================== */}

        <section className="mb-8 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-gray-900 p-6">
          <SectionTitle
            title="🤖 AI Career Coach"
            description="Get personalized recommendations based on your current developer profile."
          />

          <button
            onClick={
              getCareerAdvice
            }
            disabled={careerLoading}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {careerLoading
              ? "Generating advice..."
              : "Get Career Advice"}
          </button>

          {careerError && (
            <div className="mt-5">
              <ErrorBox
                text={careerError}
              />
            </div>
          )}

          {careerAdvice && (
            <div className="mt-5 rounded-2xl border border-gray-800 bg-gray-950 p-6">
              <p className="mb-3 text-sm font-semibold text-blue-400">
                Career Recommendations
              </p>

              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-300">
                {careerAdvice}
              </p>
            </div>
          )}
        </section>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="border-t border-gray-800 py-8 text-center">
          <p className="text-sm text-gray-600">
            DevLens • AI Software Engineer Dashboard
          </p>

          <p className="mt-1 text-xs text-gray-700">
            Built with Next.js, FastAPI,
            GitHub, LeetCode & AI
          </p>
        </footer>
      </div>
    </main>
  );
}