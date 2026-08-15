import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Channel, Message, User
from app.schemas import MessageOut
from app.security import decode_token

router = APIRouter()

MAX_BODY = 2000

# one process, one registry: a user has one entry per open tab
connections: dict[int, set[WebSocket]] = {}


def register(user_id: int, sock: WebSocket) -> None:
    connections.setdefault(user_id, set()).add(sock)


def unregister(user_id: int, sock: WebSocket) -> None:
    socks = connections.get(user_id)
    if not socks:
        return
    socks.discard(sock)
    if not socks:
        connections.pop(user_id, None)


def recipients(channel: Channel) -> list[int]:
    if channel.kind == "dm":
        return [i for i in (channel.user_a_id, channel.user_b_id) if i]
    return list(connections)


async def send_to(user_ids: list[int], payload: dict) -> None:
    for user_id in user_ids:
        for sock in list(connections.get(user_id, ())):
            try:
                await sock.send_json(payload)
            except Exception:
                unregister(user_id, sock)


def store(
    user_id: int, channel_id: int, body: str, image_url: str | None
) -> tuple[Channel, dict] | None:
    """Persist one message, or None if the channel is not the user's to post in."""
    db = SessionLocal()
    try:
        channel = db.get(Channel, channel_id)
        if channel is None:
            return None
        if channel.kind == "dm" and user_id not in (channel.user_a_id, channel.user_b_id):
            return None

        message = Message(
            channel_id=channel_id,
            user_id=user_id,
            body=body or None,
            image_url=image_url,
        )
        db.add(message)
        db.commit()
        # session is still open, so the author loads for the payload
        payload = MessageOut.model_validate(message).model_dump(mode="json")
        return channel, {"type": "message", **payload}
    finally:
        db.close()


@router.websocket("/ws")
async def socket(ws: WebSocket, token: str = ""):
    user_id = decode_token(token)
    if user_id is None:
        await ws.close(code=1008)
        return

    db = SessionLocal()
    try:
        known = db.scalar(select(User.id).where(User.id == user_id))
    finally:
        db.close()
    if known is None:
        await ws.close(code=1008)
        return

    await ws.accept()
    register(user_id, ws)
    try:
        while True:
            data = await ws.receive_json()
            if not isinstance(data, dict) or data.get("type") != "send":
                continue
            body = (data.get("body") or "").strip()[:MAX_BODY]
            channel_id = data.get("channel_id")
            image_url = data.get("image_url")
            # only paths this server handed out, never an arbitrary url
            if not isinstance(image_url, str) or not image_url.startswith("/uploads/"):
                image_url = None
            if (not body and not image_url) or not isinstance(channel_id, int):
                continue

            stored = store(user_id, channel_id, body, image_url)
            if stored is None:
                continue
            channel, payload = stored
            await send_to(recipients(channel), payload)

            # imported here because barkley imports this module for fan-out
            from app import barkley

            # he thinks for a few seconds; this socket must keep reading
            asyncio.create_task(barkley.on_message(channel.id, user_id, body))
    except WebSocketDisconnect:
        pass
    finally:
        unregister(user_id, ws)
