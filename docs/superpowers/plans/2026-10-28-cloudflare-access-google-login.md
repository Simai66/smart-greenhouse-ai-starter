# Cloudflare Access Google login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticate GH-01 browser API requests with Google identities asserted by Cloudflare Access.

**Architecture:** `authorizeApiRole` selects explicit Access mode for staging and verifies `Cf-Access-Jwt-Assertion` against the configured team JWKS, issuer, audience, and time claims before existing role mapping. Local/non-Access environments keep the current identity source.

**Tech Stack:** TypeScript, Cloudflare Workers Web Crypto, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-28-cloudflare-access-google-login-design.md`

## Global Constraints

- Fail closed in Access mode; never trust raw identity headers there.
- Do not add dependencies or expose secrets; no account mutation or production deploy.
- Preserve GH-01 scope and existing email-based role mapping.
- Cloudflare Access must protect the exact staging `workers.dev` hostname.

## Review Focus

- Forged/spoofed identity header without JWT → verifier returns unauthenticated (verifier test); confirm API status in staging smoke.
- Invalid signature or unsupported algorithm → 401 (JWT verifier test).
- Wrong issuer/audience, expired or not-yet-valid JWT → 401 (JWT verifier tests).
- Missing email or malformed JWT → 401 (JWT verifier tests).
- Missing env or failed JWKS fetch → verifier returns unavailable (verifier test); confirm API status in staging smoke.

### Task 1: Verify Cloudflare Access JWT at shared API auth boundary

**Files:**
- Create: `lib/server/cloudflare-access-auth.ts`
- Modify: `lib/server/access-control.ts`
- Modify: `wrangler.staging.jsonc`
- Modify: `README.md`
- Test: `tests/cloudflare-access-auth.test.ts`

**Interfaces:**
- `verifyCloudflareAccessJwt(token: string, teamDomain: string, audience: string): Promise<{ email: string } | null>` returns verified identity or `null`; JWKS/config/network failures remain distinguishable to the API boundary.
- `authorizeApiRole` uses the verified email in Access mode and preserves current behavior elsewhere.
- Staging config selects `GREENHOUSE_AUTH_MODE=cloudflare-access`; team domain, audience, and role lists are Worker secrets set per deployed app.

- [x] Write tests for valid RS256 token and reject malformed/tampered/wrong issuer/wrong audience/expired/not-yet-valid/missing-email token; test JWKS failure and key rotation.
- [x] Run the focused tests and verify expected RED failure before implementation, including cached-key rotation.
- [x] Implement minimal Web Crypto/JWKS verification with short in-isolate key cache, rate-limited unknown-kid refresh, exact `https://<team>.cloudflareaccess.com` origin and required claims.
- [x] Wire Access mode into `authorizeApiRole`; missing configuration/JWKS returns generic 503, absent/invalid assertion returns existing generic 401, verified email passes through existing role mapping.
- [x] Add staging auth-mode variable and README runbook: Google OAuth IdP, exact hostname app, approved email allow policy, app AUD/team secrets, role lists, narrowly scoped agent HMAC path, deploy and smoke checks. Never put OAuth secrets in repo.
- [x] Run focused JWT tests, existing scope tests, file-scoped lint, build; review diff and `git diff --check`. `npx tsc --noEmit` remains blocked by seven existing `cloudflare:workers`/Worker global declaration errors in unrelated files.
- [ ] Configure Google IdP, Access policies and staging secrets; do not claim staging acceptance until valid/denied browser requests and Pi HMAC connectivity are observed.
