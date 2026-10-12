#!/usr/bin/env python3
"""Aura guest mix card — style locked to hpaura.ru (Jaipur / CoFo / site gradient)."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pymupdf as fitz
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PUBLIC = ROOT / "public" / "files"
ART = Path("/opt/cursor/artifacts")
FONTS = ROOT / "assets" / "fonts"
BRAND = ROOT / "assets" / "brand"

W, H = 170 * mm, 108 * mm
FOLD_GAP = 8 * mm

# Site palette (menu + hpaura.ru refs)
BLACK = (0.043, 0.043, 0.043)  # #0b0b0b
INK = (0.961, 0.961, 0.961)  # #f5f5f5
MUTED = (0.659, 0.659, 0.659)  # #a8a8a8
AMBER = (0.831, 0.471, 0.165)  # #d4782a
GLOW = (0.910, 0.416, 0.090)  # #e86a17
LINE = (0.85, 0.72, 0.52)
RULE = (0.35, 0.28, 0.22)

SITE = "hpaura.ru"
TELEGRAM = "@hp_aura"

AURA_NAME = "aura"
AURA_ADDR = "Широкая, 29"
AURA_META = "м. Медведково · 10 минут"
AURA_PHONE = "+7 (916) 333-81-89"

KOR_NAME = "aura"
KOR_ADDR = "Космонавта Стрекалова, 54"
KOR_META = "15 минут от городского парка"
KOR_PHONE = "+7 (991) 650-82-13"

_logo_cut = BRAND / "aura-logo.png"
_logo_raw = BRAND / "aura-logo-ref.png"
LOGO_REF = _logo_cut if _logo_cut.exists() else _logo_raw


def register_fonts() -> None:
    # Exact faces from hpaura.ru @font-face (Tilda "Jaipur" family):
    # 100=CoFoSans Regular, 300=CoFoRobert Italic, 400=jaipur,
    # 500=CoFoSans Medium, 900=CoFoSans Black
    mapping = {
        "Jaipur": "jaipur.ttf",
        "CoFo": "CoFoSans-Regular.ttf",
        "CoFoM": "CoFoSans-Medium.ttf",
        "CoFoB": "CoFoSans-Black.ttf",
        "RobertI": "CoFoRobert-RegularIt.ttf",
    }
    for name, file in mapping.items():
        path = FONTS / file
        if not path.exists():
            raise SystemExit(f"Missing font: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path)))


def fill_bg(c: canvas.Canvas) -> None:
    c.setFillColorRGB(*BLACK)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def site_gradient(c: canvas.Canvas, strength: float = 1.0) -> None:
    """Black → amber/orange like hpaura.ru hero and menu glow."""
    steps = 64
    for i in range(steps):
        t = i / (steps - 1)
        # horizontal wash: left black → right copper
        r = BLACK[0] * (1 - t) + GLOW[0] * t * 0.55 * strength
        g = BLACK[1] * (1 - t) + GLOW[1] * t * 0.35 * strength
        b = BLACK[2] * (1 - t) + GLOW[2] * t * 0.12 * strength
        c.setFillColorRGB(r, g, b)
        c.rect(W * t, 0, W / steps + 0.5, H, fill=1, stroke=0)
    # soft vertical dim so text stays readable
    for i in range(24):
        t = i / 23
        a = 0.35 * (t ** 1.4)
        c.setFillColorRGB(BLACK[0], BLACK[1], BLACK[2])
        c.setFillColorRGB(
            BLACK[0] * a + 0 * (1 - a),
            BLACK[1] * a,
            BLACK[2] * a,
        )
        # overlay from bottom
        c.setFillColorRGB(*BLACK)
        c.setStrokeColorRGB(*BLACK)
    # translucent black veil top/bottom via bands
    for i in range(30):
        t = i / 29
        # edges darker
        edge = max(0, 1 - abs(2 * t - 1) * 1.15)
        a = 0.22 * (1 - edge)
        mix = tuple(BLACK[j] * a for j in range(3))
        # draw as additive darkening by mixing toward black over current — approximate with rect opacity via color
        c.setFillColorRGB(
            BLACK[0] * (0.55 + 0.45 * edge),
            BLACK[1] * (0.55 + 0.45 * edge),
            BLACK[2] * (0.55 + 0.45 * edge),
        )
        # skip — keep gradient clean; use radial mist instead


def soft_mist(c: canvas.Canvas, x, y, rx, ry, color, strength=0.22, steps=36) -> None:
    for i in range(steps, 0, -1):
        t = i / steps
        a = strength * (t ** 2.2)
        mix = tuple(BLACK[j] * (1 - a) + color[j] * a for j in range(3))
        c.setFillColorRGB(*mix)
        c.ellipse(x - rx * t, y - ry * t, x + rx * t, y + ry * t, fill=1, stroke=0)


def paint_atmosphere(c: canvas.Canvas, variant: str, *, reverse: bool = False) -> None:
    fill_bg(c)
    if variant == "site" or reverse:
        # Primary site look: left dark → right amber (hpaura.ru hero), no rings
        steps = 90
        for i in range(steps):
            t = i / (steps - 1)
            ease = t ** 1.05
            r = BLACK[0] * (1 - ease) + GLOW[0] * 0.85 * ease
            g = BLACK[1] * (1 - ease) + GLOW[1] * 0.48 * ease
            b = BLACK[2] * (1 - ease) + 0.06 * ease
            c.setFillColorRGB(r, g, b)
            c.rect(W * t, 0, W / steps + 0.6, H, fill=1, stroke=0)
        return

    if variant == "mist":
        soft_mist(c, W * 0.7, H * 0.8, 70 * mm, 40 * mm, GLOW, 0.20, 36)
        soft_mist(c, W * 0.25, H * 0.2, 45 * mm, 30 * mm, AMBER, 0.10, 28)
    elif variant == "horizon":
        for i in range(40):
            t = i / 39
            peak = 1 - abs(2 * t - 1)
            a = 0.16 * (peak ** 1.6)
            mix = tuple(BLACK[j] * (1 - a) + GLOW[j] * a for j in range(3))
            c.setFillColorRGB(*mix)
            c.rect(0, H * 0.2 + H * 0.55 * t, W, H * 0.55 / 40 + 0.4, fill=1, stroke=0)
    else:  # orb
        soft_mist(c, W * 0.5, H * 0.5, 70 * mm, 58 * mm, GLOW, 0.18, 40)


def fold_marks(c: canvas.Canvas) -> None:
    mid = W / 2
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.3)
    c.line(mid, H - 3.5 * mm, mid, H - 8 * mm)
    c.line(mid, 3.5 * mm, mid, 8 * mm)


def hairline(c: canvas.Canvas, x1, y, x2, rgb=LINE, width=0.55) -> None:
    c.setStrokeColorRGB(*rgb)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def write_band(c: canvas.Canvas, x, y, w, h=5.5 * mm) -> None:
    """Soft mist for writing — low contrast, feathered, no hard outline."""
    # vertical + horizontal feather via nested translucent ellipses/rects
    c.saveState()
    layers = (
        (1.00, 0.06),
        (0.82, 0.08),
        (0.64, 0.10),
        (0.46, 0.12),
        (0.30, 0.10),
        (0.18, 0.07),
    )
    for scale, a in layers:
        half_h = (h * 0.5) * scale
        inset = (1 - scale) * 4 * mm
        try:
            c.setFillColorRGB(0.92, 0.88, 0.82, alpha=a)
        except TypeError:
            c.setFillAlpha(a)
            c.setFillColorRGB(0.92, 0.88, 0.82)
        # rounded soft body
        c.roundRect(
            x + inset,
            y - half_h,
            max(w - 2 * inset, 2 * mm),
            half_h * 2,
            half_h * 0.9,
            fill=1,
            stroke=0,
        )
    c.restoreState()
    # barely-there guide
    c.saveState()
    try:
        c.setStrokeColorRGB(0.9, 0.86, 0.8, alpha=0.22)
    except TypeError:
        c.setStrokeAlpha(0.22)
        c.setStrokeColorRGB(0.9, 0.86, 0.8)
    c.setLineWidth(0.35)
    c.line(x + 3 * mm, y, x + w - 3 * mm, y)
    c.restoreState()


def draw_tracked(
    c: canvas.Canvas,
    text: str,
    cx: float,
    y: float,
    font: str,
    size: float,
    tracking: float,
    *,
    rgb=INK,
) -> None:
    """Centre-aligned text with letter-spacing (site uses ~1px tracking on caps)."""
    c.setFont(font, size)
    c.setFillColorRGB(*rgb)
    widths = [c.stringWidth(ch, font, size) for ch in text]
    total = sum(widths) + tracking * max(len(text) - 1, 0)
    x = cx - total / 2
    for ch, w in zip(text, widths):
        c.drawString(x, y, ch)
        x += w + tracking


def draw_wordmark(c: canvas.Canvas, cx, y, *, size=22) -> None:
    # Site logo geometry ≈ CoFo Sans Black + tracked CoFo Sans Regular
    c.setFillColorRGB(*INK)
    c.setFont("CoFoB", size)
    c.drawCentredString(cx, y, "aura")
    draw_tracked(
        c,
        "HOOKAHPLACE",
        cx,
        y - 4.2 * mm,
        "CoFo",
        5.2,
        1.15,
        rgb=INK,
    )


def draw_logo_image(c: canvas.Canvas, cx, cy, max_w, max_h) -> float | None:
    """Draw site aura mark (blob). Returns rendered height, or None."""
    if not LOGO_REF.exists():
        return None
    from PIL import Image as PILImage

    with PILImage.open(LOGO_REF) as im:
        iw, ih = im.size
    scale = min(max_w / iw, max_h / ih)
    w, h = iw * scale, ih * scale
    c.drawImage(
        ImageReader(str(LOGO_REF)),
        cx - w / 2,
        cy - h / 2,
        width=w,
        height=h,
        mask="auto",
        preserveAspectRatio=True,
    )
    return h


def draw_brand_block(c: canvas.Canvas, cx: float, cy: float, *, mark_h: float, hp_size: float = 5.2) -> None:
    """Site brand stack: logo mark + tracked HOOKAHPLACE in CoFo Sans."""
    h = draw_logo_image(c, cx, cy + 1.2 * mm, mark_h * 2.6, mark_h)
    if h is None:
        draw_wordmark(c, cx, cy + 2 * mm, size=mark_h * 1.5)
        return
    draw_tracked(
        c,
        "HOOKAHPLACE",
        cx,
        cy - h * 0.55 - 1.8 * mm,
        "CoFo",
        hp_size,
        1.15,
        rgb=INK,
    )


def draw_site_tagline(c: canvas.Canvas, cx: float, y_top: float) -> None:
    """Site hero type: CoFoSans Regular caps + CoFoRobert Italic caps."""
    draw_tracked(c, "ЗДЕСЬ КАЖДАЯ ДЕТАЛЬ", cx, y_top, "CoFo", 6.8, 0.55, rgb=INK)
    c.setFillColorRGB(*INK)
    c.setFont("RobertI", 7.2)
    c.drawCentredString(cx, y_top - 4.4 * mm, "ПОМОГАЕТ ЗАМЕДЛИТЬСЯ")
    c.drawCentredString(cx, y_top - 8.8 * mm, "И НАСЛАДИТЬСЯ МОМЕНТОМ")


def draw_interior(c: canvas.Canvas, variant: str) -> None:
    paint_atmosphere(c, variant, reverse=False)
    fold_marks(c)

    mid = W / 2
    left_x = 9 * mm
    left_r = mid - FOLD_GAP / 2 - 3 * mm
    left_w = left_r - left_x
    cx = left_x + left_w / 2

    right_x = mid + FOLD_GAP / 2 + 3 * mm
    right_r = W - 9 * mm
    right_w = right_r - right_x
    rcx = right_x + right_w / 2

    # ---- LEFT ----
    draw_brand_block(c, cx, H - 17 * mm, mark_h=14 * mm, hp_size=5.0)

    draw_tracked(c, "ИМЯ МАСТЕРА", cx, H - 32 * mm, "CoFo", 6.2, 0.7, rgb=INK)
    write_band(c, left_x + 4 * mm, H - 37 * mm, left_w - 8 * mm, 3.4 * mm)

    qr = 25 * mm
    qr_x = cx - qr / 2
    qr_y = H - 69 * mm
    c.setFillColorRGB(0.05, 0.05, 0.05)
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(0.7)
    c.roundRect(qr_x, qr_y, qr, qr, 1.2 * mm, fill=1, stroke=1)

    c.setFillColorRGB(*MUTED)
    c.setFont("RobertI", 6.4)
    c.drawCentredString(cx, qr_y - 5.5 * mm, "Если понравился кальян — можете оставить чаевые")

    col_w = (left_w - 5 * mm) / 2
    base_y = 18 * mm
    draw_tracked(
        c, "№ СТОЛА", left_x + col_w / 2, base_y + 5.5 * mm, "CoFo", 5.8, 0.55, rgb=INK
    )
    write_band(c, left_x + 1 * mm, base_y, col_w - 2 * mm, 3.2 * mm)
    draw_tracked(
        c,
        "ВРЕМЯ",
        left_x + col_w + 5 * mm + col_w / 2,
        base_y + 5.5 * mm,
        "CoFo",
        5.8,
        0.55,
        rgb=INK,
    )
    write_band(c, left_x + col_w + 6 * mm, base_y, col_w - 2 * mm, 3.2 * mm)

    draw_tracked(c, SITE.upper(), cx, 8 * mm, "CoFo", 5.2, 0.8, rgb=MUTED)

    # ---- RIGHT ----
    c.setFillColorRGB(*INK)
    c.setFont("CoFoB", 19)
    c.drawCentredString(rcx, H - 16 * mm, "Mix")
    hairline(c, right_x + 10 * mm, H - 21 * mm, right_r - 10 * mm, (0.85, 0.85, 0.85), 0.4)

    line_x = right_x + 2 * mm
    line_w = right_w - 4 * mm
    start_y = H - 32 * mm
    gap = 11 * mm
    for i in range(6):
        y = start_y - i * gap
        c.setFillColorRGB(*INK)
        c.circle(line_x + 1.2 * mm, y, 0.65 * mm, fill=1, stroke=0)
        write_band(c, line_x + 4 * mm, y, line_w - 4 * mm, 3.4 * mm)


def draw_reverse(c: canvas.Canvas, variant: str) -> None:
    paint_atmosphere(c, "site" if variant == "site" else variant, reverse=True)
    fold_marks(c)

    mid = W / 2
    left_cx = (9 * mm + mid - FOLD_GAP / 2) / 2
    right_cx = (mid + FOLD_GAP / 2 + W - 9 * mm) / 2
    panel_w = mid - FOLD_GAP / 2 - 9 * mm

    # Left — logo + site tagline
    draw_brand_block(c, left_cx, H * 0.62, mark_h=22 * mm, hp_size=6.0)
    draw_site_tagline(c, left_cx, H * 0.38)
    draw_tracked(c, SITE.upper(), left_cx, H * 0.16, "CoFo", 6.5, 0.9, rgb=INK)

    # Right — both venues (same type roles as site location cards)
    def venue_block(cx: float, y: float, addr: str, meta: str, phone: str) -> None:
        c.setFillColorRGB(*INK)
        c.setFont("CoFoB", 13)
        c.drawCentredString(cx, y, "aura")
        draw_tracked(c, "HOOKAHPLACE", cx, y - 4.2 * mm, "CoFo", 5.0, 1.1, rgb=INK)
        c.setFont("CoFoM", 8)
        c.drawCentredString(cx, y - 10.5 * mm, addr)
        c.setFillColorRGB(*MUTED)
        c.setFont("CoFo", 6.2)
        c.drawCentredString(cx, y - 14.5 * mm, meta)
        c.setFillColorRGB(*INK)
        c.setFont("CoFoM", 7.4)
        c.drawCentredString(cx, y - 19.5 * mm, phone)

    y = H * 0.78
    venue_block(right_cx, y, AURA_ADDR, AURA_META, AURA_PHONE)
    hairline(c, right_cx - 20 * mm, y - 24.5 * mm, right_cx + 20 * mm, (0.85, 0.85, 0.85), 0.4)
    venue_block(right_cx, y - 33 * mm, KOR_ADDR, KOR_META, KOR_PHONE)

    draw_tracked(c, TELEGRAM, right_cx, 12 * mm, "CoFo", 6.0, 0.5, rgb=MUTED)


def write_pdf(path: Path, variant: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=(W, H))
    c.setTitle(f"Аура · Карточка микса · {variant}")
    c.setAuthor("HookahPlace Aura")
    draw_interior(c, variant)
    c.showPage()
    draw_reverse(c, variant)
    c.showPage()
    c.save()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    src = fitz.open(path)
    src.save(str(tmp_path), garbage=4, deflate=True, clean=True)
    src.close()
    path.write_bytes(tmp_path.read_bytes())
    tmp_path.unlink(missing_ok=True)


def export_previews(pdf_path: Path, stem: str) -> None:
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        side = "inside" if i == 0 else "outside"
        name = f"{stem}_{side}.png"
        pix = page.get_pixmap(matrix=fitz.Matrix(3.0, 3.0), alpha=False)
        for dest in (PUBLIC, ART, DOCS):
            dest.mkdir(parents=True, exist_ok=True)
            pix.save(str(dest / name))
        print(f"Wrote preview {name}")
    for dest in (PUBLIC, ART, DOCS):
        (dest / pdf_path.name).write_bytes(pdf_path.read_bytes())
    doc.close()


def build() -> None:
    register_fonts()
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    # site = primary finished look; mist/horizon/orb keep atmosphere alternatives
    variants = ("site", "mist", "horizon", "orb")
    for v in variants:
        pdf = DOCS / f"AURA_Kartochka_{v}.pdf"
        write_pdf(pdf, v)
        export_previews(pdf, f"AURA_Kartochka_{v}")
        print(f"Wrote {pdf}")

    default = DOCS / "AURA_Kartochka_site.pdf"
    for dest in (
        DOCS / "AURA_Kartochka_miksa.pdf",
        PUBLIC / "AURA_Kartochka_miksa.pdf",
        ART / "AURA_Kartochka_miksa.pdf",
    ):
        dest.write_bytes(default.read_bytes())
    for side in ("inside", "outside"):
        src = PUBLIC / f"AURA_Kartochka_site_{side}.png"
        for dest in (
            PUBLIC / f"AURA_Kartochka_miksa_{side}.png",
            ART / f"AURA_Kartochka_miksa_{side}.png",
            DOCS / f"AURA_Kartochka_miksa_{side}.png",
        ):
            dest.write_bytes(src.read_bytes())
        try:
            shot = ART / "screenshots" / f"aura-kartochka-{side}.png"
            shot.parent.mkdir(parents=True, exist_ok=True)
            shot.write_bytes(src.read_bytes())
        except OSError as exc:
            print(f"skip screenshot {exc}")
    for dest in (
        PUBLIC / "AURA_Kartochka_miksa.png",
        ART / "AURA_Kartochka_miksa.png",
        DOCS / "AURA_Kartochka_miksa.png",
    ):
        dest.write_bytes((PUBLIC / "AURA_Kartochka_site_inside.png").read_bytes())

    print("Done — primary: site (+ mist/horizon/orb)")


if __name__ == "__main__":
    build()
