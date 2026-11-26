import asyncio
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="ThreatLens Auditor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ZAP_API_URL = os.getenv("ZAP_API_URL", "http://localhost:8080")
ZAP_API_KEY = os.getenv("ZAP_API_KEY", "7grqlfk0v13htee2vd2j231bvj")
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")

SCANS: Dict[str, Dict[str, Any]] = {}
SCANS_LOCK = asyncio.Lock()


class ScanRequest(BaseModel):
    url: str = Field(..., min_length=1)
    includeLlm: bool = Field(default=False)
    include_llm: Optional[bool] = None

    @property
    def should_include_llm(self) -> bool:
        return self.include_llm if self.include_llm is not None else self.includeLlm


async def get_llm_remediation(vulnerability_name: str, description: str) -> str:
    prompt = (
        "Provide a concise, developer-ready remediation solution and code fix for the "
        "following security vulnerability found by OWASP ZAP:\n"
        f"Vulnerability: {vulnerability_name}\n"
        f"Description: {description}\n"
        "Keep it professional and concise (1-2 sentences max)."
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                OLLAMA_API_URL,
                json={"model": "llama3", "prompt": prompt, "stream": False},
            )
            if response.status_code == 200:
                return response.json().get(
                    "response",
                    "Apply standard secure coding controls and input validation.",
                )
    except Exception:
        pass

    return "Sanitize and validate all user inputs, and implement secure HTTP headers."


async def get_current_ascan_rule(client: httpx.AsyncClient, ascan_id: str) -> Optional[str]:
    try:
        res = await client.get(
            f"{ZAP_API_URL}/JSON/ascan/view/scanProgress/",
            params={"apikey": ZAP_API_KEY, "scanId": ascan_id},
            timeout=4.0,
        )
        if res.status_code == 200:
            data = res.json()
            progress_list = data.get("scanProgress", [])
            if (
                isinstance(progress_list, list)
                and len(progress_list) > 1
                and isinstance(progress_list[1], dict)
            ):
                for _host, host_entries in progress_list[1].items():
                    if isinstance(host_entries, list):
                        for item in host_entries:
                            if (
                                isinstance(item, dict)
                                and str(item.get("status", "")).lower() == "in progress"
                            ):
                                return item.get("name") or "Active Rule Probe"
    except Exception:
        pass
    return None


async def build_report(
    scan_id: str,
    target_url: str,
    start_time: float,
    stopped: bool = False,
    include_llm: bool = False,
) -> Dict[str, Any]:
    vulnerabilities: List[Dict[str, Any]] = []
    risk_summary = {"high": 0, "medium": 0, "low": 0}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            zap_response = await client.get(
                f"{ZAP_API_URL}/JSON/core/view/alerts/",
                params={"apikey": ZAP_API_KEY, "baseurl": target_url},
            )
            if zap_response.status_code == 200:
                alerts = zap_response.json().get("alerts", [])
                for idx, alert in enumerate(alerts[:15]):
                    risk = alert.get("risk", "Medium")
                    name = alert.get("alert", "Unknown Vulnerability")
                    desc = alert.get("description", "No description provided.")

                    risk_lower = risk.lower()
                    if risk_lower == "high":
                        risk_summary["high"] += 1
                    elif risk_lower == "medium":
                        risk_summary["medium"] += 1
                    else:
                        risk_summary["low"] += 1

                    item: Dict[str, Any] = {
                        "id": idx + 1,
                        "name": name,
                        "risk": risk,
                        "confidence": alert.get("confidence", "Medium"),
                        "description": desc,
                        "url": alert.get("url", ""),
                        "param": alert.get("param", ""),
                    }
                    if include_llm:
                        item["llmSolution"] = await get_llm_remediation(name, desc)

                    vulnerabilities.append(item)
    except Exception as e:
        print(f"[{scan_id}] Error fetching alerts: {e}")

    elapsed_sec = round(time.time() - start_time, 1)
    return {
        "scanId": scan_id,
        "targetUrl": target_url,
        "scanTime": f"{elapsed_sec}s",
        "stopped": stopped,
        "riskSummary": risk_summary,
        "vulnerabilities": vulnerabilities,
    }


async def stop_zap_processes(spider_id: Optional[str], ascan_id: Optional[str]) -> None:
    async with httpx.AsyncClient(timeout=5.0) as client:
        if spider_id:
            try:
                await client.get(
                    f"{ZAP_API_URL}/JSON/spider/action/stop/",
                    params={"apikey": ZAP_API_KEY, "scanId": spider_id},
                )
            except Exception:
                pass
        if ascan_id:
            try:
                await client.get(
                    f"{ZAP_API_URL}/JSON/ascan/action/stop/",
                    params={"apikey": ZAP_API_KEY, "scanId": ascan_id},
                )
            except Exception:
                pass
        try:
            await client.get(
                f"{ZAP_API_URL}/JSON/ascan/action/stopAllScans/",
                params={"apikey": ZAP_API_KEY},
            )
        except Exception:
            pass


async def _is_stop_requested(scan_id: str) -> bool:
    async with SCANS_LOCK:
        entry = SCANS.get(scan_id)
        return bool(entry and entry.get("stopRequested"))


async def _update_scan(scan_id: str, **fields: Any) -> None:
    async with SCANS_LOCK:
        if scan_id in SCANS:
            SCANS[scan_id].update(fields)


async def run_scan_worker(scan_id: str, target_url: str, include_llm: bool) -> None:
    start_time = time.time()
    spider_id: Optional[str] = None
    ascan_id: Optional[str] = None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Start ZAP Spider
            await _update_scan(
                scan_id,
                phase="Spidering",
                currentItem=f"Crawling {target_url}...",
                progress=8,
            )
            spider_res = await client.get(
                f"{ZAP_API_URL}/JSON/spider/action/scan/",
                params={"apikey": ZAP_API_KEY, "url": target_url},
            )
            spider_res.raise_for_status()
            spider_id = str(spider_res.json().get("scan", ""))
            await _update_scan(scan_id, spiderId=spider_id)

            while spider_id:
                if await _is_stop_requested(scan_id):
                    await stop_zap_processes(spider_id, ascan_id)
                    report = await build_report(scan_id, target_url, start_time, stopped=True, include_llm=include_llm)
                    await _update_scan(scan_id, status="stopped", phase="Stopped", progress=100, report=report)
                    return

                st_res = await client.get(
                    f"{ZAP_API_URL}/JSON/spider/view/status/",
                    params={"apikey": ZAP_API_KEY, "scanId": spider_id},
                )
                spider_pct = int(st_res.json().get("status", 100))
                mapped_pct = min(40, 8 + int(spider_pct * 0.32))
                await _update_scan(
                    scan_id,
                    phase="Spidering",
                    currentItem=f"Spider progress: {spider_pct}%",
                    progress=mapped_pct,
                    estimatedRemainingSec=max(5, int((100 - spider_pct) * 0.4) + 60),
                )
                if spider_pct >= 100:
                    break
                await asyncio.sleep(1.5)

            # 2. Start ZAP Active Scan
            await _update_scan(
                scan_id,
                phase="Active Scanning",
                currentItem="Launching active vulnerability probes...",
                progress=42,
            )
            ascan_res = await client.get(
                f"{ZAP_API_URL}/JSON/ascan/action/scan/",
                params={"apikey": ZAP_API_KEY, "url": target_url},
            )
            ascan_res.raise_for_status()
            ascan_id = str(ascan_res.json().get("scan", ""))
            await _update_scan(scan_id, ascanId=ascan_id)

            while ascan_id:
                if await _is_stop_requested(scan_id):
                    await stop_zap_processes(spider_id, ascan_id)
                    report = await build_report(scan_id, target_url, start_time, stopped=True, include_llm=include_llm)
                    await _update_scan(scan_id, status="stopped", phase="Stopped", progress=100, report=report)
                    return

                st_res = await client.get(
                    f"{ZAP_API_URL}/JSON/ascan/view/status/",
                    params={"apikey": ZAP_API_KEY, "scanId": ascan_id},
                )
                ascan_pct = int(st_res.json().get("status", 100))
                active_rule = await get_current_ascan_rule(client, ascan_id)
                mapped_pct = min(92, 42 + int(ascan_pct * 0.50))
                await _update_scan(
                    scan_id,
                    phase="Active Scanning",
                    currentItem=active_rule or f"Active scan progress: {ascan_pct}%",
                    progress=mapped_pct,
                    estimatedRemainingSec=max(2, int((100 - ascan_pct) * 0.9)),
                )
                if ascan_pct >= 100:
                    break
                await asyncio.sleep(1.5)

        # 3. Build Report + Optional LLM Remediation
        await _update_scan(
            scan_id,
            phase="Generating Report",
            currentItem="Collecting alerts and generating remediation...",
            progress=95,
            estimatedRemainingSec=3,
        )
        report = await build_report(
            scan_id=scan_id,
            target_url=target_url,
            start_time=start_time,
            stopped=False,
            include_llm=include_llm,
        )
        await _update_scan(
            scan_id,
            status="completed",
            phase="Completed",
            currentItem="Audit finished",
            progress=100,
            estimatedRemainingSec=0,
            report=report,
        )

    except Exception as exc:
        await stop_zap_processes(spider_id, ascan_id)
        await _update_scan(
            scan_id,
            status="error",
            phase="Error",
            currentItem="Scan failed",
            error=str(exc) or "Failed to communicate with OWASP ZAP.",
        )


@app.post("/api/scan/start", status_code=202)
async def start_scan(payload: ScanRequest):
    target_url = payload.url.strip()
    if not target_url:
        raise HTTPException(status_code=400, detail="URL is required")

    scan_id = str(uuid.uuid4())
    async with SCANS_LOCK:
        SCANS[scan_id] = {
            "scanId": scan_id,
            "targetUrl": target_url,
            "status": "running",
            "phase": "Starting",
            "currentItem": "Preparing OWASP ZAP scan...",
            "progress": 2,
            "estimatedRemainingSec": 115,
            "stopRequested": False,
            "report": None,
            "error": None,
        }

    asyncio.create_task(run_scan_worker(scan_id, target_url, payload.should_include_llm))
    return {"scanId": scan_id, "status": "running"}


@app.get("/api/scan/status/{scan_id}")
async def get_scan_status(scan_id: str):
    async with SCANS_LOCK:
        scan = SCANS.get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@app.post("/api/scan/stop/{scan_id}")
async def stop_scan(scan_id: str):
    async with SCANS_LOCK:
        scan = SCANS.get(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        scan["stopRequested"] = True
        scan["phase"] = "Stopping"
        scan["currentItem"] = "Stopping ZAP spider & active scan..."
        spider_id = scan.get("spiderId")
        ascan_id = scan.get("ascanId")

    await stop_zap_processes(spider_id, ascan_id)

    deadline = time.time() + 4.0
    while time.time() < deadline:
        async with SCANS_LOCK:
            current = SCANS.get(scan_id, {})
            if current.get("status") in ("stopped", "completed", "error") and current.get("report"):
                break
        await asyncio.sleep(0.3)

    async with SCANS_LOCK:
        current = SCANS.get(scan_id, {})
        return {
            "scanId": scan_id,
            "status": current.get("status", "stopping"),
            "report": current.get("report"),
        }


@app.post("/api/scan")
async def legacy_scan_target(payload: ScanRequest):
    target_url = payload.url.strip()
    if not target_url:
        raise HTTPException(status_code=400, detail="URL is required")
    return await build_report(
        scan_id="sync",
        target_url=target_url,
        start_time=time.time(),
        stopped=False,
        include_llm=payload.should_include_llm,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)