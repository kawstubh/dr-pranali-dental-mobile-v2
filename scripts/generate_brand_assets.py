#!/usr/bin/env python3
"""Generate Expo-compatible PNGs from checked-in SVG brand artwork."""
from pathlib import Path
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROFILES = [
    ("patient", ROOT / "assets" / "patient-shield.svg", ROOT / "assets" / "monochrome-shield.svg", ROOT / "assets" / "notification-mark.svg", ROOT / "assets"),
    ("doctor", ROOT / "doctor-app" / "assets" / "doctor-shield.svg", ROOT / "doctor-app" / "assets" / "monochrome-shield.svg", ROOT / "doctor-app" / "assets" / "notification-mark.svg", ROOT / "doctor-app" / "assets"),
]
for name, logo, mono, notification, dest in PROFILES:
    for size, suffix in [(1024, "icon"), (1024, "adaptive-foreground"), (512, "splash"), (256, "favicon")]:
        src = logo
        cairosvg.svg2png(url=str(src), write_to=str(dest / f"{name}-{suffix}.png"), output_width=size, output_height=size)
    cairosvg.svg2png(url=str(mono), write_to=str(dest / f"{name}-monochrome.png"), output_width=432, output_height=432)
    cairosvg.svg2png(url=str(notification), write_to=str(dest / f"{name}-notification.png"), output_width=96, output_height=96)
    print(f"Generated {name} icon, adaptive foreground, splash, monochrome, notification and favicon PNGs.")

# Losslessly optimize the legacy Doctor logo if it is still over the 300 KB budget.
legacy = ROOT / "doctor-app" / "assets" / "dr-pranali-branded-logo.png"
if legacy.exists() and legacy.stat().st_size > 300 * 1024:
    temp = legacy.with_suffix(".optimized.png")
    with Image.open(legacy) as image:
        image.save(temp, format="PNG", optimize=True, compress_level=9)
    if temp.stat().st_size < legacy.stat().st_size:
        temp.replace(legacy)
        print(f"Losslessly optimized legacy Doctor logo to {legacy.stat().st_size} bytes.")
    else:
        temp.unlink(missing_ok=True)
        print(f"Legacy Doctor logo could not be reduced below {legacy.stat().st_size} bytes losslessly.")
