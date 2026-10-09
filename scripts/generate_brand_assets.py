#!/usr/bin/env python3
"""Generate Expo-compatible PNGs from checked-in SVG brand artwork."""
from pathlib import Path
import cairosvg

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
