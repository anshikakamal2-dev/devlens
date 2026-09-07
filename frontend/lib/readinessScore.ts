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
  // -------------------------------
  // GitHub Activity - 25 points
  // -------------------------------

  const githubActivity = Math.min(
    25,
    Math.round(
      (input.totalCommits / 100) * 25
    )
  );

  // -------------------------------
  // Repository Quality - 25 points
  // -------------------------------

  const repositoryQuality = Math.min(
    25,
    Math.round(
      (input.averageRepoScore / 100) * 25
    )
  );

  // -------------------------------
  // Commit Quality - 25 points
  // -------------------------------

  const commitQuality = Math.min(
    25,
    Math.round(
      (input.averageCommitQuality / 100) * 25
    )
  );

  // -------------------------------
  // Project Strength - 25 points
  // -------------------------------

  let projectStrength = 0;

  projectStrength += Math.min(
    10,
    input.repositories * 2
  );

  projectStrength += Math.min(
    8,
    input.totalStars
  );

  projectStrength += Math.min(
    7,
    input.totalForks * 2
  );

  projectStrength = Math.min(
    25,
    projectStrength
  );

  // -------------------------------
  // Final Score
  // -------------------------------

  const score = Math.min(
    100,
    githubActivity +
      repositoryQuality +
      commitQuality +
      projectStrength
  );

  // -------------------------------
  // Label
  // -------------------------------

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

  // -------------------------------
  // Recommendations
  // -------------------------------

  const recommendations: string[] = [];

  if (input.repositories < 3) {
    recommendations.push(
      "Build more complete projects."
    );
  }

  if (input.totalStars < 5) {
    recommendations.push(
      "Improve project quality and presentation to increase GitHub engagement."
    );
  }

  if (input.averageRepoScore < 60) {
    recommendations.push(
      "Improve repository documentation, structure and maintenance."
    );
  }

  if (input.averageCommitQuality < 60) {
    recommendations.push(
      "Write clearer and more meaningful commit messages."
    );
  }

  if (input.totalCommits < 50) {
    recommendations.push(
      "Increase consistent coding activity."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Your GitHub profile is showing strong internship readiness. Keep building and improving projects."
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