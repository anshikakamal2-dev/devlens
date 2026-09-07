import re
from io import BytesIO

from pypdf import PdfReader
from docx import Document


def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))

    text = []

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text.append(page_text)

    return "\n".join(text)


def extract_docx_text(file_bytes: bytes) -> str:
    document = Document(BytesIO(file_bytes))

    text = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            text.append(paragraph.text)

    return "\n".join(text)


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    filename = filename.lower()

    if filename.endswith(".pdf"):
        return extract_pdf_text(file_bytes)

    if filename.endswith(".docx"):
        return extract_docx_text(file_bytes)

    raise ValueError(
        "Unsupported file type. Please upload a PDF or DOCX file."
    )


def analyze_resume_text(text: str) -> dict:
    text_lower = text.lower()

    score = 0
    suggestions = []

    # -----------------------------------------
    # 1. Contact Information - 15 points
    # -----------------------------------------

    has_email = bool(
        re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text
        )
    )

    has_phone = bool(
        re.search(
            r"(\+?\d[\d\s\-()]{8,}\d)",
            text
        )
    )

    contact_score = 0

    if has_email:
        contact_score += 8
    else:
        suggestions.append(
            "Add a professional email address."
        )

    if has_phone:
        contact_score += 7
    else:
        suggestions.append(
            "Add your phone number."
        )

    score += contact_score

    # -----------------------------------------
    # 2. Summary / Objective - 10 points
    # -----------------------------------------

    summary_keywords = [
        "summary",
        "objective",
        "profile",
        "about me"
    ]

    has_summary = any(
        keyword in text_lower
        for keyword in summary_keywords
    )

    if has_summary:
        score += 10
    else:
        suggestions.append(
            "Add a short professional summary focused on your career goals."
        )

    # -----------------------------------------
    # 3. Skills - 15 points
    # -----------------------------------------

    skill_keywords = [
        "skills",
        "technical skills",
        "technologies",
        "programming languages"
    ]

    has_skills_section = any(
        keyword in text_lower
        for keyword in skill_keywords
    )

    if has_skills_section:
        score += 15
    else:
        suggestions.append(
            "Add a dedicated Technical Skills section."
        )

    # -----------------------------------------
    # 4. Projects - 20 points
    # -----------------------------------------

    project_keywords = [
        "projects",
        "project",
        "github"
    ]

    has_projects = any(
        keyword in text_lower
        for keyword in project_keywords
    )

    if has_projects:
        score += 20
    else:
        suggestions.append(
            "Add 2-3 strong technical projects with technologies and achievements."
        )

    # -----------------------------------------
    # 5. Education - 10 points
    # -----------------------------------------

    education_keywords = [
        "education",
        "b.tech",
        "btech",
        "bachelor",
        "university",
        "college"
    ]

    has_education = any(
        keyword in text_lower
        for keyword in education_keywords
    )

    if has_education:
        score += 10
    else:
        suggestions.append(
            "Add your education details."
        )

    # -----------------------------------------
    # 6. Experience - 10 points
    # -----------------------------------------

    experience_keywords = [
        "experience",
        "internship",
        "intern",
        "work experience"
    ]

    has_experience = any(
        keyword in text_lower
        for keyword in experience_keywords
    )

    if has_experience:
        score += 10
    else:
        suggestions.append(
            "If you have internship or work experience, highlight it clearly."
        )

    # -----------------------------------------
    # 7. Developer Profiles - 5 points
    # -----------------------------------------

    profile_keywords = [
        "linkedin",
        "github",
        "leetcode"
    ]

    profile_count = sum(
        keyword in text_lower
        for keyword in profile_keywords
    )

    if profile_count >= 2:
        score += 5
    else:
        suggestions.append(
            "Add relevant GitHub, LinkedIn and coding-profile links."
        )

    # -----------------------------------------
    # 8. Quantified Achievements - 5 points
    # -----------------------------------------

    has_numbers = bool(
        re.search(
            r"\b\d+%|\b\d+\+|\b\d+\s*(users|projects|members|requests|records)",
            text_lower
        )
    )

    if has_numbers:
        score += 5
    else:
        suggestions.append(
            "Use numbers and measurable results to describe achievements."
        )

    # -----------------------------------------
    # Final score
    # -----------------------------------------

    score = min(score, 100)

    if score >= 85:
        label = "Excellent"
    elif score >= 70:
        label = "Strong"
    elif score >= 55:
        label = "Needs Improvement"
    else:
        label = "Weak"

    advice = (
        f"Resume Rating: {label}\n\n"
        f"Your resume scored {score}/100 based on its structure, "
        f"technical content and internship-readiness signals.\n\n"
    )

    if suggestions:
        advice += "Recommended Improvements:\n"

        for suggestion in suggestions:
            advice += f"- {suggestion}\n"
    else:
        advice += (
            "Your resume contains the major sections expected "
            "for an internship-focused technical resume. "
            "Continue improving measurable achievements and project depth."
        )

    return {
        "score": score,
        "label": label,
        "advice": advice,
    }