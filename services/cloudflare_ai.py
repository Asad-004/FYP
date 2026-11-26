
import os
import httpx

from pathlib import Path
from dotenv import load_dotenv

# FYP root directory
BASE_DIR = Path(__file__).resolve().parents[1]

# Load environment variables
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE, override=True)


print("ENV FILE:", ENV_FILE)
print("ENV EXISTS:", ENV_FILE.exists())
print("ACCOUNT ID:", repr(os.getenv("CLOUDFLARE_ACCOUNT_ID")))
print("ACCOUNT ID LENGTH:", len(os.getenv("CLOUDFLARE_ACCOUNT_ID", "")))

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

MODEL = os.getenv(
    "CLOUDFLARE_MODEL",
    "@cf/meta/infire-llama-3.1-8b-instruct"
)

# Standard Cloudflare Workers AI REST endpoint
API_URL = (
    f"https://api.cloudflare.com/client/v4/accounts/"
    f"{ACCOUNT_ID}/ai/run/{MODEL}"
)


async def generate_ai_response(system_prompt, user_prompt):

    if not ACCOUNT_ID or not API_TOKEN:
        raise RuntimeError("Cloudflare credentials missing")

    payload = {
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        "max_tokens": 2000
    }

    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=90) as client:

        response = await client.post(
            API_URL,
            json=payload,
            headers=headers
        )

        if response.is_error:
            raise RuntimeError(
                f"Cloudflare HTTP {response.status_code}: "
                f"{response.text[:1500]}"
            )

        data = response.json()

        if not data.get("success"):
            raise RuntimeError(
                f"Cloudflare API error: {data.get('errors')}"
            )

        result = data.get("result", {})

        answer = result.get("response")

        if not answer:
            # Support chat-completions-style response if returned
            choices = result.get("choices", [])
            if choices:
                answer = (
                    choices[0]
                    .get("message", {})
                    .get("content")
                )

        if not answer:
            raise RuntimeError("Cloudflare returned empty AI response")

        return answer
