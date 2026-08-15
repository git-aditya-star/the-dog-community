import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.models import User
from app.schemas import UploadOut
from app.security import current_user

router = APIRouter(prefix="/api", tags=["uploads"])

# relative to the cwd uvicorn is started from, i.e. backend/
UPLOAD_DIR = Path("uploads")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_BYTES = 5 * 1024 * 1024


@router.post("/uploads", response_model=UploadOut)
async def upload(
    file: UploadFile = File(...),
    user: User = Depends(current_user),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Images only — jpg, png, gif or webp")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="That file is empty")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="That image is over 5 MB")

    UPLOAD_DIR.mkdir(exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    return UploadOut(url=f"/uploads/{name}")
