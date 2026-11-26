
import logging

from fastapi import APIRouter, HTTPException

from schemas.vulnerability import VulnerabilityFinding
from services.remediation import generate_remediation

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Remediation"]
)

logger = logging.getLogger(__name__)


@router.post("/remediate")
async def remediate_vulnerability(
    finding: VulnerabilityFinding
):

    try:
        result = await generate_remediation(finding)

        return {
            "success": True,
            "status": "completed",
            "vulnerability": finding.name,
            "ai_remediation": result
        }

    except Exception:
        # Keep sensitive internal error details out of API responses
        logger.exception("AI remediation request failed")

        raise HTTPException(
            status_code=502,
            detail="AI remediation service is temporarily unavailable."
        )
