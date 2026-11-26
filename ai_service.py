import json
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
MODEL = os.getenv("CLOUDFLARE_MODEL", "@cf/meta/llama-3.1-8b-instruct").strip()


def get_cloudflare_status() -> Dict[str, Any]:
    configured = bool(ACCOUNT_ID and API_TOKEN)
    return {
        "configured": configured,
        "model": MODEL,
        "accountIdPresent": bool(ACCOUNT_ID),
        "apiTokenPresent": bool(API_TOKEN),
        "error": None if configured else "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN",
    }


def _extract_json_object(raw_text: str) -> Optional[Dict[str, Any]]:
    cleaned = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        raw_text.strip(),
        flags=re.MULTILINE | re.IGNORECASE,
    )
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = cleaned[start : end + 1]
        # Fix trailing commas before } or ] that smaller models sometimes emit
        candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return None


async def _call_cloudflare(prompt: str, max_tokens: int = 2200) -> str:
    status = get_cloudflare_status()
    if not status["configured"]:
        raise RuntimeError(status["error"])

    api_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    answer = data.get("result", {}).get("response", "")
    if not answer:
        raise RuntimeError("Cloudflare returned an empty response.")
    return answer


async def analyze_vulnerability(finding: Dict[str, Any]) -> Dict[str, Any]:
    safe_finding = {
        "alert": str(finding.get("alert") or finding.get("name") or "")[:300],
        "risk": str(finding.get("risk") or "")[:50],
        "description": str(finding.get("description") or "")[:2000],
        "url": str(finding.get("url") or "")[:800],
        "param": str(finding.get("param") or "")[:200],
    }

    prompt = f"""
Provide a concise security solution for this finding as valid JSON only.
Do NOT write step-by-step commentary or markdown fences outside JSON.

{{
  "summary": "Short 1-2 sentence explanation",
  "remediation_steps": ["Actionable fix step 1", "Actionable fix step 2"],
  "code_examples": "Short code or header fix"
}}

FINDING:
{json.dumps(safe_finding, ensure_ascii=False)}
"""
    raw_answer = await _call_cloudflare(prompt, max_tokens=1000)
    parsed = _extract_json_object(raw_answer)
    if parsed:
        return parsed

    return {
        "summary": "",
        "remediation_steps": [],
        "code_examples": "",
    }


async def analyze_full_report(report: Dict[str, Any]) -> Dict[str, Any]:
    """Returns concise Cloudflare AI solutions for each vulnerability in the report."""
    vulnerabilities: List[Dict[str, Any]] = report.get("vulnerabilities") or []

    compact_findings = [
        {
            "id": v.get("id", idx + 1),
            "name": str(v.get("name", ""))[:200],
            "risk": str(v.get("risk", "Medium"))[:40],
            "url": str(v.get("url") or v.get("section") or "")[:400],
            "param": str(v.get("param") or "")[:150],
            "description": str(v.get("description") or "")[:700],
        }
        for idx, v in enumerate(vulnerabilities[:25])
    ]

    prompt = f"""
Analyze each finding and return ONLY valid JSON with solutions for each vulnerability.
No prose, no steps outside JSON, no markdown fences.

{{
  "errorSolutions": [
    {{
      "findingId": 1,
      "errorName": "Vulnerability name",
      "risk": "High/Medium/Low",
      "solutionSummary": "Direct fix in 1-2 sentences",
      "steps": ["Fix step 1", "Fix step 2"],
      "codeExample": "Exact code or header fix"
    }}
  ]
}}

FINDINGS:
{json.dumps(compact_findings, ensure_ascii=False)}
"""

    raw_answer = await _call_cloudflare(prompt, max_tokens=2400)
    parsed = _extract_json_object(raw_answer)

    if parsed and isinstance(parsed.get("errorSolutions"), list):
        return {"errorSolutions": parsed["errorSolutions"]}

    # Fallback: build clean entries directly from vulnerabilities if JSON couldn't be parsed
    return {
        "errorSolutions": [
            {
                "findingId": v.get("id", idx + 1),
                "errorName": v.get("name", "Vulnerability"),
                "risk": v.get("risk", "Medium"),
                "solutionSummary": "Apply input validation, least privilege, or secure header configuration for this finding.",
                "steps": [],
                "codeExample": "",
            }
            for idx, v in enumerate(vulnerabilities[:15])
        ]
    }