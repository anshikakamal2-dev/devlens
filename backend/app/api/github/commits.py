from fastapi import APIRouter, HTTPException
import requests

router = APIRouter(
    prefix="/api/github",
    tags=["GitHub"]
)


@router.get("/commits/{owner}/{repo}")
def get_commits(owner: str, repo: str):

    url = (
        f"https://api.github.com/repos/"
        f"{owner}/{repo}/commits"
    )

    response = requests.get(url)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Unable to fetch GitHub commits"
        )

    commits = response.json()

    result = []

    for commit in commits[:10]:

        result.append({
            "sha": commit.get("sha", ""),

            "message": commit
            .get("commit", {})
            .get("message", "No commit message"),

            "author": commit
            .get("commit", {})
            .get("author", {})
            .get("name", "Unknown author"),

            "date": commit
            .get("commit", {})
            .get("author", {})
            .get("date", "")
        })

    return result