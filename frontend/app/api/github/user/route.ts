
import { NextResponse } from "next/server";

export async function GET() {
  try {
   

   const token = process.env.GITHUB_ACCESS_TOKEN;
console.log("Token exists:", !!token);
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token is missing" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.github.com/user",
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
        "GitHub API error:",
        response.status,
        data
      );

      return NextResponse.json(
        {
          error:
            data.message ||
            "GitHub API request failed",
        },
        { status: response.status, }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "GitHub user route error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to connect to GitHub", },
      { status: 500, }
    );
  }
}