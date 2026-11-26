// src/utils/vulnContext.js
const VULN_TYPE_SUMMARIES = {
  sqli: "SQL Injection occurs when untrusted user input is concatenated into a database query without proper parameterization or escaping. Attackers may read sensitive records, bypass authentication logic, or modify data in the database.",
  xss: "Cross-Site Scripting (XSS) happens when an application includes untrusted input in a web response without proper encoding or sanitization. This allows malicious scripts to run in a user's browser session and access session data or page actions.",
  csrf: "Cross-Site Request Forgery (CSRF) occurs when a web application allows state-changing requests without verifying an unpredictable anti-CSRF token or origin check. A malicious site can trick an authenticated user's browser into submitting unwanted actions.",
  headers:
    "Missing or weak HTTP security headers leave browser protections—such as content restrictions, clickjacking defenses, or transport enforcement—underutilized. Adding appropriate headers reduces exposure to common client-side attacks.",
  session:
    "Authentication or session management weaknesses arise when session identifiers, cookie flags, or access checks are improperly configured. Attackers may hijack sessions or access restricted functionality if tokens are exposed or poorly validated.",
  exposure:
    "Sensitive information exposure happens when applications reveal internal paths, stack traces, version banners, or configuration details in responses. While lower impact on its own, these details help attackers map targets more accurately.",
};

export function getVulnerabilityTypeSummary(vulnName = "") {
  const normalized = vulnName.toLowerCase();
  if (normalized.includes("sql") || normalized.includes("sqli")) {
    return {
      category: "SQL Injection",
      summary: VULN_TYPE_SUMMARIES.sqli,
    };
  }
  if (
    normalized.includes("xss") ||
    normalized.includes("cross-site scripting")
  ) {
    return {
      category: "Cross-Site Scripting (XSS)",
      summary: VULN_TYPE_SUMMARIES.xss,
    };
  }
  if (normalized.includes("csrf")) {
    return {
      category: "Cross-Site Request Forgery (CSRF)",
      summary: VULN_TYPE_SUMMARIES.csrf,
    };
  }
  if (normalized.includes("header") || normalized.includes("csp")) {
    return {
      category: "Security Headers",
      summary: VULN_TYPE_SUMMARIES.headers,
    };
  }
  if (
    normalized.includes("session") ||
    normalized.includes("auth") ||
    normalized.includes("cookie")
  ) {
    return {
      category: "Authentication & Session",
      summary: VULN_TYPE_SUMMARIES.session,
    };
  }
  return {
    category: "Information / Configuration Finding",
    summary: VULN_TYPE_SUMMARIES.exposure,
  };
}