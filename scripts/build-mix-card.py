#!/usr/bin/env python3
"""Guest mix card for HookahPlace Aura — print-ready two-panel layout."""

from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT_PDF = Path(__file__).resolve().parents[1] / "docs" / "AURA_Kartochka_miksa.pdf"
ART_DIR = Path("/opt/cursor/artifacts")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_I = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
for cand in (
    "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
):
    if Path(cand).exists():
        FONT_I = cand
        break

# Landscape card
W, H = 170 * mm, 108 * mm

BLACK = (0.043, 0.043, 0.043)
AMBER = (0.831, 0.471, 0.165)
AMBER_SOFT = (0.706, 0.431, 0.196)
WHITE = (0.96, 0.96, 0.96)
MUTED = (0.66, 0.66, 0.66)
WRITE = (0.925, 0.824, 0.627)


def set_rgb(c: canvas.Canvas, rgb):
    c.setFillColorRGB(*rgb)
    c.setStrokeColorRGB(*rgb)


def glow(c: canvas.Canvas, x, y, r, steps=12):
    for i in range(steps, 0, -1):
        t = i / steps
        mix = tuple(BLACK[j] * (1 - 0.32 * t) + AMBER[j] * 0.32 * t for j in range(3))
        c.setFillColorRGB(*mix)
        c.circle(x, y, r * t, fill=1, stroke=0)


def hairline(c: canvas.Canvas, x1, y, x2, rgb=WRITE, width=0.7):
    c.setStrokeColorRGB(*rgb)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


def build():
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    ART_DIR.mkdir(parents=True, exist_ok=True)

    pdfmetrics.registerFont(TTFont("Sans", FONT))
    pdfmetrics.registerFont(TTFont("SansB", FONT_B))
    pdfmetrics.registerFont(TTFont("SerifI", FONT_I))

    c = canvas.Canvas(str(OUT_PDF), pagesize=(W, H))
    c.setTitle("Аура · Карточка микса")
    c.setAuthor("HookahPlace Aura")

    # Background
    c.setFillColorRGB(*BLACK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    glow(c, W * 0.50, H + 6 * mm, 55 * mm)
    glow(c, W * 0.88, -4 * mm, 48 * mm)
    glow(c, W * 0.12, H * 0.78, 28 * mm, steps=8)

    # Outer frame
    c.setStrokeColorRGB(*AMBER_SOFT)
    c.setLineWidth(0.9)
    c.rect(3 * mm, 3 * mm, W - 6 * mm, H - 6 * mm, fill=0, stroke=1)

    mid = W / 2
    c.setStrokeColorRGB(*AMBER_SOFT)
    c.setLineWidth(0.55)
    c.line(mid, 8 * mm, mid, H - 8 * mm)

    # ---- LEFT ----
    left_x = 8 * mm
    left_w = mid - 14 * mm
    cx = left_x + left_w / 2

    c.setFillColorRGB(*WHITE)
    c.setFont("SansB", 16)
    c.drawCentredString(cx, H - 14 * mm, "aura")
    c.setFillColorRGB(*AMBER)
    c.setFont("Sans", 6)
    c.drawCentredString(cx, H - 18.5 * mm, "HOOKAHPLACE")

    c.setFillColorRGB(*AMBER)
    c.setFont("SansB", 8)
    c.drawCentredString(cx, H - 28 * mm, "ИМЯ МАСТЕРА")
    hairline(c, left_x + 6 * mm, H - 33 * mm, left_x + left_w - 6 * mm)

    # Empty QR area — blank field for later sticker/code
    qr = 30 * mm
    qr_x = cx - qr / 2
    qr_y = H - 70 * mm
    c.setFillColorRGB(0.086, 0.078, 0.071)
    c.setStrokeColorRGB(*WRITE)
    c.setLineWidth(0.9)
    c.rect(qr_x, qr_y, qr, qr, fill=1, stroke=1)
    c.setStrokeColorRGB(*AMBER_SOFT)
    c.setLineWidth(0.4)
    c.rect(qr_x + 2 * mm, qr_y + 2 * mm, qr - 4 * mm, qr - 4 * mm, fill=0, stroke=1)
    # intentionally empty inside

    c.setFillColorRGB(*MUTED)
    c.setFont("SerifI", 7)
    tip = "Если понравился кальян — можете оставить чаевые"
    c.drawCentredString(cx, qr_y - 6 * mm, tip)

    # Table / time
    col_w = (left_w - 6 * mm) / 2
    base_y = 22 * mm
    c.setFillColorRGB(*AMBER)
    c.setFont("SansB", 7)
    c.drawCentredString(left_x + col_w / 2, base_y + 6 * mm, "№ СТОЛА")
    hairline(c, left_x + 2 * mm, base_y, left_x + col_w - 2 * mm)
    c.drawCentredString(left_x + col_w + 6 * mm + col_w / 2, base_y + 6 * mm, "ВРЕМЯ")
    hairline(c, left_x + col_w + 8 * mm, base_y, left_x + 2 * col_w + 4 * mm)

    c.setFillColorRGB(*AMBER)
    c.setFont("Sans", 6)
    c.drawCentredString(cx, 9 * mm, "hpaura.ru")

    # ---- RIGHT ----
    right_x = mid + 6 * mm
    right_w = W - right_x - 8 * mm
    rcx = right_x + right_w / 2

    glow(c, right_x + right_w * 0.55, H * 0.45, 30 * mm, steps=9)

    c.setFillColorRGB(*WHITE)
    c.setFont("SansB", 11)
    c.drawCentredString(rcx, H - 14 * mm, "КАЛЬЯННЫЙ МИКС")
    c.setFillColorRGB(*AMBER)
    c.setFont("SerifI", 7)
    c.drawCentredString(rcx, H - 19 * mm, "Special · авторский микс Ауры")
    hairline(c, right_x + 10 * mm, H - 22 * mm, right_x + right_w - 10 * mm, AMBER_SOFT, 0.5)

    line_x = right_x + 5 * mm
    line_w = right_w - 10 * mm
    start_y = H - 34 * mm
    gap = 9.2 * mm
    for i in range(6):
        y = start_y - i * gap
        c.setFillColorRGB(*AMBER)
        c.circle(line_x, y, 0.9 * mm, fill=1, stroke=0)
        hairline(c, line_x + 3 * mm, y, line_x + 3 * mm + line_w - 3 * mm, WRITE, 0.9)

    c.setFillColorRGB(*WHITE)
    c.setFont("SansB", 12)
    c.drawCentredString(rcx, 14 * mm, "aura")
    c.setFillColorRGB(*AMBER)
    c.setFont("Sans", 6)
    c.drawCentredString(rcx, 9.5 * mm, "HOOKAHPLACE")

    c.save()
    print(f"Wrote {OUT_PDF}")

    # Preview PNG + copy artifacts
    import pymupdf as fitz

    doc = fitz.open(OUT_PDF)
    # Normalize / linearize for picky viewers
    out_clean = OUT_PDF.with_name("AURA_Kartochka_miksa.pdf")
    doc.save(
        str(out_clean),
        garbage=4,
        deflate=True,
        clean=True,
        pretty=False,
    )
    # overwrite same path already written — reopen from bytes
    doc.close()

    doc = fitz.open(OUT_PDF)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(3.2, 3.2), alpha=False)
    preview = ART_DIR / "AURA_Kartochka_miksa.png"
    pix.save(str(preview))
    art_pdf = ART_DIR / "AURA_Kartochka_miksa.pdf"
    art_pdf.write_bytes(OUT_PDF.read_bytes())
    print(f"Wrote {preview}")
    print(f"Wrote {art_pdf}")
    print("page", doc[0].rect)
    print(doc[0].get_text())


if __name__ == "__main__":
    build()
