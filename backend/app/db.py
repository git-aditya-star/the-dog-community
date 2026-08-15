import uuid
from pathlib import Path

from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    # every table is emitted as dog.<table>, never public.<table>
    metadata = MetaData(schema=settings.db_schema)


DEFAULT_CHANNELS = [
    ("general", "Where the whole pack hangs out"),
    ("puppy-training", "Chewed furniture, shared wisdom"),
    ("breed-talk", "Ask Barkley, he has opinions"),
]


BARKLEY_PHOTO = Path(__file__).parent / "assets" / "barkley.jpg"
BARKLEY_NOTES = (
    "A golden retriever with an unreasonable amount of opinions, a permanent "
    "grin and a habit of answering questions nobody asked him."
)


def init_db() -> None:
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{settings.db_schema}"'))
    Base.metadata.create_all(engine)
    seed_channels()
    seed_barkley()


def seed_channels() -> None:
    from app.models import Channel

    db = SessionLocal()
    try:
        existing = {c.name for c in db.query(Channel).filter(Channel.kind == "public")}
        for name, topic in DEFAULT_CHANNELS:
            if name not in existing:
                db.add(Channel(kind="public", name=name, topic=topic))
        db.commit()
    finally:
        db.close()


def barkley_photo() -> str | None:
    """Copy the shipped photo into uploads/, which is not in the repo."""
    from app.routers.uploads import UPLOAD_DIR

    if not BARKLEY_PHOTO.is_file():
        return None
    UPLOAD_DIR.mkdir(exist_ok=True)
    target = UPLOAD_DIR / BARKLEY_PHOTO.name
    if not target.is_file():
        target.write_bytes(BARKLEY_PHOTO.read_bytes())
    return f"/uploads/{BARKLEY_PHOTO.name}"


def seed_barkley() -> None:
    """The bot is a member, so he gets a real user row and a real dog card."""
    from app.models import Dog, User
    from app.security import hash_password

    photo = barkley_photo()
    db = SessionLocal()
    try:
        bot = db.query(User).filter(User.username == "barkley").first()
        if bot is None:
            bot = User(
                username="barkley",
                display_name="Barkley",
                # a random secret nobody holds, so he cannot be logged into
                password_hash=hash_password(uuid.uuid4().hex),
                avatar_url=photo,
                is_bot=True,
            )
            db.add(bot)
            db.commit()
        if db.query(Dog).filter(Dog.user_id == bot.id).first() is None:
            db.add(
                Dog(
                    user_id=bot.id,
                    name="Barkley",
                    breed="Golden Retriever",
                    photo_url=photo,
                    ai_notes=BARKLEY_NOTES,
                )
            )
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
