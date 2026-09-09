export interface Commit {
  sha: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      email?: string;
      date?: string;
    };
  };
  html_url: string;
}

export interface CommitStats {
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

export function analyzeCommitMessage(message: string) {
  const firstLine = message?.split("\n")[0]?.trim() ?? "";

  if (!firstLine) {
    return {
      messageClarity: 0,
      meaningfulness: 0,
      conventionalFormat: 0,
      commitLength: 0,
      actionClarity: 0,
      total: 0,
    };
  }

  // -----------------------------
  // Message Clarity - 20
  // -----------------------------
  let messageClarity = 0;

  if (firstLine.length >= 10) messageClarity += 5;
  if (firstLine.length >= 20) messageClarity += 5;
  if (firstLine.split(/\s+/).length >= 4) messageClarity += 5;

  const vagueMessages = [
    "update",
    "updated",
    "changes",
    "change",
    "stuff",
    "work",
    "test",
    "testing",
    "fix",
    "done",
  ];

  if (!vagueMessages.includes(firstLine.toLowerCase())) {
    messageClarity += 5;
  }

  // -----------------------------
  // Meaningfulness - 20
  // -----------------------------
  let meaningfulness = 0;

  if (!vagueMessages.includes(firstLine.toLowerCase())) {
    meaningfulness += 10;
  }

  if (firstLine.split(/\s+/).length >= 5) {
    meaningfulness += 5;
  }

  const technicalKeywords =
    /\b(api|database|db|ui|frontend|backend|auth|login|signup|bug|feature|component|function|route|performance|dashboard|github|commit|resume|leetcode|score|validation|error|fix|deploy|deployment)\b/i;

  if (technicalKeywords.test(firstLine)) {
    meaningfulness += 5;
  }

  // -----------------------------
  // Conventional Commit - 20
  // -----------------------------
  let conventionalFormat = 0;

  const conventionalCommit =
    /^(feat|fix|docs|style|refactor|test|chore|perf|build|ci)(\([^)]+\))?:\s+\S+/i;

  if (conventionalCommit.test(firstLine)) {
    conventionalFormat = 20;
  }

  // -----------------------------
  // Commit Length - 20
  // -----------------------------
  let commitLength = 0;

  if (firstLine.length >= 10) commitLength += 5;
  if (firstLine.length >= 20) commitLength += 5;
  if (firstLine.length >= 30) commitLength += 5;
  if (firstLine.length <= 72) commitLength += 5;

  // -----------------------------
  // Action Clarity - 20
  // -----------------------------
  let actionClarity = 0;

  const actionWords =
    /^(add|added|create|created|implement|implemented|fix|fixed|update|updated|remove|removed|refactor|refactored|improve|improved|handle|handled|support|supported|change|changed|optimize|optimized|build|built|configure|configured|integrate|integrated|upgrade|upgraded)\b/i;

  if (actionWords.test(firstLine)) {
    actionClarity = 20;
  }

  const total =
    messageClarity +
    meaningfulness +
    conventionalFormat +
    commitLength +
    actionClarity;

  return {
    messageClarity,
    meaningfulness,
    conventionalFormat,
    commitLength,
    actionClarity,
    total: Math.min(total, 100),
  };
}

export function analyzeCommits(
  commits: Commit[]
): CommitStats {
  if (!Array.isArray(commits) || commits.length === 0) {
    return {
      totalCommits: 0,
      goodCommits: 0,
      weakCommits: 0,
      qualityScore: 0,
      messageClarity: 0,
      meaningfulness: 0,
      conventionalFormat: 0,
      commitLength: 0,
      actionClarity: 0,
    };
  }

  let totalScore = 0;
  let totalMessageClarity = 0;
  let totalMeaningfulness = 0;
  let totalConventionalFormat = 0;
  let totalCommitLength = 0;
  let totalActionClarity = 0;

  let goodCommits = 0;
  let weakCommits = 0;

  commits.forEach((commit) => {
    const result = analyzeCommitMessage(
      commit?.commit?.message ?? ""
    );

    totalScore += result.total;
    totalMessageClarity += result.messageClarity;
    totalMeaningfulness += result.meaningfulness;
    totalConventionalFormat += result.conventionalFormat;
    totalCommitLength += result.commitLength;
    totalActionClarity += result.actionClarity;

    if (result.total >= 60) {
      goodCommits++;
    } else {
      weakCommits++;
    }
  });

  const count = commits.length;

  return {
    totalCommits: count,
    goodCommits,
    weakCommits,

    qualityScore: Math.round(totalScore / count),

    messageClarity: Math.round(
      totalMessageClarity / count
    ),

    meaningfulness: Math.round(
      totalMeaningfulness / count
    ),

    conventionalFormat: Math.round(
      totalConventionalFormat / count
    ),

    commitLength: Math.round(
      totalCommitLength / count
    ),

    actionClarity: Math.round(
      totalActionClarity / count
    ),
  };
}