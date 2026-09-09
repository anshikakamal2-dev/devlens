import os
import re
from io import BytesIO

from pypdf import PdfReader
from docx import Document

import pytesseract
from pdf2image import convert_from_bytes


# =========================================================
# WINDOWS OCR CONFIGURATION
# =========================================================

TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

POPPLER_PATH = (
    r"C:\Users\anshi\AppData\Local\Microsoft\WinGet\Packages"
    r"\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\poppler-25.07.0\Library\bin"
)


if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


# =========================================================
# PDF TEXT EXTRACTION
# =========================================================

def extract_pdf_text(file_bytes: bytes) -> str:
    """
    First try normal PDF text extraction using pypdf.
    If no text is found, automatically use OCR.
    """

    # -----------------------------------------------------
    # 1. Normal PDF text extraction
    # -----------------------------------------------------

    try:
        reader = PdfReader(BytesIO(file_bytes))

        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                page_text = page_text.strip()

                if page_text:
                    text_parts.append(page_text)

        extracted_text = "\n".join(text_parts).strip()

        if extracted_text:
            print("PDF TEXT EXTRACTION: successful")
            return extracted_text

    except Exception as error:
        print("PDF TEXT EXTRACTION ERROR:", repr(error))

    # -----------------------------------------------------
    # 2. OCR fallback
    # -----------------------------------------------------

    print("PDF contains no readable text. Starting OCR...")

    if not os.path.exists(TESSERACT_PATH):
        print("Tesseract not found:", TESSERACT_PATH)
        return ""

    if not os.path.exists(POPPLER_PATH):
        print("Poppler not found:", POPPLER_PATH)
        return ""

    try:
        images = convert_from_bytes(
            file_bytes,
            dpi=200,
            poppler_path=POPPLER_PATH,
        )

        ocr_parts = []

        for index, image in enumerate(images):
            print(f"OCR processing page {index + 1}/{len(images)}...")

            page_text = pytesseract.image_to_string(
                image,
                config="--psm 6",
            )

            if page_text:
                page_text = page_text.strip()

                if page_text:
                    ocr_parts.append(page_text)

        return "\n".join(ocr_parts).strip()

    except Exception as error:
        print("PDF OCR ERROR:", repr(error))
        return ""


# =========================================================
# DOCX TEXT EXTRACTION
# =========================================================

def extract_docx_text(file_bytes: bytes) -> str:
    """
    Extract text from normal paragraphs and tables.
    """

    try:
        document = Document(BytesIO(file_bytes))

        text_parts = []

        # -------------------------------------------------
        # Paragraphs
        # -------------------------------------------------

        for paragraph in document.paragraphs:
            text = paragraph.text.strip()

            if text:
                text_parts.append(text)

        # -------------------------------------------------
        # Tables
        # -------------------------------------------------

        for table in document.tables:

            for row in table.rows:

                row_text = []

                for cell in row.cells:
                    cell_text = cell.text.strip()

                    if cell_text:
                        row_text.append(cell_text)

                if row_text:
                    text_parts.append(" | ".join(row_text))

        return "\n".join(text_parts).strip()

    except Exception as error:
        print("DOCX EXTRACTION ERROR:", repr(error))
        return ""


# =========================================================
# MAIN RESUME TEXT EXTRACTION
# =========================================================

def extract_resume_text(
    filename: str,
    file_bytes: bytes,
) -> str:

    filename = filename.lower().strip()

    if filename.endswith(".pdf"):
        return extract_pdf_text(file_bytes)

    if filename.endswith(".docx"):
        return extract_docx_text(file_bytes)

    raise ValueError(
        "Unsupported file type. Please upload a PDF or DOCX file."
    )


# =========================================================
# RESUME ANALYZER
# =========================================================

def analyze_resume_text(text: str) -> dict:

    text_lower = text.lower()

    score = 0
    suggestions = []

    # =====================================================
    # 1. CONTACT INFORMATION - 15 POINTS
    # =====================================================

    has_email = bool(
        re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text,
        )
    )

    has_phone = bool(
        re.search(
            r"\+?\d[\d\s\-()]{8,}\d",
            text,
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

    # =====================================================
    # 2. SUMMARY / OBJECTIVE - 10 POINTS
    # =====================================================

    summary_keywords = [
        "summary",
        "objective",
        "profile",
        "about me",
        "career objective",
        "professional summary",
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

    # =====================================================
    # 3. SKILLS - 15 POINTS
    # =====================================================

    skill_keywords = [
        "skills",
        "technical skills",
        "technical skill",
        "technologies",
        "programming languages",
        "tech stack",
        "technical expertise",
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

    # =====================================================
    # 4. PROJECTS - 20 POINTS
    # =====================================================

    project_keywords = [
        "projects",
        "project",
        "github",
        "personal projects",
        "academic projects",
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

    # =====================================================
    # 5. EDUCATION - 10 POINTS
    # =====================================================

    education_keywords = [
        "education",
        "b.tech",
        "btech",
        "bachelor",
        "bachelor of technology",
        "university",
        "college",
        "degree",
        "academic",
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

    # =====================================================
    # 6. EXPERIENCE - 10 POINTS
    # =====================================================

    experience_keywords = [
        "experience",
        "internship",
        "intern",
        "work experience",
        "professional experience",
        "employment",
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

    # =====================================================
    # 7. DEVELOPER PROFILES - 5 POINTS
    # =====================================================

    profile_keywords = [
        "linkedin",
        "github",
        "leetcode",
        "geeksforgeeks",
        "codeforces",
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

    # =====================================================
    # 8. QUANTIFIED ACHIEVEMENTS - 5 POINTS
    # =====================================================

    has_numbers = bool(
        re.search(
            r"\b\d+(?:\.\d+)?%|\b\d+\+|\b\d+\s+"
            r"(?:users|projects|members|requests|records|"
            r"students|clients|downloads)",
            text_lower,
        )
    )

    if has_numbers:
        score += 5
    else:
        suggestions.append(
            "Use numbers and measurable results to describe achievements."
        )

    # =====================================================
    # FINAL SCORE
    # =====================================================

    score = min(score, 100)

    if score >= 85:
        label = "Excellent"
    elif score >= 70:
        label = "Strong"
    elif score >= 55:
        label = "Needs Improvement"
    else:
        label = "Weak"

    # =====================================================
    # ADVICE
    # =====================================================

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