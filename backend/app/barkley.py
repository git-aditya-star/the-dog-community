import re

from sqlalchemy import select

from app.db import SessionLocal
from app.llm import chat
from app.models import Channel, Dog, Message, User
from app.schemas import MessageOut
from app.ws import recipients, send_to

USERNAME = "barkley"
WELCOME_CHANNEL = "general"
HISTORY = 10
MAX_REPLY = 600

PERSONA = (
    "You are Barkley, a golden retriever who lives in The Dog Community, a chat "
    "app for dog owners. You are the resident know-it-all: warm, enthusiastic, "
    "a little smug about how much you know, and every so often distracted by "
    "being a dog. Reply in one or two short sentences, plain text, no markdown "
    "and no lists. Never break character and never explain what you are — you "
    "are a dog with strong opinions about dogs."
)

# word -> the fact barkley must not get wrong
DANGER = {
    "chocolate": "chocolate holds theobromine, which dogs cannot clear the way people do",
    "grapes": "grapes can cause sudden kidney failure in dogs, even a small handful",
    "raisins": "raisins carry the same kidney risk as grapes, concentrated",
    "xylitol": "xylitol crashes a dog's blood sugar within minutes and wrecks the liver",
    "ibuprofen": "ibuprofen burns a dog's stomach lining and damages the kidneys",
    "onion": "onion damages a dog's red blood cells, raw or cooked",
    "onions": "onions damage a dog's red blood cells, raw or cooked",
}


def _bot(db) -> User | None:
    return db.scalar(select(User).where(User.username == USERNAME))


def _danger(body: str) -> tuple[str, str] | None:
    low = body.lower()
    for word, fact in DANGER.items():
        if re.search(rf"\b{word}\b", low):
            return word, fact
    return None


def _prompt(db, channel: Channel, task: str) -> str:
    dogs = db.scalars(select(Dog).order_by(Dog.id)).unique().all()
    pack = "\n".join(
        f"- {d.name}, {d.breed or 'breed unknown'}, owned by {d.owner.display_name}."
        f" {(d.ai_notes or '').strip()}"
        for d in dogs
    )
    rows = db.scalars(
        select(Message)
        .where(Message.channel_id == channel.id)
        .order_by(Message.id.desc())
        .limit(HISTORY)
    ).unique().all()
    recent = "\n".join(f"{m.user.display_name}: {m.body}" for m in reversed(rows) if m.body)
    where = f"#{channel.name}" if channel.kind == "public" else "a private message"

    return (
        f"{PERSONA}\n\n"
        f"The dogs in this community:\n{pack or '- nobody has added a dog yet'}\n\n"
        f"The last few messages in {where}:\n{recent or '(nothing yet)'}\n\n"
        f"{task}"
    )


def _persist(bot_id: int, channel_id: int, text: str) -> dict:
    db = SessionLocal()
    try:
        message = Message(channel_id=channel_id, user_id=bot_id, body=text[:MAX_REPLY])
        db.add(message)
        db.commit()
        # session is still open, so the author loads for the payload
        payload = MessageOut.model_validate(message).model_dump(mode="json")
        return {"type": "message", **payload}
    finally:
        db.close()


async def _speak(channel: Channel, bot_id: int, prompt: str) -> None:
    """Type, think, then post — or type, fail, and stop typing."""
    to = recipients(channel)
    typing = {"type": "typing", "channel_id": channel.id, "name": "Barkley"}
    await send_to(to, {**typing, "on": True})

    text = await chat(prompt)
    if not text:
        # an off frame, or a dead provider leaves him typing forever
        await send_to(to, {**typing, "on": False})
        return
    await send_to(to, _persist(bot_id, channel.id, text))


async def on_message(channel_id: int, user_id: int, body: str) -> None:
    """Decide whether Barkley has anything to say, and say it.

    Runs as a fire-and-forget task, so it swallows everything.
    """
    try:
        db = SessionLocal()
        try:
            bot = _bot(db)
            channel = db.get(Channel, channel_id)
            if bot is None or channel is None or bot.id == user_id:
                return

            mentioned = "@barkley" in body.lower()
            private = channel.kind == "dm" and bot.id in (channel.user_a_id, channel.user_b_id)
            danger = _danger(body)

            if danger and not (mentioned or private):
                word, fact = danger
                task = (
                    f"Someone just mentioned {word}. Cut in unprompted and warn them:"
                    f" {fact}. Say it as yourself — alarmed and helpful, not a lecture."
                )
            elif mentioned or private:
                task = "Reply to the last message."
                if danger:
                    task += f" Also warn them: {danger[1]}."
            else:
                return

            prompt = _prompt(db, channel, task)
            bot_id = bot.id
        finally:
            db.close()

        await _speak(channel, bot_id, prompt)
    except Exception:
        pass


async def welcome_dog(dog_id: int) -> None:
    """Greet a dog that was just added, in #general. Fire-and-forget too."""
    try:
        db = SessionLocal()
        try:
            bot = _bot(db)
            dog = db.get(Dog, dog_id)
            channel = db.scalar(
                select(Channel).where(
                    Channel.kind == "public", Channel.name == WELCOME_CHANNEL
                )
            )
            if bot is None or dog is None or channel is None or dog.user_id == bot.id:
                return

            task = (
                f"{dog.owner.display_name} has just added their dog to the community."
                f" Name: {dog.name}. Breed: {dog.breed or 'not sure'}."
                f" What the photo shows: {(dog.ai_notes or 'no description').strip()}"
                f"\n\nWelcome {dog.name} by name, and say one specific thing about that"
                " breed that shows you know your stuff."
            )
            prompt = _prompt(db, channel, task)
            bot_id = bot.id
        finally:
            db.close()

        await _speak(channel, bot_id, prompt)
    except Exception:
        pass
