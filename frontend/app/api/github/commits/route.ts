
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request
) {

  try {

    const session =
      await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }


    const { searchParams } =
      new URL(request.url);

    const owner =
      searchParams.get("owner");

    const repo =
      searchParams.get("repo");


    if (!owner || !repo) {

      return NextResponse.json(
        {
          error:
            "Owner and repository are required",
        },
        { status: 400 }
      );

    }


    const response =
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits`,
        {
          headers: {
            Authorization:
              `Bearer ${session.accessToken}`,

            Accept:
              "application/vnd.github+json",
          },
        }
      );


    if (!response.ok) {

      return NextResponse.json(
        {
          error:
            "Failed to fetch commits",
        },
        {
          status:
            response.status,
        }
      );

    }


    const commits =
      await response.json();


    return NextResponse.json(
      commits
    );


  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Something went wrong",
      },
      {
        status: 500,
      }
    );

  }

}