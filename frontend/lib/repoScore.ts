interface Repository {
  stargazers_count: number;
  forks_count: number;
  description: string | null;
  language: string | null;
  open_issues_count: number;
  updated_at: string;
}

export function calculateRepositoryScore(
  repo: Repository
) {
  // --------------------------------------------------
  // Documentation - 25 points
  // --------------------------------------------------

  let documentation = 0;

  if (repo.description?.trim()) {
    documentation += 15;
  }

  if (repo.language) {
    documentation += 5;
  }

  // Base documentation quality
  documentation += 5;

  documentation = Math.min(
    documentation,
    25
  );

  // --------------------------------------------------
  // Popularity - 20 points
  // --------------------------------------------------

  const popularity = Math.min(
    repo.stargazers_count * 2,
    20
  );

  // --------------------------------------------------
  // Community - 15 points
  // --------------------------------------------------

  let community = 0;

  community += Math.min(
    repo.forks_count * 3,
    10
  );

  // Having a small number of open issues is neutral.
  // Too many unresolved issues should not increase score.
  if (
    repo.open_issues_count >= 0 &&
    repo.open_issues_count <= 5
  ) {
    community += 5;
  }

  community = Math.min(
    community,
    15
  );

  // --------------------------------------------------
  // Maintenance - 20 points
  // --------------------------------------------------

  let maintenance = 0;

  const updatedDate = new Date(
    repo.updated_at
  );

  const today = new Date();

  const difference =
    today.getTime() -
    updatedDate.getTime();

  const days =
    difference /
    (1000 * 60 * 60 * 24);

  if (Number.isFinite(days)) {
    if (days <= 30) {
      maintenance = 20;
    } else if (days <= 90) {
      maintenance = 16;
    } else if (days <= 180) {
      maintenance = 12;
    } else if (days <= 365) {
      maintenance = 8;
    } else {
      maintenance = 4;
    }
  }

  // --------------------------------------------------
  // Structure - 20 points
  // --------------------------------------------------

  let structure = 0;

  if (repo.language) {
    structure += 10;
  }

  if (repo.description?.trim()) {
    structure += 5;
  }

  // Base structure score
  structure += 5;

  structure = Math.min(
    structure,
    20
  );

  // --------------------------------------------------
  // Final Score
  // --------------------------------------------------

  const total = Math.min(
    documentation +
      popularity +
      community +
      maintenance +
      structure,
    100
  );

  return {
    documentation,
    popularity,
    community,
    maintenance,
    structure,
    total,
  };
}