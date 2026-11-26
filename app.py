import threading
import time
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

ZAP_API_URL = "http://127.0.0.1:8081"
ZAP_API_KEY = "threatlens123"
OLLAMA_API_URL = "http://localhost:11434/api/generate"

SCANS = {}
SCANS_LOCK = threading.Lock()

@app.route("/api/zap/health", methods=["GET"])
def zap_health():
    try:
        response = requests.get(
            f"{ZAP_API_URL}/JSON/core/view/version/",
            params={"apikey": ZAP_API_KEY},
            timeout=10
        )

        response.raise_for_status()
        data = response.json()

        return jsonify({
            "status": "connected",
            "zap_version": data.get("version")
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "disconnected",
            "error": str(e)
        }), 500


    
def get_llm_remediation(vulnerability_name, description):
    prompt = (
        f"Provide a concise, developer-ready remediation solution and code fix for the following security vulnerability found by OWASP ZAP:\n"
        f"Vulnerability: {vulnerability_name}\n"
        f"Description: {description}\n"
        f"Keep it professional and concise (1-2 sentences max)."
    )
    try:
        response = requests.post(
            OLLAMA_API_URL,
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=10,
        )
        if response.status_code == 200:
            return response.json().get(
                "response",
                "Apply standard secure coding controls and input validation.",
            )
    except Exception:
        pass

    return "Sanitize and validate all user inputs, and implement secure HTTP headers."


def get_current_ascan_rule(ascan_id):
    """Best-effort lookup of the active scan rule/policy currently running in ZAP."""
    try:
        res = requests.get(
            f"{ZAP_API_URL}/JSON/ascan/view/scanProgress/",
            params={"apikey": ZAP_API_KEY, "scanId": ascan_id},
            timeout=4,
        )
        if res.status_code == 200:
            data = res.json()
            progress_list = data.get("scanProgress", [])
            if isinstance(progress_list, list) and len(progress_list) > 1 and isinstance(progress_list[1], dict):
                for _host, host_entries in progress_list[1].items():
                    if isinstance(host_entries, list):
                        for item in host_entries:
                            if isinstance(item, dict) and str(item.get("status", "")).lower() == "in progress":
                                return item.get("name") or "Active Rule Probe"
    except Exception:
        pass
    return None


def build_report(scan_id, target_url, start_time, stopped=False, include_llm=False):
    vulnerabilities = []
    risk_summary = {"high": 0, "medium": 0, "low": 0}

    try:
        zap_response = requests.get(
            f"{ZAP_API_URL}/JSON/core/view/alerts/",
            params={"apikey": ZAP_API_KEY, "baseurl": target_url},
            timeout=10,
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

                item = {
                    "id": idx + 1,
                    "name": name,
                    "risk": risk,
                    "confidence": alert.get("confidence", "Medium"),
                    "description": desc,
                    "url": alert.get("url", ""),
                    "param": alert.get("param", ""),
                }
                if include_llm:
                    item["llmSolution"] = get_llm_remediation(name, desc)

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


def stop_zap_processes(spider_id=None, ascan_id=None):
    """Immediately stop spider and active scan processes in OWASP ZAP."""
    if spider_id:
        try:
            requests.get(
                f"{ZAP_API_URL}/JSON/spider/action/stop/",
                params={"apikey": ZAP_API_KEY, "scanId": spider_id},
                timeout=5,
            )
        except Exception:
            pass
    try:
        requests.get(
            f"{ZAP_API_URL}/JSON/spider/action/stopAllScans/",
            params={"apikey": ZAP_API_KEY},
            timeout=5,
        )
    except Exception:
        pass

    if ascan_id:
        try:
            requests.get(
                f"{ZAP_API_URL}/JSON/ascan/action/stop/",
                params={"apikey": ZAP_API_KEY, "scanId": ascan_id},
                timeout=5,
            )
        except Exception:
            pass
    try:
        requests.get(
            f"{ZAP_API_URL}/JSON/ascan/action/stopAllScans/",
            params={"apikey": ZAP_API_KEY},
            timeout=5,
        )
    except Exception:
        pass


def update_scan(scan_id, **kwargs):
    with SCANS_LOCK:
        if scan_id in SCANS:
            SCANS[scan_id].update(kwargs)


def run_scan_worker(scan_id, target_url, max_spider_sec=25, max_ascan_sec=90, include_llm=False):
    start_time = time.time()
    spider_id = None
    ascan_id = None

    def is_stop_requested():
        with SCANS_LOCK:
            return bool(SCANS.get(scan_id, {}).get("stopRequested"))

    try:
        # 1. Start Spider (0% -> 35% of overall progress)
        update_scan(
            scan_id,
            phase="Spidering",
            currentItem=f"Crawling links on {target_url}",
            progress=5,
            estimatedRemainingSec=max_spider_sec + max_ascan_sec,
        )
        spider_res = requests.get(
            f"{ZAP_API_URL}/JSON/spider/action/scan/",
            params={"apikey": ZAP_API_KEY, "url": target_url},
            timeout=10,
        )
        spider_id = spider_res.json().get("scan")
        update_scan(scan_id, spiderId=spider_id)

        if spider_id:
            spider_start = time.time()
            while time.time() - spider_start < max_spider_sec:
                if is_stop_requested():
                    break
                spider_pct = 0
                try:
                    s_res = requests.get(
                        f"{ZAP_API_URL}/JSON/spider/view/status/",
                        params={"apikey": ZAP_API_KEY, "scanId": spider_id},
                        timeout=5,
                    )
                    if s_res.status_code == 200:
                        spider_pct = min(100, max(0, int(float(s_res.json().get("status", 0)))))
                except Exception:
                    pass

                if is_stop_requested():
                    break

                overall_pct = int(5 + (spider_pct / 100.0) * 30)
                rem_spider = max(0, int(max_spider_sec - (time.time() - spider_start)))
                update_scan(
                    scan_id,
                    phase="Spidering",
                    currentItem=f"Discovering endpoints ({spider_pct}%)",
                    progress=overall_pct,
                    estimatedRemainingSec=rem_spider + max_ascan_sec,
                )
                if spider_pct >= 100:
                    break
                time.sleep(1.5)

        if is_stop_requested():
            stop_zap_processes(spider_id=spider_id, ascan_id=ascan_id)
            report = build_report(scan_id, target_url, start_time, stopped=True, include_llm=include_llm)
            update_scan(
                scan_id,
                status="stopped",
                phase="Stopped",
                currentItem="Scan stopped by user — partial report ready",
                progress=100,
                estimatedRemainingSec=0,
                report=report,
            )
            return

        # 2. Start Active Scan (35% -> 95% of overall progress)
        update_scan(
            scan_id,
            phase="Active Scan",
            currentItem="Initializing vulnerability attack rules",
            progress=35,
            estimatedRemainingSec=max_ascan_sec,
        )
        ascan_res = requests.get(
            f"{ZAP_API_URL}/JSON/ascan/action/scan/",
            params={"apikey": ZAP_API_KEY, "url": target_url},
            timeout=10,
        )
        ascan_id = ascan_res.json().get("scan")
        update_scan(scan_id, ascanId=ascan_id)

        if ascan_id:
            ascan_start = time.time()
            while time.time() - ascan_start < max_ascan_sec:
                if is_stop_requested():
                    break
                ascan_pct = 0
                try:
                    a_res = requests.get(
                        f"{ZAP_API_URL}/JSON/ascan/view/status/",
                        params={"apikey": ZAP_API_KEY, "scanId": ascan_id},
                        timeout=5,
                    )
                    if a_res.status_code == 200:
                        ascan_pct = min(100, max(0, int(float(a_res.json().get("status", 0)))))
                except Exception:
                    pass

                if is_stop_requested():
                    break

                elapsed_ascan = time.time() - ascan_start
                if ascan_pct > 0:
                    est_total_ascan = elapsed_ascan / (ascan_pct / 100.0)
                    rem_ascan = max(0, int(est_total_ascan - elapsed_ascan))
                else:
                    rem_ascan = max(0, int(max_ascan_sec - elapsed_ascan))

                active_rule = get_current_ascan_rule(ascan_id)
                overall_pct = int(35 + (ascan_pct / 100.0) * 60)

                update_scan(
                    scan_id,
                    phase="Active Scan",
                    currentItem=active_rule or f"Testing vulnerability payloads ({ascan_pct}%)",
                    progress=overall_pct,
                    estimatedRemainingSec=rem_ascan,
                )
                if ascan_pct >= 100:
                    break
                time.sleep(1.5)

        stopped_flag = is_stop_requested()
        if stopped_flag:
            stop_zap_processes(spider_id=spider_id, ascan_id=ascan_id)

        # 3. Collect Report (95% -> 100%)
        update_scan(
            scan_id,
            phase="Reporting",
            currentItem="Collecting alerts & building report",
            progress=96,
            estimatedRemainingSec=1,
        )
        report = build_report(scan_id, target_url, start_time, stopped=stopped_flag, include_llm=include_llm)

        update_scan(
            scan_id,
            status="stopped" if stopped_flag else "completed",
            phase="Stopped" if stopped_flag else "Completed",
            currentItem="Scan stopped — report generated" if stopped_flag else "Scan completed",
            progress=100,
            estimatedRemainingSec=0,
            report=report,
        )

    except Exception as e:
        stop_zap_processes(spider_id=spider_id, ascan_id=ascan_id)
        update_scan(
            scan_id,
            status="error",
            phase="Error",
            currentItem=str(e),
            estimatedRemainingSec=0,
            error=str(e),
        )


@app.route("/api/scan/start", methods=["POST"])
def start_scan():
    data = request.json or {}
    target_url = data.get("url", "").strip()
    include_llm = bool(data.get("includeLlm", False))

    if not target_url:
        return jsonify({"error": "URL is required"}), 400

    scan_id = str(uuid.uuid4())
    with SCANS_LOCK:
        SCANS[scan_id] = {
            "scanId": scan_id,
            "targetUrl": target_url,
            "status": "running",
            "phase": "Starting",
            "currentItem": "Preparing OWASP ZAP scan...",
            "progress": 2,
            "estimatedRemainingSec": 115,
            "stopRequested": False,
            "spiderId": None,
            "ascanId": None,
            "report": None,
            "error": None,
        }

    worker = threading.Thread(
        target=run_scan_worker,
        args=(scan_id, target_url),
        kwargs={"include_llm": include_llm},
        daemon=True,
    )
    worker.start()

    return jsonify({"scanId": scan_id, "status": "running"}), 202


@app.route("/api/scan/status/<scan_id>", methods=["GET"])
def scan_status(scan_id):
    with SCANS_LOCK:
        scan = SCANS.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404
        return jsonify({
            "scanId": scan["scanId"],
            "targetUrl": scan["targetUrl"],
            "status": scan["status"],
            "phase": scan["phase"],
            "currentItem": scan["currentItem"],
            "progress": scan["progress"],
            "estimatedRemainingSec": scan["estimatedRemainingSec"],
            "report": scan["report"],
            "error": scan["error"],
        })


@app.route("/api/scan/stop/<scan_id>", methods=["POST"])
def stop_scan(scan_id):
    with SCANS_LOCK:
        scan = SCANS.get(scan_id)
        if not scan:
            return jsonify({"error": "Scan not found"}), 404
        scan["stopRequested"] = True
        scan["phase"] = "Stopping"
        scan["currentItem"] = "Stopping ZAP spider & active scan..."
        spider_id = scan.get("spiderId")
        ascan_id = scan.get("ascanId")

    # Immediately halt ZAP spider & active scans
    stop_zap_processes(spider_id=spider_id, ascan_id=ascan_id)

    deadline = time.time() + 4
    while time.time() < deadline:
        with SCANS_LOCK:
            current = SCANS.get(scan_id, {})
            if current.get("status") in ("stopped", "completed", "error") and current.get("report"):
                break
        time.sleep(0.3)

    with SCANS_LOCK:
        scan = SCANS.get(scan_id, {})
        report = scan.get("report")
        if not report and scan.get("targetUrl"):
            report = build_report(scan_id, scan["targetUrl"], time.time(), stopped=True, include_llm=False)
            scan["status"] = "stopped"
            scan["phase"] = "Stopped"
            scan["progress"] = 100
            scan["estimatedRemainingSec"] = 0
            scan["report"] = report

        return jsonify({
            "scanId": scan_id,
            "status": scan.get("status", "stopped"),
            "report": report,
        })


@app.route("/api/scan", methods=["POST"])
def legacy_scan_target():
    data = request.json or {}
    target_url = data.get("url", "").strip()
    if not target_url:
        return jsonify({"error": "URL is required"}), 400
    report = build_report("sync", target_url, time.time(), stopped=False, include_llm=False)
    return jsonify(report)


if __name__ == "__main__":
    app.run(port=5000, debug=False, threaded=True)