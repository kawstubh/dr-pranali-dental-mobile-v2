#!/usr/bin/env python3
"""Inventory image references across both apps and validate image files/pixel statistics."""
import json, re, sys, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SKIP = {".git", "node_modules", "dist", ".expo"}
REF_RE = re.compile(r"""(?:require\s*\(\s*|from\s*)['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg))['"]""", re.I)
CONFIG_FILES = ["app.json", "doctor-app/app.json"]
errors, references = [], []

def app_files():
    for base in (ROOT, ROOT / "doctor-app"):
        for path in base.rglob("*"):
            if any(part in SKIP for part in path.parts):
                continue
            if path.is_file() and path.suffix.lower() in {".js", ".jsx", ".ts", ".tsx"}:
                yield path

for source in app_files():
    try:
        text = source.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError):
        continue
    for rel in REF_RE.findall(text):
        if rel.startswith(("http://", "https://", "data:")):
            continue
        references.append((source.relative_to(ROOT).as_posix(), rel, (source.parent / rel).resolve()))

def add_config_image(config_rel, rel, label):
    if isinstance(rel, str) and rel.strip():
        config = ROOT / config_rel
        references.append((f"{config_rel} ({label})", rel, (config.parent / rel).resolve()))

for config_rel in CONFIG_FILES:
    config_path = ROOT / config_rel
    try:
        cfg = json.loads(config_path.read_text(encoding="utf-8"))
        expo = cfg["expo"]
        add_config_image(config_rel, expo.get("icon"), "icon")
        add_config_image(config_rel, (expo.get("splash") or {}).get("image"), "splash")
        add_config_image(config_rel, (((expo.get("android") or {}).get("adaptiveIcon") or {}).get("foregroundImage")), "adaptive foreground")
        add_config_image(config_rel, (((expo.get("android") or {}).get("adaptiveIcon") or {}).get("monochromeImage")), "adaptive monochrome")
        add_config_image(config_rel, ((expo.get("web") or {}).get("favicon")), "favicon")
        for plugin in expo.get("plugins", []):
            if isinstance(plugin, list) and len(plugin) > 1 and isinstance(plugin[1], dict):
                add_config_image(config_rel, plugin[1].get("icon"), f"plugin {plugin[0]} icon")
            elif isinstance(plugin, dict):
                for name, options in plugin.items():
                    if isinstance(options, dict):
                        add_config_image(config_rel, options.get("icon"), f"plugin {name} icon")
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        errors.append(f"INVALID CONFIG: {config_rel} ({exc})")

print("IMAGE REFERENCE INVENTORY")
seen = set()
for source, rel, target in references:
    key = (source, rel)
    if key in seen:
        continue
    seen.add(key)
    if not target.exists():
        errors.append(f"MISSING IMAGE: {source} references {rel}")
        print(f"FAIL  {source} -> {rel} (missing)")
        continue
    print(f"OK    {source} -> {rel}")
    if target.suffix.lower() == ".svg":
        try:
            ET.parse(target)
        except Exception as exc:
            errors.append(f"INVALID SVG: {target.relative_to(ROOT)} ({exc})")
        continue
    if target.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        continue
    try:
        with Image.open(target) as im:
            im.verify()
        with Image.open(target) as im:
            im = im.convert("RGBA")
            width, height = im.size
            pixels = list(im.getdata())
            total = max(len(pixels), 1)
            transparent = sum(1 for p in pixels if p[3] <= 3) / total
            near_black = sum(1 for p in pixels if p[3] > 3 and max(p[0], p[1], p[2]) < 8) / total
            rgb_stats = ImageStat.Stat(im.convert("RGB"))
            max_channel_variance = max(rgb_stats.var) if rgb_stats.var else 0.0
            size = target.stat().st_size
            print(f"      {width}x{height}, {size} bytes, transparent={transparent:.1%}, near-black={near_black:.1%}, max-channel-variance={max_channel_variance:.1f}")
            if transparent > 0.998:
                errors.append(f"NEAR-BLANK IMAGE: {target.relative_to(ROOT)} ({transparent:.2%} transparent)")
            if near_black > 0.995 and max_channel_variance < 2.0:
                errors.append(f"MOSTLY BLACK IMAGE: {target.relative_to(ROOT)} ({near_black:.2%} near-black)")
            if max_channel_variance < 0.1 and transparent < 0.98:
                errors.append(f"FLAT/BLANK IMAGE: {target.relative_to(ROOT)} (variance {max_channel_variance:.3f})")
            if size > 300 * 1024:
                print(f"      WARNING: exceeds 300 KB; compression review required.")
    except Exception as exc:
        errors.append(f"INVALID IMAGE: {target.relative_to(ROOT)} ({exc})")

if errors:
    print("\nIMAGE AUDIT FAILED")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)
print(f"\nImage audit passed: {len(seen)} unique image references checked.")
