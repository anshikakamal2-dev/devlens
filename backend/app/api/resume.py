from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.resume_service import (
    extract_resume_text,
    analyze_resume_text,
)

router = APIRouter(
    prefix="/api/resume",
    tags=["Resume"]
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...)
):
    try:
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file selected."
            )

        filename = file.filename.lower()

        if not (
            filename.endswith(".pdf")
            or filename.endswith(".docx")
        ):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported."
            )

        file_bytes = await file.read(MAX_FILE_SIZE + 1)

        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Resume file is too large. Maximum size is 5 MB."
            )

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )

        text = extract_resume_text(
            filename,
            file_bytes
        )

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the resume."
            )

        result = analyze_resume_text(text)

        return {
            "success": True,
            "score": result["score"],
            "label": result["label"],
            "advice": result["advice"],
        }

    except HTTPException:
        raise

    except Exception as e:
        print("RESUME ANALYZER ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to analyze resume."
        )