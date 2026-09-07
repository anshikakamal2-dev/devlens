# =====================================================
# COMMIT EXPLANATION
# =====================================================

def explain_commit(commit_message: str) -> str:

    message = commit_message.lower().strip()

    explanation = []

    # What the commit likely does
    if any(
        word in message
        for word in ["fix", "bug", "error", "issue"]
    ):
        explanation.append(
            "What it does: This commit likely fixes a bug, "
            "error, or issue in the application."
        )

    elif any(
        word in message
        for word in ["add", "create", "implement"]
    ):
        explanation.append(
            "What it does: This commit likely adds or implements "
            "a new feature or functionality."
        )

    elif any(
        word in message
        for word in ["update", "change", "modify"]
    ):
        explanation.append(
            "What it does: This commit likely updates or modifies "
            "an existing part of the application."
        )

    elif any(
        word in message
        for word in ["remove", "delete"]
    ):
        explanation.append(
            "What it does: This commit likely removes an existing "
            "feature, file, or piece of functionality."
        )

    elif any(
        word in message
        for word in ["refactor", "cleanup", "clean"]
    ):
        explanation.append(
            "What it does: This commit likely improves or reorganizes "
            "existing code without changing its main functionality."
        )

    else:
        explanation.append(
            "What it does: The commit appears to make a change "
            "to the project, but the exact change cannot be determined "
            "from the commit message alone."
        )

    # Why it may be useful
    explanation.append(
        "Why it may be useful: The change may improve the project's "
        "functionality, maintainability, or user experience."
    )

    # Commit quality
    words = message.split()

    if len(words) >= 3:
        explanation.append(
            "Commit quality: The message provides some useful information "
            "about the change."
        )
    else:
        explanation.append(
            "Commit quality: The message is too short and could be "
            "more descriptive."
        )

    # Improvement suggestion
    explanation.append(
        "Suggestion: Use a clear action-oriented commit message that "
        "briefly describes the specific change."
    )

    return "\n\n".join(explanation)


# =====================================================
# AI CAREER COACH
# =====================================================

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

    advice = []

    # =================================================
    # 1. OVERALL ASSESSMENT
    # =================================================

    if readiness_score >= 80:
        overall = (
            "Your profile is looking strong for internship applications. "
            "Focus now on polishing your resume, projects and interview preparation."
        )

    elif readiness_score >= 60:
        overall = (
            "Your profile has a good foundation for internships, "
            "but there are some areas that should be improved before applying aggressively."
        )

    elif readiness_score >= 40:
        overall = (
            "Your profile is developing, but you should strengthen your "
            "projects, coding activity and software engineering fundamentals."
        )

    else:
        overall = (
            "Your profile needs significant improvement before you are "
            "fully internship-ready. Focus on building projects and consistent coding habits."
        )

    advice.append(
        f"1. Overall Assessment\n"
        f"Internship Readiness: {readiness_score}/100 ({readiness_label})\n"
        f"{overall}"
    )

    # =================================================
    # 2. STRONG AREAS
    # =================================================

    strong_areas = []

    if repositories >= 3:
        strong_areas.append(
            f"You have {repositories} repositories, showing project activity."
        )

    if total_commits >= 30:
        strong_areas.append(
            f"You have {total_commits} commits, showing development activity."
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
            "which indicates some external interest."
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

    # =================================================
    # 3. WEAK AREAS
    # =================================================

    weak_areas = []

    if repositories < 3:
        weak_areas.append(
            "Build more meaningful projects instead of relying on very few repositories."
        )

    if total_commits < 30:
        weak_areas.append(
            "Increase consistent GitHub activity through regular development."
        )

    if average_repo_score < 60:
        weak_areas.append(
            "Improve README files, documentation, repository structure and project presentation."
        )

    if average_commit_quality < 60:
        weak_areas.append(
            "Improve commit messages by using clear, specific and action-oriented descriptions."
        )

    if total_stars == 0:
        weak_areas.append(
            "Your projects currently have no stars. Improve project quality and presentation "
            "and share useful projects publicly."
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

    # =================================================
    # 4. SKILLS TO IMPROVE
    # =================================================

    skills = [
        "Data Structures & Algorithms",
        "Problem solving and competitive programming",
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

    # =================================================
    # 5. PROJECT RECOMMENDATIONS
    # =================================================

    projects = [
        "AI-powered developer analytics dashboard",
        "Full-stack task/project management application",
        "DSA progress tracker with coding statistics",
    ]

    if average_repo_score < 70:
        projects.append(
            "Improve one existing project with better README, "
            "screenshots, documentation and deployment"
        )

    advice.append(
        "5. Project Recommendations\n" +
        "\n".join(
            f"• {project}"
            for project in projects
        )
    )

    # =================================================
    # 6. 30-DAY ACTION PLAN
    # =================================================

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

    # =================================================
    # FINAL RECOMMENDATION
    # =================================================

    advice.append(
        "🎯 Final Recommendation\n"
        "Focus on quality over quantity. Build 2-3 strong projects, "
        "maintain consistent GitHub activity, practice DSA regularly, "
        "and prepare core CS subjects before applying for internships."
    )

    return "\n\n".join(advice)