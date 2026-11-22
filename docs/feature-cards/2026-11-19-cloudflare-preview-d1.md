# Feature card: Cloudflare Preview D1 binding

- Outcome: Upload a PR build with its own D1 database. The local Sites build keeps its local placeholder binding.
- Acceptance: The preview command rejects missing or placeholder D1 IDs, preserves the generated bundle and asset paths, and packages the Worker with the explicit preview binding. Verify with Wrangler dry run, then verify the hosted check after configuration.
- Scope: Preview upload command and its settings. Production deploys, D1 creation, migrations and changes to Access policy are outside scope.
- Order: DevOps adds the command, QA checks the generated config and dry run, then the Cloudflare account owner sets the preview database and command.
- Assumptions and risks: The Cloudflare account must own the preview D1 database. A version URL uses the configured database, so use a dedicated preview database. Preview APIs use Cloudflare Access and fail closed until the preview issuer and audience are configured.
- Milestone: [PM release readiness](2026-08-11-pm-release-readiness.md).

## Cloudflare setup

On Worker `smart-greenhouse-ai-starter`, open **Settings → Build**. Keep `npm run build` as the build command. Under the Build settings, add these build variables and set the **Preview command** to `npm run upload:cloudflare-preview`.

| Build variable | Value |
| --- | --- |
| `CLOUDFLARE_PREVIEW_D1_NAME` | Name of the dedicated preview D1 database |
| `CLOUDFLARE_PREVIEW_D1_ID` | Database ID from that D1 database |

Run a preview build for the PR branch. The **Deploy command** is a separate setting. A manual build that displays the production Deploy command does not exercise this preview command. The preview upload creates a version and does not promote it to production.

For rollback, restore the prior Preview command and remove the two build variables. Keep the preview database and uploaded versions until their retention is reviewed.
