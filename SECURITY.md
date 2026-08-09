# Security Policy

Mail Buddy handles API keys, SMTP credentials, and uploaded files, so security reports are taken seriously.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/shakthizen/mail-buddy/security) of this repository.
2. Click **"Report a vulnerability"**.
3. Describe the issue, including steps to reproduce and, if possible, the affected version/commit.

This opens a private conversation with the maintainer(s) so the issue can be assessed and fixed before it's disclosed publicly.

## What to expect

- An acknowledgment as soon as reasonably possible.
- An assessment of severity and, if confirmed, a fix developed privately.
- Credit in the fix's changelog entry, if you'd like it (let us know your preference when reporting).

## Scope

Areas of particular interest for security review, given what this project handles:

- API key hashing, scoping, and origin/IP restriction (`apps/api/src/auth/`)
- The unsubscribe-link HMAC token scheme (`apps/api/src/lib/unsubscribeToken.ts`)
- Handlebars template rendering / escaping behavior (`apps/api/src/lib/handlebars.ts`)
- Asset upload validation (`apps/api/src/routes/assets.ts`)

Out of scope: findings that require an attacker to already possess a valid `admin`-scope API key (that key is, by design, a full-access credential - protect it like a root password), or that rely on running an intentionally outdated/unpatched deployment.
