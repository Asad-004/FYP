const VULN_TYPE_SUMMARIES = {
  sqli:
    'SQL Injection occurs when untrusted input reaches a database query without parameterization, allowing attackers to read or alter data or bypass authentication.',
  xss:
    'Cross-Site Scripting (XSS) happens when untrusted input is rendered in a browser without proper context-aware encoding or sanitization.',
  csrf:
    'Cross-Site Request Forgery (CSRF) allows unauthorized state-changing requests from another origin when anti-CSRF tokens or SameSite protections are missing.',
  headers:
    'Missing or weak HTTP security headers reduce browser-level protections such as clickjacking defense, transport security, and content restrictions.',
  session:
    'Authentication or session weaknesses arise when session tokens, cookie attributes, or access checks are improperly configured.',
  exposure:
    'Information exposure reveals internal paths, server banners, stack traces, or configuration details that assist attackers during reconnaissance.',
};

export function getVulnerabilityTypeInfo(vuln) {
  const combined = `${vuln?.name || ''} ${vuln?.type || ''} ${vuln?.description || ''}`.toLowerCase();

  if (combined.includes('sql') || combined.includes('sqli')) {
    return { type: 'SQL Injection', summary: VULN_TYPE_SUMMARIES.sqli };
  }
  if (combined.includes('xss') || combined.includes('cross-site scripting')) {
    return { type: 'Cross-Site Scripting (XSS)', summary: VULN_TYPE_SUMMARIES.xss };
  }
  if (combined.includes('csrf')) {
    return { type: 'Cross-Site Request Forgery (CSRF)', summary: VULN_TYPE_SUMMARIES.csrf };
  }
  if (combined.includes('header') || combined.includes('csp') || combined.includes('hsts')) {
    return { type: 'Security Headers', summary: VULN_TYPE_SUMMARIES.headers };
  }
  if (combined.includes('session') || combined.includes('auth') || combined.includes('cookie')) {
    return { type: 'Authentication & Session', summary: VULN_TYPE_SUMMARIES.session };
  }
  return {
    type: vuln?.type || 'Information / Configuration Finding',
    summary: VULN_TYPE_SUMMARIES.exposure,
  };
}