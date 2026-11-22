# Feature card: Integrate PR #5 with current main

- Outcome: Make PR #5 reviewable against main with its demo data, mobile UI, and login changes integrated.
- Acceptance: Resolve merge conflicts, retain the main dependency versions and existing Cloudflare Access, image privacy, and release safeguards, and pass lint, TypeScript, and relevant tests.
- Scope: The existing PR branch and necessary integration fixes. Production deployment, database changes, and dependency upgrades are outside scope.
- Risks: The two branches changed the demo state and images independently. Review the integrated behavior before merging to main.
- Order: Main agent resolves the conflicts and checks UI and API call sites. QA runs local checks and reviews the new PR head.
- Milestone: [PM release readiness](2026-08-11-pm-release-readiness.md).

## Verification and open questions

- Lint and TypeScript passed. The domain suite passed 32 tests. The full test command passed on rerun after the first rendered-page check returned HTTP 500. The standalone rendered HTML rerun also passed.
- Staging answered unauthenticated requests to `/` and `/login` with redirects to Cloudflare Access. The Google control uses a full navigation to the same host's root. Access owns sign-in and resumes an existing session when available. A local or preview host without an Access policy will only navigate to its dashboard.
