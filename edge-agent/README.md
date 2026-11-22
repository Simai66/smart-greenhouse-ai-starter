# Edge agent operations

The agent runs AI detection against each original capture, then encodes a same-resolution JPEG at quality 85 for upload and offline queue. It replaces the original only when the encoded file is smaller; encoding errors preserve the original. Docker installs the pinned Pillow dependency. Run local Python tests after installing `requirements.txt`.

## SQLite backup

Build/restart the gateway image before using the packaged backup utility. Create a new timestamped destination on the persistent state volume; the command fails if the destination exists and verifies SQLite integrity before publishing the backup.

```sh
cd edge-agent
docker compose -f docker-compose.example.yml exec greenhouse-agent mkdir -p /var/lib/greenhouse-agent/backups
docker compose -f docker-compose.example.yml exec greenhouse-agent \
  python /app/backup_agent_db.py \
  /var/lib/greenhouse-agent/agent.db \
  /var/lib/greenhouse-agent/backups/agent-YYYYMMDD-HHMMSS.db
```

Create the `backups` directory with permissions available to the gateway's unprivileged UID before running. Copy verified backups off the Pi to separate storage. Test recovery on a copy: stop the gateway, preserve the current DB, restore the backup as `agent.db`, start the gateway, and verify readings/queue state. Do not overwrite the only copy or restore while the gateway is running. Define retention and capacity with the operator before scheduling automatic cleanup.

### Outbound queue upgrade

Before upgrading the agent image, create and verify a separate SQLite backup.
On first start, the agent additively adds `outbound_queue.state`; existing rows
become `PENDING`. Transient delivery failures become `RETRY`. Permanent HTTP
rejections remain in `outbound_quarantine`; successful delivery keeps existing
behavior and removes the queue row. The migration does not rewrite or prune
queue/quarantine payloads. If startup or post-upgrade checks fail, stop the agent
and restore the verified backup using the recovery steps above.

After startup, inspect active states on the Pi without selecting payloads:

```sql
SELECT state, COUNT(*) FROM outbound_queue GROUP BY state;
SELECT COUNT(*) FROM outbound_quarantine;
PRAGMA integrity_check;
```
