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

  let documentation = 0;
  let popularity = 0;
  let community = 0;
  let maintenance = 0;
  let structure = 0;


  // Documentation
  if (repo.description) {
    documentation += 10;
  }

  if (repo.language) {
    documentation += 5;
  }

  documentation += 5;


  // Popularity
  popularity += Math.min(
    repo.stargazers_count * 2,
    20
  );


  // Community
  community += Math.min(
    repo.forks_count * 2,
    10
  );

  community += Math.min(
    repo.open_issues_count,
    10
  );


  // Maintenance
  const updatedDate =
    new Date(repo.updated_at);

  const today = new Date();

  const difference =
    today.getTime() -
    updatedDate.getTime();

  const days =
    difference /
    (1000 * 60 * 60 * 24);

  if (days <= 30) {
    maintenance = 20;
  } else if (days <= 90) {
    maintenance = 15;
  } else if (days <= 180) {
    maintenance = 10;
  } else {
    maintenance = 5;
  }


  // Structure
  if (repo.language) {
    structure += 10;
  }

  if (repo.description) {
    structure += 5;
  }

  structure += 5;


  const total =
    documentation +
    popularity +
    community +
    maintenance +
    structure;


  return {
    documentation,
    popularity,
    community,
    maintenance,
    structure,
    total: Math.min(total, 100),
  };
}