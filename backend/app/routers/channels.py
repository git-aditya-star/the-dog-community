from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Channel, Message, User
from app.schemas import ChannelOut, MessageOut
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
    return rows


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
