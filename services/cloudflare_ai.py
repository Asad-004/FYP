
import os
import httpx

from dotenv import load_dotenv

load_dotenv()




ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

MODEL = os.getenv(
    "CLOUDFLARE_MODEL",
    "@cf/meta/llama-3.1-8b-instruct"
)

API_URL = (
    f"https://api.cloudflare.com/client/v4/accounts/"
    f"{ACCOUNT_ID}/ai/v1/chat/completions"
)


async def generate_ai_response(system_prompt, user_prompt):

    if not ACCOUNT_ID or not API_TOKEN:
        raise RuntimeError("Cloudflare credentials missing")

    payload = {
        "model": MODEL,
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
        "temperature": 0.2,
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

        response.raise_for_status()

        data = response.json()

        if not data.get("success"):
            raise RuntimeError(
                f"Cloudflare error: {data.get('errors')}"
            )

        choices = data.get("result", {}).get("choices", [])

        if not choices:
            raise RuntimeError("AI returned no choices")

        answer = choices[0].get(
            "message", {}
        ).get("content")

        if not answer:
            raise RuntimeError("AI returned empty content")

        return answer
