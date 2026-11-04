# 07 — Offline web design

Reuse one React/TypeScript frontend for Pi local hosting and Cloudflare remote hosting. Select API origin through an adapter; avoid duplicated product logic. Local users authenticate against Pi; remote users continue through Cloudflare Access/roles.

Cache static assets and timestamped read-only telemetry snapshots with Service Worker/IndexedDB. Version caches and discard incompatible cache versions. Never cache or replay actuator commands as pending work. Label all cached readings with age and source.

Connection states:

- `LOCAL_CONNECTED`: Pi API reachable; cloud sync healthy.
- `LOCAL_ONLY`: Pi reachable; cloud unavailable.
- `CLOUD_CONNECTED`: cloud reachable; edge heartbeat fresh.
- `CLOUD_ONLY`: cloud reachable; edge stale/offline.
- `CACHED_READ_ONLY`: neither API reachable; snapshot exists.
- `DISCONNECTED`: neither API nor usable cache.

Local HTTPS uses Caddy and Private CA. Client devices must trust the CA and resolve the certificate SAN name. Untrusted/mismatched TLS is an error, never a reason to fall back to HTTP. Controls use existing shadcn/Radix/Tailwind system, keyboard semantics, visible focus and responsive breakpoints.
