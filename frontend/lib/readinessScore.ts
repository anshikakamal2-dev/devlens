interface ReadinessInput {
  repositories: number;
  totalStars: number;
  totalForks: number;
  averageRepoScore: number;
  averageCommitQuality: number;
  totalCommits: number;
}

export interface ReadinessResult {
  score: number;
  label: string;
  githubActivity: number;
  repositoryQuality: number;
  commitQuality: number;
  projectStrength: number;
  recommendations: string[];
}

export function calculateInternshipReadiness(
  input: ReadinessInput
): ReadinessResult {
  // --------------------------------------------------
  // 1. GitHub Activity - 20 points
  // --------------------------------------------------

  const githubActivity = Math.min(
    20,
    Math.round(
      (input.totalCommits / 100) * 20
    )
  );

  // --------------------------------------------------
  // 2. Repository Quality - 30 points
  // --------------------------------------------------

  const repositoryQuality = Math.min(
    30,
    Math.round(
      (input.averageRepoScore / 100) * 30
    )
  );

  // --------------------------------------------------
  // 3. Commit Quality - 20 points
  // --------------------------------------------------

  const commitQuality = Math.min(
    20,
    Math.round(
      (input.averageCommitQuality / 100) * 20
    )
  );

  // --------------------------------------------------
  // 4. Project Strength - 30 points
  // --------------------------------------------------

  let projectStrength = 0;

  // Number of projects: max 10 points
  projectStrength += Math.min(
    10,
    input.repositories * 2
  );

  // GitHub stars: max 10 points
  projectStrength += Math.min(
    10,
    input.totalStars
  );

  // GitHub forks: max 10 points
  projectStrength += Math.min(
    10,
    input.totalForks * 2
  );

  projectStrength = Math.min(
    30,
    projectStrength
  );

  // --------------------------------------------------
  // Final Score
  // --------------------------------------------------

  const score = Math.min(
    100,
    githubActivity +
      repositoryQuality +
      commitQuality +
      projectStrength
  );

  // --------------------------------------------------
  // Label
  // --------------------------------------------------

  let label = "Beginner";

  if (score >= 90) {
    label = "Excellent";
  } else if (score >= 75) {
    label = "Strong";
  } else if (score >= 60) {
    label = "Good";
  } else if (score >= 40) {
    label = "Needs Improvement";
  }

  // --------------------------------------------------
  // Recommendations
  // --------------------------------------------------

  const recommendations: string[] = [];

  if (input.repositories < 3) {
    recommendations.push(
      "Build at least 3 complete and well-documented projects."
    );
  }

  if (input.averageRepoScore < 60) {
    recommendations.push(
      "Improve repository documentation, structure, README quality and maintenance."
    );
  }

  if (input.averageCommitQuality < 60) {
    recommendations.push(
      "Write clearer, meaningful and consistent commit messages."
    );
  }

  if (input.totalCommits < 50) {
    recommendations.push(
      "Increase consistent coding activity and maintain a regular development workflow."
    );
  }

  if (input.totalStars < 5) {
    recommendations.push(
      "Improve project quality, documentation and presentation to increase GitHub engagement."
    );
  }

  if (input.totalForks < 2) {
    recommendations.push(
      "Build useful projects and improve their documentation to encourage community engagement."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Your GitHub profile shows strong internship readiness. Keep building, solving problems and improving your projects."
    );
  }

  return {
    score,
    label,
    githubActivity,
    repositoryQuality,
    commitQuality,
    projectStrength,
    recommendations,
  };
}