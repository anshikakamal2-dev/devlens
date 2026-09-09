import { NextResponse } from "next/server";

interface GithubApiError {
  message?: string;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ username: string }>;
  }
) {
  try {
    const { username } = await context.params;

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "GitHub username is required." },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "GitHub access token is missing." },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "DevLens",
    };

    // --------------------------------------------------
    // 1. Fetch GitHub user
    // --------------------------------------------------

    const userResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(
        cleanUsername
      )}`,
      {
        headers,
        cache: "no-store",
      }
    );

    const userData =
      (await userResponse.json().catch(() => ({}))) as GithubApiError;

    if (userResponse.status === 404) {
      return NextResponse.json(
        { error: "GitHub user not found." },
        { status: 404 }
      );
    }

    if (userResponse.status === 401) {
      return NextResponse.json(
        {
          error:
            "GitHub authentication failed. Please check your access token.",
        },
        { status: 401 }
      );
    }

    if (userResponse.status === 403) {
      return NextResponse.json(
        {
          error:
            userData.message ||
            "GitHub API access denied or rate limit exceeded.",
        },
        { status: 403 }
      );
    }

    if (!userResponse.ok) {
      return NextResponse.json(
        {
          error:
            userData.message ||
            "Failed to fetch GitHub user.",
        },
        { status: userResponse.status }
      );
    }

    // --------------------------------------------------
    // 2. Fetch repositories of THAT user
    // --------------------------------------------------

    const reposResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(
        cleanUsername
      )}/repos?per_page=100&sort=updated`,
      {
        headers,
        cache: "no-store",
      }
    );

    const reposData = await reposResponse.json().catch(() => []);

    if (reposResponse.status === 403) {
      return NextResponse.json(
        {
          error:
            "GitHub API rate limit exceeded while fetching repositories.",
        },
        { status: 403 }
      );
    }

    if (!reposResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch GitHub repositories.",
        },
        { status: reposResponse.status }
      );
    }

    if (!Array.isArray(reposData)) {
      return NextResponse.json(
        {
          error: "Invalid repository data received from GitHub.",
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // 3. Return both user + repositories
    // --------------------------------------------------

    return NextResponse.json({
      user: userData,
      repositories: reposData,
    });
  } catch (error) {
    console.error(
      "Public GitHub profile route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while analyzing the GitHub profile.",
      },
      { status: 500 }
    );
  }
}