import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // --------------------------------------------------
    // Get GitHub access token
    // --------------------------------------------------

    const token = process.env.GITHUB_ACCESS_TOKEN;

    console.log("GitHub token exists:", !!token);

    if (!token) {
      return NextResponse.json(
        { error: "GitHub access token is missing." },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // Get owner and repository
    // --------------------------------------------------

    const { searchParams } = new URL(request.url);

    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!owner || !repo) {
      return NextResponse.json(
        {
          error: "Owner and repository are required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // GitHub API URL
    // --------------------------------------------------

    const githubUrl =
      `https://api.github.com/repos/${encodeURIComponent(owner)}` +
      `/${encodeURIComponent(repo)}/commits?per_page=30`;

    // --------------------------------------------------
    // Fetch commits
    // --------------------------------------------------

    const response = await fetch(githubUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "DevLens",
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    // --------------------------------------------------
    // Handle GitHub errors
    // --------------------------------------------------

    if (response.status === 401) {
      console.error("GitHub authentication failed:", data);

      return NextResponse.json(
        {
          error:
            "GitHub authentication failed. Please check your access token.",
        },
        { status: 401 }
      );
    }

    if (response.status === 403) {
      console.error("GitHub access denied/rate limit:", data);

      return NextResponse.json(
        {
          error:
            data?.message ||
            "GitHub API access denied or rate limit exceeded.",
        },
        { status: 403 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        {
          error: "Repository not found.",
        },
        { status: 404 }
      );
    }

    if (!response.ok) {
      console.error(
        "GitHub commits API error:",
        response.status,
        data
      );

      return NextResponse.json(
        {
          error:
            data?.message ||
            "Failed to fetch GitHub commits.",
        },
        { status: response.status }
      );
    }

    // --------------------------------------------------
    // Validate response
    // --------------------------------------------------

    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          error: "Invalid commit data received from GitHub.",
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    console.log(
      `Fetched ${data.length} commits for ${owner}/${repo}`
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "GitHub commits route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while fetching GitHub commits.",
      },
      { status: 500 }
    );
  }
}
