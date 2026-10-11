from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

ROOT = Path(__file__).resolve().parent.parent
SIZE = 1024
S = 3
W = SIZE * S

def gradient(size, top, bottom):
    im = Image.new("RGB", (size, size))
    pix = im.load()
    for y in range(size):
        t = y / max(1, size - 1)
        c = tuple(round(top[i] * (1-t) + bottom[i] * t) for i in range(3))
        for x in range(size):
            pix[x, y] = c
    return im

def tooth_points(cx, cy, scale=1.0):
    # Smooth-looking classic tooth silhouette, drawn at 3x then downsampled.
    pts = [
        (-170,-155),(-110,-190),(-35,-175),(20,-150),(80,-175),(145,-180),
        (188,-130),(190,-65),(160,10),(130,75),(105,165),(70,205),
        (38,190),(12,110),(-8,95),(-30,110),(-55,190),(-90,210),
        (-125,175),(-145,90),(-180,10),(-205,-65),(-198,-115)
    ]
    return [(int((cx+x*scale)*S), int((cy+y*scale)*S)) for x,y in pts]

def sparkle(draw, cx, cy, r, fill):
    pts = [(cx,cy-r),(cx+r*0.22,cy-r*0.22),(cx+r,cy),(cx+r*0.22,cy+r*0.22),
           (cx,cy+r),(cx-r*0.22,cy+r*0.22),(cx-r,cy),(cx-r*0.22,cy-r*0.22)]
    draw.polygon([(int(x*S),int(y*S)) for x,y in pts], fill=fill)

def make_icon(kind, output, foreground=False):
    if kind == "patient":
        top, bottom = (0, 216, 220), (0, 137, 166)
        navy, cyan = (8, 47, 92), (30, 247, 237)
        bg = (0, 198, 200)
    else:
        top, bottom = (5, 100, 208), (4, 25, 74)
        navy, cyan = (2, 18, 55), (0, 221, 255)
        bg = (7, 45, 105)

    if foreground:
        im = Image.new("RGBA", (W, W), (0,0,0,0))
        draw = ImageDraw.Draw(im)
        # Thin orbital swoosh kept within adaptive-icon safe zone.
        draw.arc((int(170*S),int(205*S),int(860*S),int(830*S)), 205, 342, fill=(*cyan,235), width=18*S)
        # Tooth shadow then bright enamel.
        pts = tooth_points(512, 500, 1.0)
        shadow = Image.new("RGBA", (W,W), (0,0,0,0))
        ImageDraw.Draw(shadow).polygon([(x+8*S,y+16*S) for x,y in pts], fill=(0,0,0,90))
        im = Image.alpha_composite(im, shadow.filter(ImageFilter.GaussianBlur(12*S)))
        draw = ImageDraw.Draw(im)
        draw.polygon(pts, fill=(244,252,255,255), outline=(*cyan,255))
        # enamel highlight
        draw.arc((int(360*S),int(335*S),int(670*S),int(690*S)), 200, 320, fill=(255,255,255,240), width=13*S)
        sparkle(draw, 745, 300, 68, (255,255,255,255))
    else:
        im = gradient(W, top, bottom).convert("RGBA")
        draw = ImageDraw.Draw(im)
        # Soft radial glow behind the symbol.
        glow = Image.new("RGBA", (W,W), (0,0,0,0))
        gd = ImageDraw.Draw(glow)
        for radius, alpha in [(320,20),(270,24),(220,30)]:
            gd.ellipse(((512-radius)*S,(500-radius)*S,(512+radius)*S,(500+radius)*S), fill=(*cyan,alpha))
        im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(35*S)))
        draw = ImageDraw.Draw(im)
        draw.arc((int(110*S),int(145*S),int(920*S),int(930*S)), 202, 338, fill=(*cyan,150), width=7*S)
        # Deep soft shadow
        pts = tooth_points(512, 495, 1.12)
        shadow = Image.new("RGBA", (W,W), (0,0,0,0))
        ImageDraw.Draw(shadow).polygon([(x+12*S,y+18*S) for x,y in pts], fill=(0,0,20,110))
        im = Image.alpha_composite(im, shadow.filter(ImageFilter.GaussianBlur(18*S)))
        draw = ImageDraw.Draw(im)
        # Tooth silhouette and enamel gradient-like inset.
        draw.polygon(pts, fill=(248,253,255,255), outline=(*cyan,255))
        draw.line([(int(390*S),int(380*S)),(int(430*S),int(350*S)),(int(480*S),int(365*S))], fill=(255,255,255,255), width=11*S, joint="curve")
        # Orbital ribbon crosses the lower tooth; use layered strokes.
        ribbon = [(int(120*S),int(665*S)),(int(270*S),int(735*S)),(int(455*S),int(690*S)),(int(640*S),int(610*S)),(int(830*S),int(465*S)),(int(900*S),int(420*S))]
        draw.line(ribbon, fill=(*navy,255), width=62*S, joint="curve")
        draw.line(ribbon, fill=(*cyan,255), width=39*S, joint="curve")
        draw.line([(x,y-5*S) for x,y in ribbon], fill=(110,255,255,180), width=5*S, joint="curve")
        sparkle(draw, 760, 260, 65, (255,255,255,255))
    im = im.resize((SIZE,SIZE), Image.Resampling.LANCZOS)
    output.parent.mkdir(parents=True, exist_ok=True)
    im.save(output, "PNG", optimize=True)

make_icon("patient", ROOT / "assets" / "patient-app-icon.png", foreground=False)
make_icon("patient", ROOT / "assets" / "patient-app-icon-foreground.png", foreground=True)
make_icon("doctor", ROOT / "doctor-app" / "assets" / "doctor-app-icon.png", foreground=False)
make_icon("doctor", ROOT / "doctor-app" / "assets" / "doctor-app-icon-foreground.png", foreground=True)
print("Generated patient and doctor app icons (1024x1024 PNG) and transparent adaptive foregrounds.")
