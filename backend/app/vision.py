import base64
import json
import re

import httpx

from app.config import settings

TIMEOUT = 20.0

PROMPT = (
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
            text = await _gemini(image, mime)
        else:
            text = await _ollama(image)
    except Exception:
        return None, None
    return _parse(text)


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


async def _gemini(image: bytes, mime: str) -> str:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    body = {
        "contents": [
            {
                "parts": [
                    {"text": PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime,
                            "data": base64.b64encode(image).decode(),
                        }
                    },
                ]
            }
        ]
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(url, json=body, params={"key": settings.gemini_api_key})
        res.raise_for_status()
        parts = res.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts)


async def _ollama(image: bytes) -> str:
    body = {
        "model": settings.ollama_model,
        "prompt": PROMPT,
        "images": [base64.b64encode(image).decode()],
        "stream": False,
        "think": False,
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        res = await client.post(f"{settings.ollama_url}/api/generate", json=body)
        res.raise_for_status()
        return res.json().get("response", "")
