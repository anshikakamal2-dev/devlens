from fastapi import APIRouter, HTTPException
import requests

router = APIRouter(
    prefix="/api/github",
    tags=["GitHub Public"]
)


@router.get("/public/{username}")
def get_public_github_user(username: str):

    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="GitHub username is required."
        )

    try:
        response = requests.get(
            f"https://api.github.com/users/{username}",
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "DevLens",
            },
            timeout=15,
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="GitHub user not found."
            )

        if not response.ok:
            raise HTTPException(
                status_code=502,
                detail="Unable to fetch GitHub user."
            )

        data = response.json()

        return {
            "login": data.get("login"),
            "name": data.get("name"),
            "avatar_url": data.get("avatar_url"),
            "html_url": data.get("html_url"),
            "public_repos": data.get("public_repos", 0),
            "followers": data.get("followers", 0),
            "following": data.get("following", 0),
            "bio": data.get("bio"),
        }

    except HTTPException:
        raise

    except Exception as e:
        print("PUBLIC GITHUB ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch GitHub user."
        )