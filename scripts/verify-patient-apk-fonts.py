#!/usr/bin/env python3
"""Verify the exact licensed Patient fonts are embedded in the built APK."""
from __future__ import annotations

import hashlib
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APK = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "android/app/build/outputs/apk/release/app-release.apk"
FONT_DIR = ROOT / "assets/fonts"
FEATHER = ROOT / "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def main() -> int:
    if not APK.is_file():
        raise SystemExit(f"Patient APK not found: {APK}")
    expected = {
        digest(path.read_bytes()): path.name
        for path in sorted(FONT_DIR.glob("*.ttf"))
    }
    if len(expected) != 5:
        raise SystemExit(f"Expected exactly five local Inter TTFs; found {len(expected)}")
    if not FEATHER.is_file():
        raise SystemExit(f"Bundled Feather icon font not found: {FEATHER}")
    expected[digest(FEATHER.read_bytes())] = "Feather.ttf"

    with zipfile.ZipFile(APK) as archive:
        embedded = {
            digest(archive.read(name)): name
            for name in archive.namelist()
            if name.lower().endswith(".ttf")
        }

    missing = {name for fingerprint, name in expected.items() if fingerprint not in embedded}
    unexpected = set(embedded) - set(expected)
    if missing or unexpected:
        raise SystemExit(
            "APK font verification failed; "
            f"missing={sorted(missing)}, unexpected_sha256={sorted(unexpected)}"
        )
    print("APK font verification passed: Inter Regular/Medium/SemiBold/Bold/ExtraBold (OFL 1.1) and Feather (MIT).")
    for fingerprint, name in expected.items():
        print(f"{name}: {fingerprint}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
