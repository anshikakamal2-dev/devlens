import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      owner: string;
      repo: string;
    }>;
  }
) {
  try {
    const token = process.env.GITHUB_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "GitHub token is missing" },
        { status: 500 }
      );
    }

    const { owner, repo } = await context.params;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "GitHub commits API error:",
        response.status,
        data
      );

      return NextResponse.json(
        {
          error: "Failed to fetch commits from GitHub",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "GitHub commits route error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch commits",
      },
      { status: 500 }
    );
  }
}