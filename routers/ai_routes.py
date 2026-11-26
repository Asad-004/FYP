
from fastapi import APIRouter, HTTPException

from app.schemas.vulnerability import VulnerabilityFinding
from app.services.remediation import generate_remediation

router = APIRouter(
    prefix="/api/ai",
    tags=["AI Remediation"]
)


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

    except Exception as e:

        raise HTTPException(
            status_code=502,
            detail=f"AI remediation failed: {str(e)}"
        )
