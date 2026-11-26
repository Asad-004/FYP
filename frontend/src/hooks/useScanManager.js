import { useState, useRef, useEffect, useCallback } from 'react';

export function formatEta(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return 'Calculating...';
  }
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `~${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `~${mins}m ${rem}s`;
}

function getBaseApiUrl(apiEndpoint) {
  const fallback = 'http://localhost:5000';
  if (!apiEndpoint) return fallback;
  return apiEndpoint.replace(/\/api\/scan\/?$/i, '') || fallback;
}

export function useScanManager({ config, onScanComplete }) {
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [scanProgress, setScanProgress] = useState({
    phase: 'Idle',
    currentItem: '',
    progress: 0,
    estimatedRemainingSec: null,
  });
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pollTimerRef = useRef(null);
  const activeScanIdRef = useRef(null);
  const targetUrlRef = useRef('');
  const completedScanIdsRef = useRef(new Set());
  const onScanCompleteRef = useRef(onScanComplete);

  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
  }, [onScanComplete]);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  const finalizeScanOnce = useCallback((report, fallbackUrl, scanId) => {
    const key = scanId || `${report?.targetUrl || fallbackUrl}_${report?.scanTime || 'done'}`;
    if (completedScanIdsRef.current.has(key)) {
      return;
    }
    completedScanIdsRef.current.add(key);

    if (report) {
      setScanResult(report);
      if (onScanCompleteRef.current) {
        onScanCompleteRef.current(report, fallbackUrl);
      }
    }
  }, []);

  const pollStatus = useCallback(
    async (scanId, baseUrl, scannedUrl) => {
      if (!scanId || activeScanIdRef.current !== scanId) return;

      try {
        const res = await fetch(`${baseUrl}/api/scan/status/${scanId}`);
        if (!res.ok) {
          throw new Error(`Status check failed (${res.status})`);
        }
        const data = await res.json();

        setScanProgress({
          phase: data.phase || 'Scanning',
          currentItem: data.currentItem || '',
          progress: typeof data.progress === 'number' ? data.progress : 0,
          estimatedRemainingSec: data.estimatedRemainingSec ?? null,
        });

        if (data.status === 'completed' || data.status === 'stopped') {
          clearPolling();
          activeScanIdRef.current = null;
          setLoading(false);
          setStopping(false);
          setScanProgress((prev) => ({
            ...prev,
            progress: 100,
            estimatedRemainingSec: 0,
          }));
          finalizeScanOnce(data.report, scannedUrl, scanId);
          return;
        }

        if (data.status === 'error') {
          clearPolling();
          activeScanIdRef.current = null;
          setLoading(false);
          setStopping(false);
          setErrorMsg(data.error || 'Scan encountered an error.');
          return;
        }

        if (activeScanIdRef.current === scanId) {
          pollTimerRef.current = setTimeout(() => {
            pollStatus(scanId, baseUrl, scannedUrl);
          }, 1500);
        }
      } catch (err) {
        if (activeScanIdRef.current === scanId) {
          pollTimerRef.current = setTimeout(() => {
            pollStatus(scanId, baseUrl, scannedUrl);
          }, 2000);
        }
        setErrorMsg(err.message || 'Polling connection issue.');
      }
    },
    [clearPolling, finalizeScanOnce]
  );

  const startScan = useCallback(
    async (rawUrl) => {
      const trimmed = (rawUrl || '').trim();
      if (!trimmed) return;

      clearPolling();
      setErrorMsg('');
      setScanResult(null);
      setStopping(false);
      setLoading(true);
      targetUrlRef.current = trimmed;

      setScanProgress({
        phase: 'Starting',
        currentItem: 'Initializing OWASP ZAP scan...',
        progress: 2,
        estimatedRemainingSec: 115,
      });

      const baseUrl = getBaseApiUrl(config?.apiEndpoint);

      try {
        const res = await fetch(`${baseUrl}/api/scan/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to start scan (${res.status})`);
        }

        const data = await res.json();
        const newScanId = data.scanId;
        activeScanIdRef.current = newScanId;

        pollTimerRef.current = setTimeout(() => {
          pollStatus(newScanId, baseUrl, trimmed);
        }, 800);
      } catch (err) {
        setLoading(false);
        setStopping(false);
        setErrorMsg(err.message || 'Could not start scan.');
      }
    },
    [clearPolling, config?.apiEndpoint, pollStatus]
  );

  const stopScan = useCallback(async () => {
    const scanId = activeScanIdRef.current;
    const scannedUrl = targetUrlRef.current;
    if (!scanId || stopping) return;

    setStopping(true);
    setScanProgress((prev) => ({
      ...prev,
      phase: 'Stopping',
      currentItem: 'Stopping ZAP scan & generating report...',
    }));

    const baseUrl = getBaseApiUrl(config?.apiEndpoint);

    try {
      const res = await fetch(`${baseUrl}/api/scan/stop/${scanId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report && (data.status === 'stopped' || data.status === 'completed')) {
          clearPolling();
          activeScanIdRef.current = null;
          setLoading(false);
          setStopping(false);
          setScanProgress((prev) => ({
            ...prev,
            phase: 'Stopped',
            progress: 100,
            estimatedRemainingSec: 0,
          }));
          finalizeScanOnce(data.report, scannedUrl, scanId);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to stop scan.');
    }
  }, [clearPolling, config?.apiEndpoint, finalizeScanOnce, stopping]);

  return {
    loading,
    stopping,
    scanProgress,
    scanResult,
    errorMsg,
    startScan,
    stopScan,
  };
}