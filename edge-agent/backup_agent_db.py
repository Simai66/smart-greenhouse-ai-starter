"""Create a consistent, non-overwriting backup of the edge agent SQLite DB."""

from __future__ import annotations

import argparse
import os
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path


def backup_database(source: Path, destination: Path) -> None:
    source = source.resolve(strict=True)
    destination = destination.resolve()
    if not source.is_file():
        raise ValueError("source must be a regular database file")
    if source == destination:
        raise ValueError("source and destination must differ")
    if destination.exists():
        raise FileExistsError(destination)
    if not destination.parent.is_dir():
        raise FileNotFoundError(destination.parent)

    fd, temporary_name = tempfile.mkstemp(prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent)
    os.close(fd)
    temporary = Path(temporary_name)
    try:
        with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as source_db:
            with closing(sqlite3.connect(temporary)) as backup_db:
                source_db.backup(backup_db)
                result = backup_db.execute("PRAGMA integrity_check").fetchone()
                if not result or result[0] != "ok":
                    raise sqlite3.DatabaseError("backup integrity check failed")
        with temporary.open("rb") as backup_file:
            os.fsync(backup_file.fileno())
        # Hard-link makes publication atomic and refuses to overwrite an existing backup.
        os.link(temporary, destination)
        temporary.unlink()
        directory_fd = os.open(destination.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="SQLite database path")
    parser.add_argument("destination", type=Path, help="new backup path; existing files are never overwritten")
    args = parser.parse_args()
    backup_database(args.source, args.destination)
    print(f"Backup verified: {args.destination}")


if __name__ == "__main__":
    main()
