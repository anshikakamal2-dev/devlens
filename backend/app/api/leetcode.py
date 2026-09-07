from fastapi import APIRouter, HTTPException
import requests

router = APIRouter(
    prefix="/api/leetcode",
    tags=["LeetCode"]
)


@router.get("/{username}")
def get_leetcode_stats(username: str):

    query = """
    query userProfile($username: String!) {
        matchedUser(username: $username) {
            username

            profile {
                ranking
                reputation
            }

            submitStats {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
        }

        allQuestionsCount {
            difficulty
            count
        }
    }
    """

    try:
        response = requests.post(
            "https://leetcode.com/graphql",
            json={
                "query": query,
                "variables": {
                    "username": username
                }
            },
            headers={
                "Content-Type": "application/json",
                "Referer": "https://leetcode.com/"
            },
            timeout=15
        )

        if not response.ok:
            raise HTTPException(
                status_code=502,
                detail="Unable to fetch LeetCode data."
            )

        data = response.json()

        user = data.get("data", {}).get("matchedUser")

        if not user:
            raise HTTPException(
                status_code=404,
                detail="LeetCode username not found."
            )

        submissions = {
            item["difficulty"]: item["count"]
            for item in user["submitStats"]["acSubmissionNum"]
        }

        total_solved = (
            submissions.get("All", 0)
        )

        return {
            "username": user["username"],
            "ranking": user["profile"]["ranking"],
            "reputation": user["profile"]["reputation"],
            "total_solved": total_solved,
            "easy": submissions.get("Easy", 0),
            "medium": submissions.get("Medium", 0),
            "hard": submissions.get("Hard", 0),
        }

    except HTTPException:
        raise

    except Exception as e:
        print("LEETCODE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch LeetCode statistics."
        )