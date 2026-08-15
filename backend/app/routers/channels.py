from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Channel, Message, User
from app.schemas import ChannelOut, DmIn, MessageOut, UserOut
from app.security import current_user

router = APIRouter(prefix="/api", tags=["channels"])

HISTORY_LIMIT = 50


def visible_channel(db: Session, user: User, channel_id: int) -> Channel:
    """A channel the user may read and post to, or 404."""
    channel = db.get(Channel, channel_id)
    if channel is None:
        raise HTTPException(status_code=404, detail="No such channel")
    if channel.kind == "dm" and user.id not in (channel.user_a_id, channel.user_b_id):
        raise HTTPException(status_code=404, detail="No such channel")
    return channel


def as_out(db: Session, channel: Channel, me_id: int) -> ChannelOut:
    """A channel as one viewer sees it — a dm carries the other person."""
    other = None
    if channel.kind == "dm":
        other_id = channel.user_b_id if channel.user_a_id == me_id else channel.user_a_id
        other = db.get(User, other_id)
    return ChannelOut(
        id=channel.id,
        kind=channel.kind,
        name=channel.name,
        topic=channel.topic,
        other=UserOut.model_validate(other) if other else None,
    )


@router.get("/channels", response_model=list[ChannelOut])
def list_channels(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Channel)
        .where(
            or_(
                Channel.kind == "public",
                Channel.user_a_id == user.id,
                Channel.user_b_id == user.id,
            )
        )
        .order_by(Channel.id)
    ).all()
    return [as_out(db, c, user.id) for c in rows]


@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(User).where(User.id != user.id).order_by(User.display_name)
    ).all()


@router.post("/dms", response_model=ChannelOut)
def open_dm(
    payload: DmIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Get-or-create the dm with one other person."""
    other = db.get(User, payload.user_id)
    if other is None or other.id == user.id:
        raise HTTPException(status_code=404, detail="No such person")

    # lower id first, so the partial unique index prevents duplicates
    a_id, b_id = sorted((user.id, other.id))
    channel = db.scalar(
        select(Channel).where(
            Channel.kind == "dm",
            Channel.user_a_id == a_id,
            Channel.user_b_id == b_id,
        )
    )
    if channel is None:
        channel = Channel(kind="dm", user_a_id=a_id, user_b_id=b_id)
        db.add(channel)
        db.commit()
    return as_out(db, channel, user.id)


@router.get("/channels/{channel_id}/messages", response_model=list[MessageOut])
def history(
    channel_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    visible_channel(db, user, channel_id)
    rows = db.scalars(
        select(Message)
        .where(Message.channel_id == channel_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(HISTORY_LIMIT)
    ).all()
    # newest 50 fetched descending, handed back oldest-first for display
    return list(reversed(rows))
