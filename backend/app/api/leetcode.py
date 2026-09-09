from fastapi import APIRouter, HTTPException
import requests


router = APIRouter(
    prefix="/api/leetcode",
    tags=["LeetCode"],
)


LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"


QUERY = """
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
}
"""


@router.get("/{username}")
def get_leetcode_stats(username: str):

    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="LeetCode username is required.",
        )

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://leetcode.com/",
        "Origin": "https://leetcode.com",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/142.0.0.0 Safari/537.36"
        ),
    }

    payload = {
        "query": QUERY,
        "variables": {
            "username": username,
        },
    }

    try:
        response = requests.post(
            LEETCODE_GRAPHQL_URL,
            json=payload,
            headers=headers,
            timeout=20,
        )

        print(
            "LeetCode response:",
            response.status_code,
        )

        if not response.ok:
            print(
                "LeetCode response body:",
                response.text[:500],
            )

            raise HTTPException(
                status_code=502,
                detail=(
                    "LeetCode temporarily rejected the request. "
                    "Please try again."
                ),
            )

        data = response.json()

        # ---------------------------------------------
        # GraphQL errors
        # ---------------------------------------------

        if data.get("errors"):
            print(
                "LeetCode GraphQL errors:",
                data["errors"],
            )

            raise HTTPException(
                status_code=502,
                detail="LeetCode GraphQL request failed.",
            )

        # ---------------------------------------------
        # Get matched user
        # ---------------------------------------------

        user = (
            data
            .get("data", {})
            .get("matchedUser")
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="LeetCode username not found.",
            )

        # ---------------------------------------------
        # Profile
        # ---------------------------------------------

        profile = user.get("profile") or {}

        ranking = profile.get("ranking") or 0
        reputation = profile.get("reputation") or 0

        # ---------------------------------------------
        # Submission statistics
        # ---------------------------------------------

        submit_stats = (
            user
            .get("submitStats", {})
            .get("acSubmissionNum", [])
        )

        submissions = {}

        for item in submit_stats:
            difficulty = item.get("difficulty")
            count = item.get("count", 0)

            if difficulty:
                submissions[difficulty] = count

        # ---------------------------------------------
        # Final statistics
        # ---------------------------------------------

        total_solved = submissions.get("All", 0)
        easy = submissions.get("Easy", 0)
        medium = submissions.get("Medium", 0)
        hard = submissions.get("Hard", 0)

        return {
            "username": user.get("username", username),
            "ranking": ranking,
            "reputation": reputation,
            "total_solved": total_solved,
            "easy": easy,
            "medium": medium,
            "hard": hard,
        }

    except HTTPException:
        raise

    except requests.RequestException as error:
        print(
            "LeetCode network error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to connect to LeetCode.",
        )

    except ValueError as error:
        print(
            "LeetCode JSON error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Invalid response received from LeetCode.",
        )

    except Exception as error:
        print(
            "LEETCODE ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch LeetCode statistics.",
        )