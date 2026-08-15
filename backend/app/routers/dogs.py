from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Dog, User
from app.routers.uploads import UPLOAD_DIR
from app.schemas import DogIn, DogOut
from app.security import current_user
from app.vision import describe_dog

router = APIRouter(prefix="/api", tags=["dogs"])

MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


@router.get("/dogs", response_model=list[DogOut])
def list_dogs(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    return db.scalars(select(Dog).order_by(Dog.id)).unique().all()


@router.post("/dogs", response_model=DogOut, status_code=201)
async def add_dog(
    payload: DogIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Your dog needs a name")

    # only paths this server wrote, the same guard the socket uses on images
    if not payload.photo_url.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="That photo is not one of ours")

    # .name drops any traversal the prefix check would otherwise allow
    path = UPLOAD_DIR / Path(payload.photo_url).name
    if not path.is_file():
        raise HTTPException(status_code=400, detail="That photo is missing")

    breed, notes = await describe_dog(
        path.read_bytes(), MIME.get(path.suffix.lower(), "image/jpeg")
    )

    dog = Dog(
        user_id=user.id,
        name=name,
        photo_url=payload.photo_url,
        breed=breed,
        ai_notes=notes,
    )
    db.add(dog)
    db.commit()
    db.refresh(dog)
    return dog
