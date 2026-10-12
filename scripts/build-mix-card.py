#!/usr/bin/env python3
"""Aura guest mix card — quiet variants, fold gutter, reverse branding."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pymupdf as fitz
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PUBLIC = ROOT / "public" / "files"
ART = Path("/opt/cursor/artifacts")
FONTS = ROOT / "assets" / "fonts"

W, H = 170 * mm, 108 * mm
FOLD_GAP = 8 * mm  # clear zone for folding

INK = (0.93, 0.91, 0.88)
MUTED = (0.62, 0.58, 0.52)
AMBER = (0.78, 0.48, 0.22)
AMBER_DIM = (0.55, 0.38, 0.22)
LINE = (0.78, 0.68, 0.50)
RULE = (0.42, 0.34, 0.26)

SITE = "hpaura.ru"
ADDRESS_1 = "Широкая, 29"
ADDRESS_2 = "м. Медведково · 10 минут"
PHONE = "+7 (916) 333-81-89"
TELEGRAM = "@hp_aura"
TAGLINE = "Здесь каждая деталь помогает замедлиться"


def register_fonts() -> None:
    mapping = {
        "Mont": "Montserrat-Regular.ttf",
        "MontM": "Montserrat-Medium.ttf",
        "MontSB": "Montserrat-SemiBold.ttf",
        "MontB": "Montserrat-Bold.ttf",
        "MontL": "Montserrat-Light.ttf",
        "Corm": "CormorantGaramond-Regular.ttf",
        "CormM": "CormorantGaramond-Medium.ttf",
        "CormSB": "CormorantGaramond-SemiBold.ttf",
        "CormI": "CormorantGaramond-Italic.ttf",
        "CormLI": "CormorantGaramond-LightItalic.ttf",
        "Lit": "Literata-Regular.ttf",
        "LitI": "Literata-Italic.ttf",
        "LitM": "Literata-Medium.ttf",
        "LitSB": "Literata-SemiBold.ttf",
    }
    for name, file in mapping.items():
        path = FONTS / file
        if not path.exists():
            raise SystemExit(f"Missing font: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path)))


def fill_bg(c: canvas.Canvas, rgb=(0.055, 0.05, 0.045)) -> None:
    c.setFillColorRGB(*rgb)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def soft_mist(c: canvas.Canvas, x, y, rx, ry, color, strength=0.10, steps=40) -> None:
    """Diffuse elliptical wash — no hard rings."""
    for i in range(steps, 0, -1):
        t = i / steps
        a = strength * (t ** 2.4)
        mix = tuple(0.055 * (1 - a) + color[j] * a for j in range(3))
        c.setFillColorRGB(*mix)
        c.ellipse(x - rx * t, y - ry * t, x + rx * t, y + ry * t, fill=1, stroke=0)


def soft_band(c: canvas.Canvas, y0, y1, color, strength=0.07, steps=36) -> None:
    h = y1 - y0
    for i in range(steps):
        t = i / (steps - 1)
        peak = 1 - abs(2 * t - 1)
        a = strength * (peak ** 2.0)
        mix = tuple(0.055 * (1 - a) + color[j] * a for j in range(3))
        c.setFillColorRGB(*mix)
        yy = y0 + h * t
        c.rect(0, yy, W, h / steps + 0.4, fill=1, stroke=0)


def soft_veil(c: canvas.Canvas, color, strength=0.045) -> None:
    """Full-bleed quiet tint — almost flat atmosphere."""
    for i in range(24):
        t = i / 23
        a = strength * (1 - abs(2 * t - 1)) ** 1.8
        mix = tuple(0.055 * (1 - a) + color[j] * a for j in range(3))
        c.setFillColorRGB(*mix)
        c.rect(0, H * t, W, H / 24 + 0.5, fill=1, stroke=0)


def fold_marks(c: canvas.Canvas) -> None:
    mid = W / 2
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.3)
    # short ticks only — fold gutter stays empty for scoring/fold
    c.line(mid, H - 3.5 * mm, mid, H - 8 * mm)
    c.line(mid, 3.5 * mm, mid, 8 * mm)


def hairline(c: canvas.Canvas, x1, y, x2, rgb=LINE, width=0.55) -> None:
    c.setStrokeColorRGB(*rgb)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def draw_wordmark(c: canvas.Canvas, cx, y, *, display="CormSB", size=22) -> None:
    c.setFillColorRGB(*INK)
    c.setFont(display, size)
    c.drawCentredString(cx, y, "aura")
    c.setFillColorRGB(*AMBER)
    c.setFont("MontL", 6)
    c.drawCentredString(cx, y - 4.2 * mm, "HOOKAHPLACE")


def draw_interior(c: canvas.Canvas, variant: str) -> None:
    fill_bg(c)

    if variant == "mist":
        # atmosphere only — no stacked ellipses (avoids ring noise)
        soft_veil(c, AMBER, 0.07)
        soft_band(c, H * 0.55, H * 1.05, AMBER, 0.05, 48)
        display, label_f, story_f = "CormSB", "MontM", "CormLI"
    elif variant == "horizon":
        soft_veil(c, AMBER_DIM, 0.035)
        soft_band(c, H * 0.28, H * 0.78, AMBER, 0.065, 40)
        display, label_f, story_f = "LitSB", "MontM", "LitI"
    else:  # orb
        soft_veil(c, AMBER_DIM, 0.03)
        soft_mist(c, W * 0.5, H * 0.52, 68 * mm, 58 * mm, AMBER, 0.07, 44)
        display, label_f, story_f = "CormM", "MontM", "CormI"

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
    draw_wordmark(c, cx, H - 14 * mm, display=display, size=20)

    c.setFillColorRGB(*AMBER)
    c.setFont(label_f, 7)
    c.drawCentredString(cx, H - 28 * mm, "ИМЯ МАСТЕРА")
    hairline(c, left_x + 4 * mm, H - 32.5 * mm, left_r - 4 * mm)

    qr = 26 * mm
    qr_x = cx - qr / 2
    qr_y = H - 66 * mm
    c.setFillColorRGB(0.07, 0.065, 0.055)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.7)
    c.roundRect(qr_x, qr_y, qr, qr, 1.2 * mm, fill=1, stroke=1)

    c.setFillColorRGB(*MUTED)
    c.setFont(story_f, 7)
    c.drawCentredString(cx, qr_y - 5.5 * mm, "Если понравился кальян — можете оставить чаевые")

    col_w = (left_w - 5 * mm) / 2
    base_y = 18 * mm
    c.setFillColorRGB(*AMBER)
    c.setFont(label_f, 6.5)
    c.drawCentredString(left_x + col_w / 2, base_y + 5 * mm, "№ СТОЛА")
    hairline(c, left_x + 1 * mm, base_y, left_x + col_w - 1 * mm)
    c.drawCentredString(left_x + col_w + 5 * mm + col_w / 2, base_y + 5 * mm, "ВРЕМЯ")
    hairline(c, left_x + col_w + 6 * mm, base_y, left_r - 1 * mm)

    c.setFillColorRGB(*AMBER_DIM)
    c.setFont("MontL", 5.5)
    c.drawCentredString(cx, 8 * mm, SITE)

    # ---- RIGHT ----
    c.setFillColorRGB(*INK)
    c.setFont(display, 15)
    c.drawCentredString(rcx, H - 14 * mm, "Кальянный микс")
    c.setFillColorRGB(*AMBER)
    c.setFont(story_f, 7.5)
    c.drawCentredString(rcx, H - 20 * mm, "Special · авторский микс Ауры")
    hairline(c, right_x + 8 * mm, H - 23.5 * mm, right_r - 8 * mm, AMBER_DIM, 0.4)

    line_x = right_x + 2 * mm
    line_w = right_w - 4 * mm
    start_y = H - 36 * mm
    gap = 9.5 * mm
    for i in range(6):
        y = start_y - i * gap
        c.setFillColorRGB(*AMBER)
        c.circle(line_x + 1.2 * mm, y, 0.7 * mm, fill=1, stroke=0)
        hairline(c, line_x + 4 * mm, y, line_x + line_w, LINE, 0.65)

    draw_wordmark(c, rcx, 14 * mm, display=display, size=14)


def draw_reverse(c: canvas.Canvas, variant: str) -> None:
    """Exterior / reverse spread: naming · logo · address · site."""
    fill_bg(c)

    if variant == "mist":
        soft_veil(c, AMBER, 0.07)
        soft_band(c, H * 0.35, H * 0.85, AMBER, 0.05, 48)
        display, story_f = "CormSB", "CormLI"
    elif variant == "horizon":
        soft_veil(c, AMBER_DIM, 0.035)
        soft_band(c, H * 0.22, H * 0.8, AMBER, 0.06, 40)
        display, story_f = "LitSB", "LitI"
    else:
        soft_veil(c, AMBER_DIM, 0.03)
        soft_mist(c, W * 0.5, H * 0.5, 72 * mm, 62 * mm, AMBER, 0.065, 44)
        display, story_f = "CormM", "CormI"

    fold_marks(c)

    mid = W / 2
    left_cx = (9 * mm + mid - FOLD_GAP / 2) / 2
    right_cx = (mid + FOLD_GAP / 2 + W - 9 * mm) / 2

    # Left — naming / logo
    c.setFillColorRGB(*INK)
    c.setFont(display, 36)
    c.drawCentredString(left_cx, H * 0.58, "aura")
    c.setFillColorRGB(*AMBER)
    c.setFont("MontL", 7.5)
    c.drawCentredString(left_cx, H * 0.58 - 7 * mm, "HOOKAHPLACE")
    c.setFillColorRGB(*MUTED)
    c.setFont(story_f, 8)
    # wrap tagline
    c.drawCentredString(left_cx, H * 0.35, "Здесь каждая деталь")
    c.drawCentredString(left_cx, H * 0.35 - 4.5 * mm, "помогает замедлиться")

    # Right — address / contacts / site
    c.setFillColorRGB(*INK)
    c.setFont(display, 16)
    c.drawCentredString(right_cx, H * 0.68, "Аура")
    c.setFillColorRGB(*AMBER)
    c.setFont("MontM", 7)
    c.drawCentredString(right_cx, H * 0.68 - 5.5 * mm, "HOOKAHPLACE")

    hairline(c, right_cx - 18 * mm, H * 0.55, right_cx + 18 * mm, AMBER_DIM, 0.4)

    c.setFillColorRGB(*INK)
    c.setFont("MontM", 9)
    c.drawCentredString(right_cx, H * 0.48, ADDRESS_1)
    c.setFillColorRGB(*MUTED)
    c.setFont("MontL", 7)
    c.drawCentredString(right_cx, H * 0.48 - 4.5 * mm, ADDRESS_2)

    c.setFillColorRGB(*INK)
    c.setFont("MontM", 8)
    c.drawCentredString(right_cx, H * 0.34, PHONE)
    c.setFillColorRGB(*MUTED)
    c.setFont("MontL", 7)
    c.drawCentredString(right_cx, H * 0.34 - 4.2 * mm, TELEGRAM)

    c.setFillColorRGB(*AMBER)
    c.setFont("MontSB", 9)
    c.drawCentredString(right_cx, H * 0.18, SITE)


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

    # normalize via temp
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    src = fitz.open(path)
    src.save(str(tmp_path), garbage=4, deflate=True, clean=True)
    src.close()
    path.write_bytes(tmp_path.read_bytes())
    tmp_path.unlink(missing_ok=True)


def export_previews(pdf_path: Path, stem: str) -> list[Path]:
    out: list[Path] = []
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        side = "inside" if i == 0 else "outside"
        name = f"{stem}_{side}.png"
        pix = page.get_pixmap(matrix=fitz.Matrix(3.0, 3.0), alpha=False)
        for dest in (PUBLIC, ART, DOCS):
            dest.mkdir(parents=True, exist_ok=True)
            p = dest / name
            pix.save(str(p))
        out.append(PUBLIC / name)
        print(f"Wrote preview {name}")
    # copy pdf
    for dest in (PUBLIC, ART, DOCS):
        (dest / pdf_path.name).write_bytes(pdf_path.read_bytes())
    doc.close()
    return out


def build() -> None:
    register_fonts()
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    variants = ("mist", "horizon", "orb")
    for v in variants:
        pdf = DOCS / f"AURA_Kartochka_{v}.pdf"
        write_pdf(pdf, v)
        export_previews(pdf, f"AURA_Kartochka_{v}")
        print(f"Wrote {pdf}")

    # default alias = mist (quietest)
    default = DOCS / "AURA_Kartochka_mist.pdf"
    for dest in (DOCS / "AURA_Kartochka_miksa.pdf", PUBLIC / "AURA_Kartochka_miksa.pdf", ART / "AURA_Kartochka_miksa.pdf"):
        dest.write_bytes(default.read_bytes())
    for side in ("inside", "outside"):
        src = PUBLIC / f"AURA_Kartochka_mist_{side}.png"
        for dest in (
            PUBLIC / f"AURA_Kartochka_miksa_{side}.png",
            ART / f"AURA_Kartochka_miksa_{side}.png",
            DOCS / f"AURA_Kartochka_miksa_{side}.png",
        ):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(src.read_bytes())
        shot = ART / "screenshots" / f"aura-kartochka-{side}.png"
        try:
            shot.parent.mkdir(parents=True, exist_ok=True)
            shot.write_bytes(src.read_bytes())
        except OSError as exc:
            print(f"skip screenshot {shot}: {exc}")

    # keep legacy single png as inside
    for dest in (PUBLIC / "AURA_Kartochka_miksa.png", ART / "AURA_Kartochka_miksa.png", DOCS / "AURA_Kartochka_miksa.png"):
        dest.write_bytes((PUBLIC / "AURA_Kartochka_mist_inside.png").read_bytes())

    print("Done — variants: mist, horizon, orb (each: inside + outside)")


if __name__ == "__main__":
    build()
