"""Sidecar entrypoint. Runs the FastAPI app on localhost:8008.

This module is the PyInstaller entrypoint compiled into the `ai-server` binary
that Tauri spawns. It is also runnable directly during development:

    python server.py
"""

import os

import uvicorn

from app.main import app


def main() -> None:
    port = int(os.environ.get("AI_PORT", "8008"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
