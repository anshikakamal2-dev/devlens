export async function getGithubUser(accessToken: string) {
  const response = await fetch(
    "https://api.github.com/user",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user");
  }

  return response.json();
}


export async function getGithubRepositories(
  accessToken: string
) {
  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=20",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub repositories");
  }

  return response.json();
}