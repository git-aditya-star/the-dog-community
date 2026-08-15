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


def init_db() -> None:
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{settings.db_schema}"'))
    Base.metadata.create_all(engine)
    seed_channels()


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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
