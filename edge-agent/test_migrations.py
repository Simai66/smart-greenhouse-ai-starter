import pathlib
import sqlite3
import unittest


class MigrationTest(unittest.TestCase):
    def test_agent_nonce_migration_rejects_replay_and_keeps_unexpired_rows(self):
        migration = pathlib.Path(__file__).parents[1] / "drizzle" / "0005_agent_request_nonces.sql"
        with sqlite3.connect(":memory:") as db:
            db.executescript(migration.read_text(encoding="utf-8").replace("--> statement-breakpoint", ""))
            first = db.execute(
                "INSERT INTO agent_request_nonces(agent_id, nonce, expires_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                ("PI-GH-01", "0" * 32, "2026-10-29T00:00:00.000Z"),
            )
            replay = db.execute(
                "INSERT INTO agent_request_nonces(agent_id, nonce, expires_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                ("PI-GH-01", "0" * 32, "2026-10-29T00:00:00.000Z"),
            )
            db.execute(
                "INSERT INTO agent_request_nonces(agent_id, nonce, expires_at) VALUES (?, ?, ?)",
                ("PI-GH-01", "1" * 32, "2026-10-27T00:00:00.000Z"),
            )
            self.assertEqual(first.rowcount, 1)
            self.assertEqual(replay.rowcount, 0)
            db.execute("DELETE FROM agent_request_nonces WHERE expires_at <= ?", ("2026-10-28T00:00:00.000Z",))
            self.assertEqual(db.execute("SELECT nonce FROM agent_request_nonces").fetchall(), [("0" * 32,)])


if __name__ == "__main__":
    unittest.main()
