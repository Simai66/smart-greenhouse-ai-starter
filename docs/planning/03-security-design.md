# 03 — Security design

## Threats and controls

| Threat | Pilot control |
|---|---|
| Device impersonation / MQTT abuse | Per-device credentials, verified TLS, broker ACL, revocation and rotation procedure |
| MITM / credential leakage | TLS on LAN and cloud hops; private CA key restricted; never send credentials over HTTP |
| Unauthorized actuator commands | Local role checks, cloud Access/HMAC, command ID/expiry, ESP32 validation, ACK/audit lifecycle |
| Replay / duplicates | Event IDs, monotonic sequence, timestamp/expiry, nonce validation at APIs, idempotent storage |
| Local network compromise | Firewall allowlist, least-privilege services, non-root gateway, input validation, audit events |
| Cloud credential compromise / API abuse | Environment-separated secrets, narrow service identity, rate limits, validation and rotation |
| Malicious firmware / key extraction | Controlled build/release hashes and restricted debug access; secure boot/flash encryption deferred until board support verified |
| Data loss | Consistent SQLite backup, restore drills, additive D1 migrations, image checksums/archive |

## Identity and trust

Start with unique device username/password plus TLS server certificate verification against a Private CA. Deny anonymous MQTT and restrict each device to its own publish/subscribe topics. Do not disable certificate checks. Caddy clients must install the local CA trust chain. Future mTLS may replace password authentication after provisioning/rotation workflow is designed.

Cloud requests remain authenticated using existing Access/HMAC patterns. Local users have separate accounts and role checks; local password hashes never sync to D1. Audit every actuator request and outcome without logging secrets.

## Thesis pilot release checklist

- [ ] Device-specific credentials provisioned; anonymous broker access denied; ACL negative tests pass.
- [ ] ESP32 validates CA/hostname and fails closed on wrong/missing CA or untrusted time.
- [ ] Pi HTTPS certificate SAN matches stable LAN name; client trust procedure tested.
- [ ] Local users and cloud users are authenticated/authorized; command actor is audited.
- [ ] Commands expire, deduplicate and require device ACK; offline/stale command cannot turn output on.
- [ ] Firewall exposes only documented LAN services; gateway runs least privilege.
- [ ] Secrets are absent from repo/logs; rotation and single-device revoke procedure tested.
- [ ] SQLite backup restore and cloud migration recovery are demonstrated.
- [ ] Hardware owner verifies de-energized boot and independent emergency OFF.
- [ ] QA records remaining risk; pilot owner accepts residual risk explicitly.

Production hardening (mTLS, secure boot/flash encryption, external penetration test, VPN-based remote access) is future work unless risk review upgrades it.

## Actuator authority

Priority: physical emergency OFF → ESP32 hard limits/safety → authorized time-bounded manual request → local automatic policy → remote request. Cloud only requests; it cannot bypass ESP32 policy. Emergency OFF must work without network.

All unverified limits, credential lifetimes, expiry windows and stale timeouts remain `REQUIRES_CONFIGURATION`. Production hardening: mTLS, hardware-backed keys where supported, secure boot, external penetration review and VPN-based remote access.
