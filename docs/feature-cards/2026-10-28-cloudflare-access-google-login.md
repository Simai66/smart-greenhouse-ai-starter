# Feature card: Cloudflare Access Google login for GH-01

> Historical completion record. Its HMAC-only/BYPASS assumption is superseded by
> [GH-01 agent ingress security](2026-10-28-gh01-agent-ingress-security.md).

- **Outcome:** Approved greenhouse users sign in with Google through Cloudflare Access; browser APIs accept only a valid, app-scoped Access JWT and map its verified email to existing server-side roles.
- **Acceptance:** Valid JWT (signature, issuer, audience, expiry, email) reaches role mapping; missing/invalid tokens and missing Access config fail closed; Access mode never trusts caller-supplied identity headers; staging runbook gives exact Google/Access setup and verification steps; Pi agent API remains protected by its existing HMAC verifier.
- **Scope:** Backend auth boundary, focused tests, staging auth-mode setting, setup docs. No UI login SDK, database/migration, production changes, or dashboard provisioning.
- **Assumptions/risks:** Cloudflare Access protects the exact `workers.dev` hostname; a more specific `/api/agent/*` app path uses Bypass so the Pi HMAC client remains reachable; Bypass disables Access enforcement/logging on that path, so HMAC verification must remain mandatory. App audience/team domain and role lists are Worker secrets. Google OAuth client secret and email allow-list stay in Cloudflare. Staging account settings are not independently verified.
- **Owners/order:** Backend: verify Access JWT and retain existing role mapping; DevOps: set staging auth mode and document dashboard/env setup; QA: JWT negative-path tests and targeted checks. Dependencies: code contract → staging configuration → authenticated readback.
