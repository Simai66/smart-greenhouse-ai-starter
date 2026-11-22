import importlib.util
import pathlib
import shutil
import sqlite3
import sys
import tempfile
import unittest


MODULE_PATH = pathlib.Path(__file__).with_name("backup_agent_db.py")
SPEC = importlib.util.spec_from_file_location("backup_agent_db", MODULE_PATH)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)

AGENT_MODULE_PATH = pathlib.Path(__file__).with_name("greenhouse_agent.py")
AGENT_SPEC = importlib.util.spec_from_file_location("greenhouse_agent_backup_test", AGENT_MODULE_PATH)
assert AGENT_SPEC and AGENT_SPEC.loader
agent_module = importlib.util.module_from_spec(AGENT_SPEC)
sys.modules[AGENT_SPEC.name] = agent_module
AGENT_SPEC.loader.exec_module(agent_module)


class BackupDatabaseTest(unittest.TestCase):
    def test_backup_includes_committed_wal_data_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "agent.db"
            destination = pathlib.Path(directory) / "agent-backup.db"
            source_db = sqlite3.connect(source)
            source_db.execute("PRAGMA journal_mode=WAL")
            source_db.execute("PRAGMA wal_autocheckpoint=0")
            source_db.execute("CREATE TABLE readings (id TEXT PRIMARY KEY)")
            source_db.execute("INSERT INTO readings VALUES ('kept')")
            source_db.commit()
            try:
                module.backup_database(source, destination)
            finally:
                source_db.close()

            with sqlite3.connect(destination) as backup_db:
                self.assertEqual(backup_db.execute("SELECT id FROM readings").fetchone(), ("kept",))
                self.assertEqual(backup_db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
            with self.assertRaises(FileExistsError):
                module.backup_database(source, destination)

    def test_backup_rejects_same_path_and_missing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "agent.db"
            with sqlite3.connect(source) as db:
                db.execute("CREATE TABLE readings (id TEXT)")
            with self.assertRaises(ValueError):
                module.backup_database(source, source)
            with self.assertRaises(FileNotFoundError):
                module.backup_database(pathlib.Path(directory) / "missing.db", pathlib.Path(directory) / "backup.db")

    def test_backup_restore_preserves_edge_queue_quarantine_and_readings(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            source_dir = root / "source"
            restore_dir = root / "restore"
            source_dir.mkdir()
            restore_dir.mkdir()
            source = source_dir / "agent.db"
            backup = root / "agent-backup.db"
            previous_state_dir = agent_module.STATE_DIR
            try:
                agent_module.STATE_DIR = source_dir
                store = agent_module.Store()
                try:
                    store.queue("/api/agent/telemetry", {"readings": [{"readingId": "reading-queued"}]})
                    store.queue("/api/agent/telemetry", {"readingId": "reading-rejected"})
                    store.mark_retry(store.queued()[0][0])
                    store.quarantine(store.queued()[1][0], 422, "invalid payload")
                    store.db.execute(
                        "INSERT INTO inbound_readings VALUES (?, ?, ?, ?, ?)",
                        ("reading-queued", "ESP32-01", '{"readingId":"reading-queued"}', "2026-11-04T00:00:00Z", None),
                    )
                    store.db.commit()
                    module.backup_database(source, backup)
                finally:
                    store.db.close()

                shutil.copyfile(backup, restore_dir / "agent.db")
                agent_module.STATE_DIR = restore_dir
                restored_store = agent_module.Store()
                try:
                    self.assertEqual(restored_store.queued()[0][2], {"readings": [{"readingId": "reading-queued"}]})
                    self.assertEqual(restored_store.db.execute("SELECT state FROM outbound_queue").fetchone(), ("RETRY",))
                    self.assertEqual(restored_store.quarantined()[0][2:5], ({"readingId": "reading-rejected"}, 422, "invalid payload"))
                    self.assertEqual(restored_store.db.execute("SELECT reading_id, node_id, delivered_at FROM inbound_readings").fetchone(), ("reading-queued", "ESP32-01", None))
                    self.assertEqual(restored_store.db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
                finally:
                    restored_store.db.close()
            finally:
                agent_module.STATE_DIR = previous_state_dir

    def test_legacy_queue_migrates_additively_and_preserves_quarantine(self):
        with tempfile.TemporaryDirectory() as directory:
            state_dir = pathlib.Path(directory)
            database = state_dir / "agent.db"
            with sqlite3.connect(database) as db:
                db.execute("CREATE TABLE outbound_queue (id INTEGER PRIMARY KEY, path TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)")
                db.execute("INSERT INTO outbound_queue VALUES (1, '/api/agent/telemetry', '{\"readingId\":\"queued\"}', '2026-11-05T00:00:00Z')")
                db.execute("CREATE TABLE outbound_quarantine (id INTEGER PRIMARY KEY, path TEXT NOT NULL, body TEXT NOT NULL, status_code INTEGER NOT NULL, status_text TEXT NOT NULL, rejected_at TEXT NOT NULL)")
                db.execute("INSERT INTO outbound_quarantine VALUES (1, '/api/agent/telemetry', '{\"readingId\":\"failed\"}', 422, 'invalid payload', '2026-11-05T00:00:00Z')")
            previous_state_dir = agent_module.STATE_DIR
            try:
                agent_module.STATE_DIR = state_dir
                store = agent_module.Store()
                try:
                    self.assertEqual(store.db.execute("SELECT state FROM outbound_queue WHERE id = 1").fetchone(), ("PENDING",))
                    self.assertEqual(store.quarantined()[0][2:5], ({"readingId": "failed"}, 422, "invalid payload"))
                    with self.assertRaises(sqlite3.IntegrityError):
                        store.db.execute("UPDATE outbound_queue SET state = 'FAILED' WHERE id = 1")
                finally:
                    store.db.close()
            finally:
                agent_module.STATE_DIR = previous_state_dir


if __name__ == "__main__":
    unittest.main()
