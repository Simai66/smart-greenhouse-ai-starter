# Edge agent operations

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
