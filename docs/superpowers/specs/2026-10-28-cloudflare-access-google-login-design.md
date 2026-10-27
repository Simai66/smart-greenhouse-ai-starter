# Cloudflare Access Google login — design

## Intent

Make the GH-01 browser API work behind Cloudflare Access and Google sign-in. Cloudflare Access authenticates and gates users; the Worker independently verifies the signed `Cf-Access-Jwt-Assertion` before trusting its email for the existing `GREENHOUSE_ADMIN_EMAILS` / `GREENHOUSE_OPERATOR_EMAILS` mapping.

## Goals / non-goals

- Require valid RS256 signature, exact team-domain issuer, application audience, valid time claims, and a usable email.
- Fail closed in staging Access mode; reject spoofed `oai-authenticated-user-email` and other caller identity headers there.
- Keep existing hosted identity flow for non-Access local environments.
- Keep Pi ingestion reachable with a path-specific `/api/agent/*` Access Bypass; the Worker must continue enforcing timestamped HMAC authentication on every agent endpoint.
- No Google SDK/UI, database changes, production deploy, or Cloudflare/Google account mutation.

## Approaches

1. **Verify Access JWT in shared API role authorization (chosen):** one trust boundary covers every existing `authorizeApiRole` caller; use Worker Web Crypto and Cloudflare's rotating JWKS endpoint, with short in-isolate cache. No dependency.
2. Trust `Cf-Access-Authenticated-User-Email`: fewer lines, but a directly reachable `workers.dev` origin can receive forged headers; rejected.
3. Add Google OAuth in the app: duplicates Access, creates a new session/security boundary, and conflicts with the requested Access login; rejected.

## Constraints and interface

- Access mode is enabled explicitly by `GREENHOUSE_AUTH_MODE=cloudflare-access`.
- Required Worker secrets: `CLOUDFLARE_ACCESS_TEAM_DOMAIN` (`https://<team>.cloudflareaccess.com`), `CLOUDFLARE_ACCESS_AUD` (the protected app's AUD tag), and existing server role allow-lists.
- Existing authorization response and role mapping remain unchanged; missing token returns 401, invalid token returns 401, unavailable configuration/JWKS returns 503, insufficient role returns 403.
- Access browser policy allows only approved Google email identities; server role allow-lists remain authoritative for app privileges.

## Risks / verification

Access Bypass disables Access controls/logging for `/api/agent/*`, so agent HMAC validation remains a required trust boundary. Access and Google IdP configuration cannot be represented fully in source and needs the account owner. Tests cover valid and malformed/tampered/wrong-audience/wrong-issuer/expired JWTs, missing email, JWKS/config failure, and concurrent key refresh. Staging readback is required before claiming live access works.
