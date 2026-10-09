#!/usr/bin/env python3
"""Audit static React Native image references and raster image health."""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILES = [ROOT / "App.js", ROOT / "doctor-app" / "App.js"]
REF_RE = re.compile(r"require\(['\"]([^'\"]+\.(?:png|jpe?g|webp|gif|svg))['\"]\)", re.I)
CONFIG_PATHS = [
    ("app.json", ("expo", "icon")),
    ("app.json", ("expo", "splash", "image")),
    ("app.json", ("expo", "android", "adaptiveIcon", "foregroundImage")),
    ("app.json", ("expo", "android", "adaptiveIcon", "monochromeImage")),
    ("app.json", ("expo", "web", "favicon")),
    ("doctor-app/app.json", ("expo", "icon")),
    ("doctor-app/app.json", ("expo", "splash", "image")),
    ("doctor-app/app.json", ("expo", "android", "adaptiveIcon", "foregroundImage")),
    ("doctor-app/app.json", ("expo", "android", "adaptiveIcon", "monochromeImage")),
    ("doctor-app/app.json", ("expo", "web", "favicon")),
]
errors, refs = [], []

def resolve_app(path, rel):
    return (path.parent / rel).resolve()

for source in SOURCE_FILES:
    if not source.exists():
        errors.append(f"MISSING SOURCE: {source.relative_to(ROOT)}")
        continue
    txt = source.read_text(encoding="utf-8-sig")
    for rel in REF_RE.findall(txt):
        target = resolve_app(source, rel)
        refs.append((source.relative_to(ROOT).as_posix(), rel, target))

for config_rel, keys in CONFIG_PATHS:
    config_path = ROOT / config_rel
    try:
        obj = json.loads(config_path.read_text(encoding="utf-8"))
        for key in keys:
            obj = obj[key]
        if isinstance(obj, str):
            refs.append((config_rel, obj, (config_path.parent / obj).resolve()))
    except (OSError, KeyError, TypeError, json.JSONDecodeError):
        errors.append(f"CONFIG PATH MISSING/INVALID: {config_rel} -> {'.'.join(keys)}")

print("IMAGE REFERENCE INVENTORY")
seen = set()
for source, rel, target in refs:
    key = (source, rel)
    if key in seen:
        continue
    seen.add(key)
    if not target.exists():
        errors.append(f"MISSING IMAGE: {source} references {rel}")
        print(f"FAIL  {source} -> {rel} (missing)")
        continue
    print(f"OK    {source} -> {rel}")
    if target.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        continue
    try:
        with Image.open(target) as im:
            im.verify()
        with Image.open(target) as im:
            im = im.convert("RGBA")
            pixels = list(im.getdata())
            total = max(len(pixels), 1)
            transparent = sum(1 for p in pixels if p[3] <= 3) / total
            near_black = sum(1 for p in pixels if p[3] > 3 and max(p[0], p[1], p[2]) < 8) / total
            opaque = [p for p in pixels if p[3] > 3]
            variance = 0.0
            if opaque:
                variance = sum(ImageStat.Stat(Image.new("RGB", (len(opaque), 1), tuple(opaque[0][:3]))).var) if False else 0.0
            if transparent > 0.998:
                errors.append(f"NEAR-BLANK IMAGE: {target.relative_to(ROOT)} ({transparent:.2%} transparent)")
            if near_black > 0.995:
                errors.append(f"MOSTLY BLACK IMAGE: {target.relative_to(ROOT)} ({near_black:.2%} near-black)")
            print(f"      {im.width}x{im.height}, {target.stat().st_size} bytes, transparent={transparent:.1%}, near-black={near_black:.1%}")
    except Exception as exc:
        errors.append(f"INVALID IMAGE: {target.relative_to(ROOT)} ({exc})")

if errors:
    print("\nIMAGE AUDIT FAILED")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)
print(f"\nImage audit passed: {len(seen)} unique source/config references checked.")
