#!/usr/bin/env python3
"""Guest mix card for HookahPlace Aura — print-ready two-panel layout."""

from pathlib import Path

from fpdf import FPDF

OUT_PDF = Path(__file__).resolve().parents[1] / "docs" / "AURA_Kartochka_miksa.pdf"
OUT_PREVIEW = Path("/opt/cursor/artifacts") / "AURA_Kartochka_miksa.png"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_I = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
# Prefer italic if present
_ITALIC_CANDIDATES = [
    "/usr/share/fonts/truetype/noto/NotoSerif-Italic.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
]
for _p in _ITALIC_CANDIDATES:
    if Path(_p).exists():
        FONT_I = _p
        break

# Card size close to original ratio, slightly larger for handwriting
W, H = 170, 108  # mm landscape

BLACK = (11, 11, 11)
AMBER = (212, 120, 42)
AMBER_SOFT = (180, 110, 50)
WHITE = (245, 245, 245)
MUTED = (168, 168, 168)
LINE = (230, 190, 130)
WRITE = (236, 210, 160)
PANEL = (18, 16, 14)


class Card(FPDF):
    def __init__(self):
        # Custom (width, height) in mm — landscape card, no orientation swap
        super().__init__(unit="mm", format=(W, H))
        self.set_auto_page_break(False)
        self.add_font("Sans", "", FONT)
        self.add_font("Sans", "B", FONT_B)
        self.add_font("SerifI", "", FONT_I)


def fill_rect(pdf: Card, x, y, w, h, rgb):
    pdf.set_fill_color(*rgb)
    pdf.rect(x, y, w, h, style="F")


def glow(pdf: Card, x, y, r, rgb, steps=10):
    for i in range(steps, 0, -1):
        t = i / steps
        alpha_rgb = tuple(int(c * (0.08 + 0.12 * t)) for c in rgb)
        # approximate soft glow with nested circles (opaque fade via dark mix)
        mix = tuple(int(BLACK[j] * (1 - 0.35 * t) + rgb[j] * 0.35 * t) for j in range(3))
        pdf.set_fill_color(*mix)
        rr = r * t
        pdf.ellipse(x - rr, y - rr, rr * 2, rr * 2, style="F")


def hairline(pdf: Card, x1, y, x2, color=LINE, weight=0.2):
    pdf.set_draw_color(*color)
    pdf.set_line_width(weight)
    pdf.line(x1, y, x2, y)


def label(pdf: Card, text, x, y, w, *, size=7, color=MUTED, align="C", bold=False):
    pdf.set_xy(x, y)
    pdf.set_font("Sans", "B" if bold else "", size)
    pdf.set_text_color(*color)
    pdf.cell(w, 4, text, align=align)


def logo_block(pdf: Card, cx, y):
    pdf.set_font("Sans", "B", 14)
    pdf.set_text_color(*WHITE)
    pdf.set_xy(cx - 20, y)
    pdf.cell(40, 6, "aura", align="C")
    pdf.set_font("Sans", "", 5.5)
    pdf.set_text_color(*AMBER)
    pdf.set_xy(cx - 20, y + 5.5)
    pdf.cell(40, 3, "HOOKAHPLACE", align="C")


def write_line(pdf: Card, x, y, w):
    hairline(pdf, x, y, x + w, LINE, 0.25)


def build():
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    OUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    pdf = Card()
    pdf.add_page()

    # Background
    fill_rect(pdf, 0, 0, W, H, BLACK)
    # Amber glows — top and bottom, matching menu stage
    glow(pdf, W * 0.5, -2, 55, AMBER, steps=12)
    glow(pdf, W * 0.85, H + 4, 48, AMBER, steps=12)
    glow(pdf, W * 0.12, H * 0.15, 28, AMBER_SOFT, steps=8)

    # Thin outer frame
    pdf.set_draw_color(*AMBER_SOFT)
    pdf.set_line_width(0.35)
    pdf.rect(3, 3, W - 6, H - 6)

    # Vertical divider
    mid = W / 2
    pdf.set_draw_color(*AMBER_SOFT)
    pdf.set_line_width(0.2)
    pdf.line(mid, 8, mid, H - 8)

    # ---- LEFT PANEL ----
    left_x = 8
    left_w = mid - 14

    logo_block(pdf, left_x + left_w / 2, 7)

    label(pdf, "ИМЯ МАСТЕРА", left_x, 20, left_w, size=7, color=AMBER, bold=True)
    write_line(pdf, left_x + 6, 28, left_w - 12)

    # QR placeholder
    qr_size = 28
    qr_x = left_x + (left_w - qr_size) / 2
    qr_y = 33
    pdf.set_draw_color(*LINE)
    pdf.set_line_width(0.35)
    pdf.set_fill_color(22, 20, 18)
    pdf.rect(qr_x, qr_y, qr_size, qr_size, style="DF")
    # inner dashed feel via smaller rect
    pdf.set_draw_color(*AMBER_SOFT)
    pdf.set_line_width(0.15)
    pdf.rect(qr_x + 2, qr_y + 2, qr_size - 4, qr_size - 4)
    pdf.set_xy(qr_x, qr_y + qr_size / 2 - 3)
    pdf.set_font("Sans", "", 5.5)
    pdf.set_text_color(*MUTED)
    pdf.cell(qr_size, 3, "QR", align="C")
    pdf.set_xy(qr_x, qr_y + qr_size / 2)
    pdf.cell(qr_size, 3, "чаевые", align="C")

    tip = "Если понравился кальян — можете оставить чаевые"
    pdf.set_xy(left_x, qr_y + qr_size + 3)
    pdf.set_font("SerifI", "", 6)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(left_w, 3.2, tip, align="C")

    # Table / time
    row_y = 78
    col_w = (left_w - 6) / 2
    label(pdf, "№ СТОЛА", left_x, row_y, col_w, size=6.5, color=AMBER, bold=True)
    write_line(pdf, left_x + 2, row_y + 8, col_w - 4)
    label(pdf, "ВРЕМЯ", left_x + col_w + 6, row_y, col_w, size=6.5, color=AMBER, bold=True)
    write_line(pdf, left_x + col_w + 8, row_y + 8, col_w - 4)

    pdf.set_xy(left_x, H - 14)
    pdf.set_font("Sans", "", 5)
    pdf.set_text_color(*AMBER)
    pdf.cell(left_w, 3, "hpaura.ru", align="C")

    # ---- RIGHT PANEL ----
    right_x = mid + 6
    right_w = W - right_x - 8

    # Soft decorative orb behind lines (drawn first so title stays readable)
    glow(pdf, right_x + right_w * 0.55, 58, 30, AMBER, steps=9)

    label(pdf, "КАЛЬЯННЫЙ МИКС", right_x, 8, right_w, size=9.5, color=WHITE, bold=True)
    pdf.set_xy(right_x, 13.5)
    pdf.set_font("SerifI", "", 6)
    pdf.set_text_color(*AMBER)
    pdf.cell(right_w, 3, "Special · авторский микс Ауры", align="C")
    hairline(pdf, right_x + 10, 18.5, right_x + right_w - 10, AMBER_SOFT, 0.2)

    # Writing lines for mix components
    line_x = right_x + 4
    line_w = right_w - 8
    start_y = 28
    gap = 9.2
    for i in range(6):
        y = start_y + i * gap
        pdf.set_fill_color(*AMBER)
        pdf.ellipse(line_x - 1.2, y - 0.7, 1.4, 1.4, style="F")
        hairline(pdf, line_x + 2, y, line_x + 2 + line_w - 2, WRITE, 0.35)

    # Footer brand
    pdf.set_xy(right_x, H - 16)
    pdf.set_font("Sans", "B", 11)
    pdf.set_text_color(*WHITE)
    pdf.cell(right_w, 5, "aura", align="C")
    pdf.set_xy(right_x, H - 11.5)
    pdf.set_font("Sans", "", 5)
    pdf.set_text_color(*AMBER)
    pdf.cell(right_w, 3, "HOOKAHPLACE", align="C")

    pdf.output(OUT_PDF)
    print(f"Wrote {OUT_PDF}")

    # Preview PNG via pymupdf
    import pymupdf as fitz

    doc = fitz.open(OUT_PDF)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
    pix.save(str(OUT_PREVIEW))
    # also copy pdf to artifacts
    art_pdf = Path("/opt/cursor/artifacts") / "AURA_Kartochka_miksa.pdf"
    art_pdf.write_bytes(OUT_PDF.read_bytes())
    print(f"Wrote {OUT_PREVIEW}")
    print(f"Wrote {art_pdf}")


if __name__ == "__main__":
    build()
