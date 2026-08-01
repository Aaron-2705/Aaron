#!/usr/bin/env python
"""Generate the Open Graph card and the favicon.

    pip install pillow
    python scripts/build-brand-assets.py

Outputs, all committed so neither the build nor the runtime depends on this
script or on a system font:

    app/opengraph-image.png   1200x630, picked up automatically by Next
    app/icon.svg              vector favicon, the one modern browsers prefer
    app/favicon.ico           16/32/48px fallback

The card is deliberately plain: a dark field, the mark, the name, and one
accent hairline. An OG card is read at thumbnail size in a chat client, so
anything finer than this is lost.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"

# The steel theme, matching app/globals.css.
BG = (16, 19, 28)
SURFACE = (23, 27, 38)
ACCENT = (63, 116, 255)
FOREGROUND = (232, 236, 245)
MUTED = (138, 148, 168)

FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def build_og() -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Faint grid, so the card reads as an instrument panel rather than a slide.
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=(24, 28, 40), width=1)
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(24, 28, 40), width=1)

    # Accent rule down the left edge.
    d.rectangle([0, 0, 8, H], fill=ACCENT)

    pad = 88
    d.text((pad, 132), "AARON", font=font("segoeuib.ttf", 108), fill=FOREGROUND)
    d.text(
        (pad, 262),
        "ADVANCED AUTONOMOUS RESPONSIVE OPERATIONS NETWORK",
        font=font("consola.ttf", 21),
        fill=ACCENT,
    )

    d.line([(pad, 322), (W - pad, 322)], fill=(48, 56, 76), width=1)

    d.text((pad, 356), "Dhwanit Sukhadiya", font=font("seguisb.ttf", 46), fill=FOREGROUND)
    d.text(
        (pad, 420),
        "IT & network support  ·  Windows Server and Active Directory  ·  security home-labs",
        font=font("segoeui.ttf", 25),
        fill=MUTED,
    )

    # Corner brackets, the same motif HudPanel uses.
    def rect(x0, y0, x1, y1):
        # PIL requires x1 >= x0, and the right-hand bracket grows leftwards.
        d.rectangle([min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)], fill=ACCENT)

    b, t = 34, 3
    for cx, dx in [(pad, 1), (W - pad, -1)]:
        cy = 508
        rect(cx, cy, cx + dx * b, cy + t)
        rect(cx, cy, cx + dx * t, cy + b)

    d.text(
        (pad + 56, 500),
        "INTERACTIVE SECURITY COMMAND CENTER",
        font=font("consola.ttf", 19),
        fill=MUTED,
    )

    out = APP / "opengraph-image.png"
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size:,} bytes)")

    # Twitter reuses the same art at the same ratio.
    twitter = APP / "twitter-image.png"
    img.save(twitter, "PNG", optimize=True)
    print(f"wrote {twitter.relative_to(ROOT)} ({twitter.stat().st_size:,} bytes)")


ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="AARON">
  <rect width="64" height="64" rx="12" fill="#10131c"/>
  <path d="M32 9 53 55h-9.6l-3.7-8.6H24.3L20.6 55H11L32 9Z" fill="#3f74ff"/>
  <path d="M32 26.5 27.6 37h8.8L32 26.5Z" fill="#10131c"/>
</svg>
"""


def build_icons() -> None:
    svg = APP / "icon.svg"
    svg.write_text(ICON_SVG, encoding="utf-8")
    print(f"wrote {svg.relative_to(ROOT)}")

    # Raster fallback. Drawn rather than rasterized from the SVG so the script
    # needs no SVG renderer; the two shapes are simple enough to keep in step.
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 64
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=12 * s, fill=(16, 19, 28, 255))
    d.polygon(
        [(32 * s, 9 * s), (53 * s, 55 * s), (43.4 * s, 55 * s), (39.7 * s, 46.4 * s),
         (24.3 * s, 46.4 * s), (20.6 * s, 55 * s), (11 * s, 55 * s)],
        fill=ACCENT + (255,),
    )
    d.polygon(
        [(32 * s, 26.5 * s), (27.6 * s, 37 * s), (36.4 * s, 37 * s)],
        fill=(16, 19, 28, 255),
    )

    ico = APP / "favicon.ico"
    img.save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"wrote {ico.relative_to(ROOT)} ({ico.stat().st_size:,} bytes)")


if __name__ == "__main__":
    build_og()
    build_icons()
