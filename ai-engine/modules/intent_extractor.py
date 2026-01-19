import json
import re

def extract_json(text: str):
    """
    Extract first JSON object from text safely
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in LLM output")
    return json.loads(match.group())


def extract_intent(user_input, llm):
    prompt = f"""
You are a legal intent extraction system.

STRICT RULES:
- Output ONLY valid JSON
- No explanations
- No markdown
- No backticks

Schema:
{{
  "policy_type": string | null,
  "industry": string | null,
  "jurisdiction": string | null,
  "entity_type": string | null,
  "risk_level": "low" | "medium" | "high" | null,
  "special_conditions": string[]
}}

User input:
{user_input}
"""

    raw = llm(prompt).strip()

    if not raw:
        raise ValueError("LLM returned empty response")

    return extract_json(raw)
