import base64
import json
import re
from pathlib import Path

import httpx

from app.config import settings

TIMEOUT = 20.0

MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

VISION_PROMPT = (
    "This is a photo of someone's pet dog. Reply with JSON and nothing else, "
    'in the form {"breed": "...", "notes": "..."}. "breed" is the most likely '
    'breed in two or three words. "notes" is two or three warm sentences about '
    "how this particular dog looks and comes across. No code fence, no markdown."
)


async def describe_dog(image: bytes, mime: str) -> tuple[str | None, str | None]:
    """One vision pass, returning (breed, notes).

    Never raises: a dead provider means a dog with no breed, not a failed
    registration.
    """
    try:
        if settings.gemini_api_key:
            text = await _gemini(VISION_PROMPT, image, mime)
        else:
            text = await _ollama(VISION_PROMPT, image)
    except Exception:
        return None, None
    return _parse(text)


async def chat(prompt: str, image: bytes | None = None, mime: str = "") -> str | None:
    """One completion, with a photo attached when there is one to look at.

    Never raises either: a dead provider means Barkley stays quiet, not a
    broken socket or a failed request.
    """
    try:
        if settings.gemini_api_key:
            text = await _gemini(prompt, image, mime)
        else:
            text = await _ollama(prompt, image)
    except Exception:
        return None
    return (text or "").strip() or None


def mime_for(path: Path) -> str:
    return MIME.get(path.suffix.lower(), "image/jpeg")


def _parse(text: str) -> tuple[str | None, str | None]:
    text = (text or "").strip()
    if not text:
        return None, None

    # models like to wrap json in prose or a fence, so take the first object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            breed = (data.get("breed") or "").strip()[:120] or None
            notes = (data.get("notes") or "").strip() or None
            return breed, notes
        except (json.JSONDecodeError, AttributeError):
            pass

    # unparseable is still worth keeping — barkley can read prose
    return None, text


async def _gemini(prompt: str, image: bytes | None = None, mime: str = "") -> str:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    parts: list[dict] = [{"text": prompt}]
    if image is not None:
        parts.append(
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode()}}
        )
    body = {"contents": [{"parts": parts}]}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(url, json=body, params={"key": settings.gemini_api_key})
        res.raise_for_status()
        out = res.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in out)


async def _ollama(prompt: str, image: bytes | None = None) -> str:
    body = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "think": False,
    }
    if image is not None:
        body["images"] = [base64.b64encode(image).decode()]
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(f"{settings.ollama_url}/api/generate", json=body)
        res.raise_for_status()
        return res.json().get("response", "")
