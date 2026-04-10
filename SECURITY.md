# Security Policy

## Supported Versions

Only the latest release is supported with security updates.

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| Older   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.** Instead, email security concerns to the maintainer or use [GitHub's private vulnerability reporting](../../security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You can expect an initial response within 72 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

unInsta runs entirely in your browser and communicates only with `instagram.com` using your existing session. It does not collect, transmit, or store any data externally. The security scope includes:

- Credential handling (cookies, tokens) within the browser context
- API request construction and data handling
- Code injection or XSS vectors in the injected UI panel
- Build pipeline integrity (supply chain)
