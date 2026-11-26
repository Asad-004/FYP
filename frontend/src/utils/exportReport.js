function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadVulnerabilitySolutionPdf(report, solutionData) {
  if (!report) return;

  const vulnerabilities = Array.isArray(report.vulnerabilities) ? report.vulnerabilities : [];
  const solutions = Array.isArray(solutionData?.errorSolutions) ? solutionData.errorSolutions : [];
  const risk = report.riskSummary || { high: 0, medium: 0, low: 0 };

  const solutionById = new Map();
  const solutionByName = new Map();
  solutions.forEach((sol) => {
    if (sol?.findingId !== undefined && sol?.findingId !== null) {
      solutionById.set(String(sol.findingId), sol);
    }
    if (sol?.errorName) {
      solutionByName.set(String(sol.errorName).trim().toLowerCase(), sol);
    }
  });

  const combinedRowsHtml = vulnerabilities
    .map((vuln, idx) => {
      const findingNum = vuln.id ?? idx + 1;
      const matchedSol =
        solutionById.get(String(findingNum)) ||
        solutionByName.get(String(vuln.name || '').trim().toLowerCase()) ||
        null;

      const stepsHtml =
        Array.isArray(matchedSol?.steps) && matchedSol.steps.length > 0
          ? `<ul>${matchedSol.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
          : '';

      const codeHtml = matchedSol?.codeExample
        ? `<pre><code>${escapeHtml(
            typeof matchedSol.codeExample === 'string'
              ? matchedSol.codeExample
              : JSON.stringify(matchedSol.codeExample, null, 2)
          )}</code></pre>`
        : '';

      return `
        <div class="card">
          <div class="card-head">
            <h3>${idx + 1}. ${escapeHtml(vuln.name || 'Vulnerability')}</h3>
            <span class="badge">${escapeHtml(vuln.risk || 'Info')}</span>
          </div>
          ${
            vuln.section || vuln.url
              ? `<p class="meta"><strong>Target:</strong> ${escapeHtml(vuln.section || vuln.url)}</p>`
              : ''
          }
          ${vuln.param ? `<p class="meta"><strong>Parameter:</strong> ${escapeHtml(vuln.param)}</p>` : ''}
          ${vuln.description ? `<p class="desc">${escapeHtml(vuln.description)}</p>` : ''}

          <div class="sol-box">
            <div class="sol-title">Cloudflare AI Solution</div>
            ${
              matchedSol
                ? `
                  ${
                    matchedSol.solutionSummary
                      ? `<p class="desc">${escapeHtml(matchedSol.solutionSummary)}</p>`
                      : ''
                  }
                  ${stepsHtml}
                  ${codeHtml}
                `
                : `<p class="muted">Generate Cloudflare AI Solutions before exporting to include tailored fix steps for this finding.</p>`
            }
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>ThreatLens Vulnerability &amp; Solution Report</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #1f2933; margin: 28px; line-height: 1.5; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          .summary { background: #f8f9fa; border: 1px solid #e2e5e9; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 14px; }
          .card { border: 1px solid #d5dbe1; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; page-break-inside: avoid; }
          .card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
          .card-head h3 { margin: 0; font-size: 16px; }
          .badge { background: #eef2ff; color: #1d4ed8; padding: 3px 9px; border-radius: 5px; font-size: 12px; font-weight: 700; }
          .meta, .desc { margin: 6px 0; font-size: 13.5px; }
          .muted { color: #6b7280; font-size: 13px; margin: 4px 0 0; }
          .sol-box { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
          .sol-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0f766e; margin-bottom: 4px; }
          ul { margin: 6px 0 6px 20px; font-size: 13px; }
          pre { background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
          @media print { body { margin: 14px; } }
        </style>
      </head>
      <body>
        <h1>ThreatLens Vulnerability &amp; Solution Report</h1>
        <div class="summary">
          <div><strong>Target URL:</strong> ${escapeHtml(report.targetUrl || 'N/A')}</div>
          <div><strong>Scanned At:</strong> ${escapeHtml(report.scannedAt || 'N/A')}</div>
          <div><strong>Risk Summary:</strong> High: ${risk.high || 0} | Medium: ${risk.medium || 0} | Low: ${risk.low || 0}</div>
        </div>
        ${combinedRowsHtml || '<p>No vulnerabilities recorded.</p>'}
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}