"""Draws the demo plans' logos (sticker tiles in the Liquid Pass palette).

Run: python scripts/make-plan-logos.py  ->  scripts/plan-logos/<slug>.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / "plan-logos"
IMPACT = "C:/Windows/Fonts/impact.ttf"
BOLD = "C:/Windows/Fonts/arialbd.ttf"

# name -> (initials, tag, background, ink)
PLANS = {
    "StreamBox Premium": ("SB", "STREAM", "#4da2ff", "#000000"),
    "CloudDesk Pro": ("CD", "SAAS", "#dceeff", "#000000"),
    "AI Writer Pro": ("AI", "WRITE", "#ffd731", "#000000"),
    "Iron Gym Monthly": ("IG", "GYM", "#fb4903", "#ffffff"),
    "Coworking Day Pass": ("CW", "DESK", "#55db9c", "#000000"),
    "Language Tutor Plus": ("LT", "LEARN", "#e9ccff", "#000000"),
    "Rust Bootcamp Access": ("RB", "CODE", "#fbe7c6", "#000000"),
    "Weekend Music Fest": ("MF", "LIVE", "#5c4ade", "#ffffff"),
    "News Pass Annual": ("NP", "NEWS", "#ffdede", "#000000"),
    "Design Assets Vault": ("DV", "DESIGN", "#ffd731", "#000000"),
    "Cloud GPU Hours": ("GPU", "COMPUTE", "#000000", "#55db9c"),
}

def slug(name: str) -> str:
    return "-".join(name.lower().split())

def draw(initials, tag, bg, ink):
    S = 512
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # hard offset shadow, then the tile with a thick black edge
    d.rounded_rectangle((40, 40, S - 8, S - 8), radius=96, fill="#000000")
    d.rounded_rectangle((8, 8, S - 40, S - 40), radius=96, fill=bg, outline="#000000", width=18)
    cx = (8 + S - 40) / 2
    size = 250 if len(initials) <= 2 else 190
    f = ImageFont.truetype(IMPACT, size)
    box = d.textbbox((0, 0), initials, font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text((cx - w / 2 - box[0], 205 - h / 2 - box[1]), initials, font=f, fill=ink)
    # tag pill
    t = ImageFont.truetype(BOLD, 40)
    tb = d.textbbox((0, 0), tag, font=t)
    tw = tb[2] - tb[0]
    pill_bg, pill_ink = ("#000000", bg) if bg != "#000000" else ("#ffffff", "#000000")
    x0, y0 = cx - tw / 2 - 30, 352
    d.rounded_rectangle((x0, y0, x0 + tw + 60, y0 + 70), radius=35, fill=pill_bg)
    d.text((cx - tw / 2 - tb[0], y0 + 35 - (tb[3] - tb[1]) / 2 - tb[1]), tag, font=t, fill=pill_ink)
    return img

OUT.mkdir(exist_ok=True)
for name, spec in PLANS.items():
    p = OUT / f"{slug(name)}.png"
    draw(*spec).quantize(colors=64, method=Image.Quantize.FASTOCTREE).save(p, optimize=True)
    print(p.name, p.stat().st_size)
