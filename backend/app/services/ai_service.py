import os
from typing import Optional

# OpenAI is optional.
# DevLens will still work if the package/key is unavailable.
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


# =========================================================
# CONFIGURATION
# =========================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-4o-mini",
)


def get_openai_client() -> Optional[object]:
    """
    Create an OpenAI client only when the SDK and API key
    are available.
    """

    if OpenAI is None:
        return None

    if not OPENAI_API_KEY:
        return None

    try:
        return OpenAI(
            api_key=OPENAI_API_KEY
        )
    except Exception as error:
        print(
            "OPENAI CLIENT ERROR:",
            repr(error)
        )
        return None


# =========================================================
# LOCAL COMMIT ANALYSIS
# =========================================================

def local_commit_explanation(
    commit_message: str
) -> str:

    original_message = commit_message.strip()
    message = original_message.lower()

    if not message:
        return (
            "What it does: No commit message was provided.\n\n"
            "Why it may be useful: A descriptive commit message "
            "helps developers understand the purpose of a change.\n\n"
            "Suggestion: Use a clear action-oriented message such as "
            "\"Add GitHub commit analytics\"."
        )

    explanation = []

    # -----------------------------------------------------
    # Determine commit type
    # -----------------------------------------------------

    if any(
        word in message
        for word in [
            "fix",
            "bug",
            "error",
            "issue",
            "resolve",
            "repair",
        ]
    ):
        what_it_does = (
            "This commit appears to fix a bug, error, "
            "or unexpected behavior in the application."
        )

    elif any(
        word in message
        for word in [
            "add",
            "create",
            "implement",
            "introduce",
            "feature",
        ]
    ):
        what_it_does = (
            "This commit appears to add or implement "
            "new functionality in the project."
        )

    elif any(
        word in message
        for word in [
            "update",
            "change",
            "modify",
            "improve",
            "enhance",
        ]
    ):
        what_it_does = (
            "This commit appears to update or improve "
            "an existing part of the project."
        )

    elif any(
        word in message
        for word in [
            "remove",
            "delete",
            "drop",
        ]
    ):
        what_it_does = (
            "This commit appears to remove an existing "
            "feature, file, dependency, or piece of code."
        )

    elif any(
        word in message
        for word in [
            "refactor",
            "cleanup",
            "clean",
            "restructure",
        ]
    ):
        what_it_does = (
            "This commit appears to reorganize or clean up "
            "existing code without primarily introducing new functionality."
        )

    else:
        what_it_does = (
            "This commit appears to make a change to the project, "
            "but the exact implementation cannot be determined "
            "from the commit message alone."
        )

    explanation.append(
        f"What it does: {what_it_does}"
    )

    # -----------------------------------------------------
    # Technology hints
    # -----------------------------------------------------

    technologies = []

    technology_map = {
        "github": "GitHub integration",
        "api": "API functionality",
        "frontend": "frontend functionality",
        "backend": "backend functionality",
        "database": "database functionality",
        "sql": "SQL/database functionality",
        "react": "React frontend functionality",
        "next": "Next.js functionality",
        "nextjs": "Next.js functionality",
        "fastapi": "FastAPI backend functionality",
        "python": "Python functionality",
        "typescript": "TypeScript functionality",
        "javascript": "JavaScript functionality",
        "css": "UI/styling functionality",
        "auth": "authentication functionality",
        "login": "authentication functionality",
        "resume": "resume-analysis functionality",
        "leetcode": "LeetCode integration",
        "commit": "commit-analysis functionality",
    }

    for keyword, description in technology_map.items():
        if keyword in message:
            technologies.append(description)

    if technologies:
        unique_technologies = list(
            dict.fromkeys(technologies)
        )

        explanation.append(
            "Likely area affected: " +
            ", ".join(unique_technologies) +
            "."
        )

    # -----------------------------------------------------
    # Why useful
    # -----------------------------------------------------

    explanation.append(
        "Why it may be useful: The change can improve "
        "functionality, maintainability, reliability, "
        "developer experience, or user experience depending "
        "on the actual implementation."
    )

    # -----------------------------------------------------
    # Commit quality
    # -----------------------------------------------------

    words = original_message.split()

    if len(words) >= 6:
        quality = (
            "The commit message is reasonably descriptive "
            "and provides useful context about the change."
        )

    elif len(words) >= 3:
        quality = (
            "The commit message provides some context, "
            "but it could be more specific about what changed."
        )

    else:
        quality = (
            "The commit message is very short and does not "
            "provide enough context about the actual change."
        )

    explanation.append(
        f"Commit quality: {quality}"
    )

    # -----------------------------------------------------
    # Suggestion
    # -----------------------------------------------------

    explanation.append(
        "Suggestion: Use a concise, action-oriented message "
        "that describes the specific change, for example "
        "\"Add GitHub commit analytics\" or "
        "\"Fix repository score calculation\"."
    )

    return "\n\n".join(explanation)


# =========================================================
# AI COMMIT EXPLANATION
# =========================================================

def explain_commit(
    commit_message: str
) -> str:

    message = commit_message.strip()

    if not message:
        return local_commit_explanation(message)

    client = get_openai_client()

    # -----------------------------------------------------
    # AI unavailable → local fallback
    # -----------------------------------------------------

    if client is None:
        print(
            "AI unavailable. Using local commit explanation."
        )

        return local_commit_explanation(message)

    # -----------------------------------------------------
    # Try real AI
    # -----------------------------------------------------

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an experienced software engineer "
                        "reviewing Git commits. Explain commit messages "
                        "for a developer dashboard. Be concise, practical "
                        "and technically useful. Do not claim specific "
                        "code changes that cannot be inferred from the "
                        "commit message."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Analyze this Git commit message:\n\n"
                        f"{message}\n\n"
                        "Return:\n"
                        "1. What it likely does\n"
                        "2. Why it may be useful\n"
                        "3. Commit quality\n"
                        "4. One improvement suggestion"
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=300,
        )

        ai_text = response.choices[0].message.content

        if ai_text and ai_text.strip():
            return ai_text.strip()

    except Exception as error:
        print(
            "OPENAI COMMIT ERROR:",
            repr(error)
        )

    # -----------------------------------------------------
    # AI failed → fallback
    # -----------------------------------------------------

    print(
        "Using local fallback for commit explanation."
    )

    return local_commit_explanation(message)


# =========================================================
# LOCAL CAREER COACH
# =========================================================

def local_career_coach(
    readiness_score: int,
    readiness_label: str,
    repositories: int,
    total_stars: int,
    total_forks: int,
    total_commits: int,
    average_repo_score: float,
    average_commit_quality: float,
) -> str:

    advice = []

    # -----------------------------------------------------
    # Overall assessment
    # -----------------------------------------------------

    if readiness_score >= 80:
        overall = (
            "Your profile is looking strong for internship applications. "
            "Focus on polishing your resume, projects and interview preparation."
        )

    elif readiness_score >= 60:
        overall = (
            "Your profile has a good foundation for internships, "
            "but several areas should be improved before applying aggressively."
        )

    elif readiness_score >= 40:
        overall = (
            "Your profile is developing, but you should strengthen "
            "projects, coding activity and software engineering fundamentals."
        )

    else:
        overall = (
            "Your profile needs improvement before you are fully "
            "internship-ready. Focus on strong projects and consistent coding."
        )

    advice.append(
        f"1. Overall Assessment\n"
        f"Internship Readiness: {readiness_score}/100 "
        f"({readiness_label})\n"
        f"{overall}"
    )

    # -----------------------------------------------------
    # Strong areas
    # -----------------------------------------------------

    strong_areas = []

    if repositories >= 3:
        strong_areas.append(
            f"You have {repositories} repositories, "
            "showing project activity."
        )

    if total_commits >= 30:
        strong_areas.append(
            f"You have {total_commits} commits, "
            "showing consistent development activity."
        )

    if average_repo_score >= 70:
        strong_areas.append(
            "Your repository quality is relatively strong."
        )

    if average_commit_quality >= 70:
        strong_areas.append(
            "Your commit messages show good development practices."
        )

    if total_stars > 0:
        strong_areas.append(
            f"Your projects have received {total_stars} star(s), "
            "indicating external interest."
        )

    if total_forks > 0:
        strong_areas.append(
            f"Your projects have received {total_forks} fork(s), "
            "showing that some repositories are being reused or explored."
        )

    if not strong_areas:
        strong_areas.append(
            "You have started building your developer profile. "
            "The next step is to increase consistent project and coding activity."
        )

    advice.append(
        "2. Strong Areas\n" +
        "\n".join(
            f"• {item}"
            for item in strong_areas
        )
    )

    # -----------------------------------------------------
    # Weak areas
    # -----------------------------------------------------

    weak_areas = []

    if repositories < 3:
        weak_areas.append(
            "Build more meaningful technical projects."
        )

    if total_commits < 30:
        weak_areas.append(
            "Increase consistent GitHub activity through regular development."
        )

    if average_repo_score < 60:
        weak_areas.append(
            "Improve README files, documentation, repository structure "
            "and project presentation."
        )

    if average_commit_quality < 60:
        weak_areas.append(
            "Improve commit messages using clear, specific "
            "and action-oriented descriptions."
        )

    if total_stars == 0:
        weak_areas.append(
            "Improve project quality and presentation before sharing "
            "projects publicly."
        )

    if not weak_areas:
        weak_areas.append(
            "No major weakness was detected from the available GitHub metrics. "
            "Focus on advanced skills and interview preparation."
        )

    advice.append(
        "3. Areas to Improve\n" +
        "\n".join(
            f"• {item}"
            for item in weak_areas
        )
    )

    # -----------------------------------------------------
    # Skills
    # -----------------------------------------------------

    skills = [
        "Data Structures & Algorithms",
        "Problem solving",
        "Git and GitHub workflow",
        "REST APIs and backend development",
        "Database fundamentals (SQL)",
        "Object-Oriented Programming",
        "Operating Systems and Computer Networks",
    ]

    if average_repo_score < 70:
        skills.append(
            "Software project structure and documentation"
        )

    advice.append(
        "4. Skills to Improve\n" +
        "\n".join(
            f"• {skill}"
            for skill in skills
        )
    )

    # -----------------------------------------------------
    # Project recommendations
    # -----------------------------------------------------

    projects = [
        "AI-powered developer analytics dashboard",
        "Full-stack task/project management application",
        "DSA progress tracker with coding statistics",
    ]

    if average_repo_score < 70:
        projects.append(
            "Improve an existing project with better README, "
            "screenshots, documentation and deployment."
        )

    advice.append(
        "5. Project Recommendations\n" +
        "\n".join(
            f"• {project}"
            for project in projects
        )
    )

    # -----------------------------------------------------
    # 30-day plan
    # -----------------------------------------------------

    action_plan = [
        "Days 1-7: Revise arrays, strings, hashing, linked lists and stacks.",
        "Days 8-14: Solve 2-3 DSA problems daily and improve commit quality.",
        "Days 15-21: Build or improve one strong full-stack project.",
        "Days 22-25: Add README, screenshots, documentation and deployment.",
        "Days 26-28: Update your resume and GitHub profile.",
        "Days 29-30: Practice DSA, CS fundamentals and mock interviews.",
    ]

    advice.append(
        "6. 30-Day Action Plan\n" +
        "\n".join(
            f"• {day}"
            for day in action_plan
        )
    )

    # -----------------------------------------------------
    # Final recommendation
    # -----------------------------------------------------

    advice.append(
        "🎯 Final Recommendation\n"
        "Focus on quality over quantity. Build 2-3 strong projects, "
        "maintain consistent GitHub activity, practice DSA regularly, "
        "and prepare core CS subjects before applying for internships."
    )

    return "\n\n".join(advice)


# =========================================================
# AI CAREER COACH
# =========================================================

def career_coach(
    readiness_score: int,
    readiness_label: str,
    repositories: int,
    total_stars: int,
    total_forks: int,
    total_commits: int,
    average_repo_score: float,
    average_commit_quality: float,
) -> str:

    client = get_openai_client()

    # -----------------------------------------------------
    # AI unavailable → local career coach
    # -----------------------------------------------------

    if client is None:
        print(
            "AI unavailable. Using local career coach."
        )

        return local_career_coach(
            readiness_score,
            readiness_label,
            repositories,
            total_stars,
            total_forks,
            total_commits,
            average_repo_score,
            average_commit_quality,
        )

    # -----------------------------------------------------
    # Try real AI
    # -----------------------------------------------------

    try:
        prompt = f"""
Analyze this developer's GitHub profile and provide practical
internship-focused career advice.

Internship readiness:
{readiness_score}/100 ({readiness_label})

Repositories:
{repositories}

Stars:
{total_stars}

Forks:
{total_forks}

Total commits:
{total_commits}

Average repository score:
{average_repo_score:.1f}/100

Average commit quality:
{average_commit_quality:.1f}/100

Provide:
1. Overall assessment
2. Strong areas
3. Weak areas
4. Skills to improve
5. Project recommendations
6. A practical 30-day action plan

Keep the advice realistic for a computer science student.
Do not invent achievements or skills that are not present.
"""

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a practical software engineering "
                        "career coach helping a computer science student "
                        "prepare for internships."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.4,
            max_tokens=900,
        )

        ai_text = response.choices[0].message.content

        if ai_text and ai_text.strip():
            return ai_text.strip()

    except Exception as error:
        print(
            "OPENAI CAREER COACH ERROR:",
            repr(error)
        )

    # -----------------------------------------------------
    # AI failed → local fallback
    # -----------------------------------------------------

    print(
        "Using local fallback for career coach."
    )

    return local_career_coach(
        readiness_score,
        readiness_label,
        repositories,
        total_stars,
        total_forks,
        total_commits,
        average_repo_score,
        average_commit_quality,
    )