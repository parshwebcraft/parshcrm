"""AI-generated call summary using Claude Sonnet via Emergent Universal Key."""
import json
import os
import re
import uuid
from typing import Optional

MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-6"

SYSTEM_PROMPT = (
    "You are an AI sales assistant for a B2B CRM called Facets CRM AI. "
    "Given the raw notes from a sales call, produce a concise structured "
    "summary in strict JSON with the keys: summary (string, 2-3 sentences), "
    "sentiment (one of: positive, neutral, negative), lead_score (integer 0-100), "
    "next_action (short imperative sentence). Output ONLY the JSON object, no prose."
)


def _parse_json(text: str) -> Optional[dict]:
    """Pull the first {...} block out of the model response and json.loads it."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


async def generate_call_summary(*, notes: str, duration_sec: int, outcome: str, lead_name: str = "") -> dict:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return _fallback(notes, outcome)

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    chat = LlmChat(
        api_key=api_key,
        session_id=f"call-{uuid.uuid4()}",
        system_message=SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    user_text = (
        f"Lead: {lead_name or 'Unknown'}\n"
        f"Call duration: {duration_sec} seconds\n"
        f"Outcome: {outcome}\n"
        f"Notes: {notes or '(no notes provided)'}\n\n"
        "Return JSON only."
    )

    try:
        response = await chat.send_message(UserMessage(text=user_text))
        text = response if isinstance(response, str) else str(response)
        parsed = _parse_json(text)
        if parsed and all(k in parsed for k in ("summary", "sentiment", "lead_score", "next_action")):
            parsed["lead_score"] = max(0, min(100, int(parsed.get("lead_score", 50))))
            return parsed
    except Exception as exc:  # noqa: BLE001
        print(f"[ai_summary] LLM error: {exc}")

    return _fallback(notes, outcome)


def _fallback(notes: str, outcome: str) -> dict:
    return {
        "summary": notes[:240] if notes else f"Call ended with outcome: {outcome}.",
        "sentiment": "neutral",
        "lead_score": 55,
        "next_action": "Follow up within 3 days.",
    }
