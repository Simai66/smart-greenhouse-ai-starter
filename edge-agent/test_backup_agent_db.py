import importlib.util
import pathlib
import sqlite3
import tempfile
import unittest


MODULE_PATH = pathlib.Path(__file__).with_name("backup_agent_db.py")
SPEC = importlib.util.spec_from_file_location("backup_agent_db", MODULE_PATH)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


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


if __name__ == "__main__":
    unittest.main()
