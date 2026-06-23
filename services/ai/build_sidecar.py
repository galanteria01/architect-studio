"""Compile the FastAPI sidecar into a single binary named for the Tauri target.

Usage:
    python build_sidecar.py

Produces `apps/desktop/src-tauri/binaries/ai-server-<target-triple>(.exe)` which
Tauri's `externalBin` config bundles into the desktop app.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BINARIES_DIR = HERE.parent.parent / "apps" / "desktop" / "src-tauri" / "binaries"


def target_triple() -> str:
    """Best-effort Rust target triple for the host (matches Tauri's expectation)."""
    # Prefer rustc if available for accuracy.
    try:
        out = subprocess.check_output(["rustc", "-Vv"], text=True)
        for line in out.splitlines():
            if line.startswith("host:"):
                return line.split(":", 1)[1].strip()
    except Exception:
        pass

    system = platform.system()
    machine = platform.machine().lower()
    if system == "Darwin":
        return "aarch64-apple-darwin" if machine in ("arm64", "aarch64") else "x86_64-apple-darwin"
    if system == "Windows":
        return "x86_64-pc-windows-msvc"
    # Linux
    return "aarch64-unknown-linux-gnu" if machine in ("arm64", "aarch64") else "x86_64-unknown-linux-gnu"


def main() -> int:
    triple = target_triple()
    ext = ".exe" if platform.system() == "Windows" else ""
    print(f"Building ai-server sidecar for target: {triple}")

    BINARIES_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name",
        "ai-server",
        "--paths",
        str(HERE),
        "--collect-all",
        "uvicorn",
        "--collect-all",
        "fastapi",
        "--collect-submodules",
        "app",
        str(HERE / "server.py"),
    ]
    subprocess.check_call(cmd, cwd=HERE)

    built = HERE / "dist" / f"ai-server{ext}"
    if not built.exists():
        print(f"ERROR: expected build output not found at {built}", file=sys.stderr)
        return 1

    dest = BINARIES_DIR / f"ai-server-{triple}{ext}"
    shutil.copy2(built, dest)
    os.chmod(dest, 0o755)
    print(f"Sidecar ready: {dest}")

    if platform.system() == "Darwin":
        # Strip the quarantine attribute so Tauri can spawn it without Gatekeeper blocking.
        subprocess.run(["xattr", "-d", "com.apple.quarantine", str(dest)], check=False)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
