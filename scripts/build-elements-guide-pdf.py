#!/usr/bin/env python3
"""Polished PDF: Author's Menu elements — stories, recipes, aroma keys."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "assets" / "fonts"
LOGO = ROOT / "assets" / "brand" / "aura-logo.png"
OUTS = [
    ROOT / "docs" / "AURA_Elementy_miksy.pdf",
    ROOT / "public" / "files" / "AURA_Elementy_miksy.pdf",
    Path("/opt/cursor/artifacts") / "AURA_Elementy_miksy.pdf",
]

# Soft Aura palette (menu: deep burgundy on warm white)
INK = (0.12, 0.08, 0.07)
MUTED = (0.42, 0.36, 0.34)
ACCENT = (0.48, 0.12, 0.10)
RULE = (0.88, 0.84, 0.81)
WASH = (0.98, 0.96, 0.94)

pdfmetrics.registerFont(TTFont("Onest", str(FONTS / "Onest-Regular.ttf")))
pdfmetrics.registerFont(TTFont("OnestM", str(FONTS / "Onest-Medium.ttf")))
pdfmetrics.registerFont(TTFont("OnestB", str(FONTS / "Onest-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Robert", str(FONTS / "CoFoRobert-RegularIt.ttf")))

MIXES = [
    {
        "element": "ОГОНЬ",
        "title": "PHOENIX",
        "keys": "Возрождение · Пробуждение · Искра",
        "story": (
            "Вход в Ауру. Не разгоняемся — собираем поле. "
            "Мякоть Пейота держит, цитрус режет лишний шум, "
            "Ягодный Цветок тянет к своим. Не торопись."
        ),
        "recipe": [
            ("Кактус", "Мякоть Пейота", 40),
            ("Лемонграсс", "Цитрусовая свежесть", 30),
            ("Бузина", "Ягодный Цветок", 20),
            ("Алоэ", "Травянистый экстракт", 10),
        ],
    },
    {
        "element": "ВОДА",
        "title": "ABYSS",
        "keys": "Глубина · Поток · Течение",
        "story": (
            "Не кофе. Просто ток: Энергия, Лаймовая вода, "
            "Мякоть Пейота, Зеленое Яблоко. Сел — и поехал. Без истерики."
        ),
        "recipe": [
            ("Гоал", "Энергетик", 35),
            ("Лаймовый сорбет", "Лаймовая вода", 25),
            ("Кактус", "Мякоть Пейота", 20),
            ("Айс гренни", "Зелёное яблоко", 20),
        ],
    },
    {
        "element": "ЗЕМЛЯ",
        "title": "GAIA",
        "keys": "Изобилие · Жизнь · Тепло",
        "story": (
            "Когда хочется сесть дальше от шума. Мадху густой, гуава греет, "
            "Дюшес мягкий, Сливочный орех закрывает мир снаружи. "
            "Не одиночество — своя комната на чашу."
        ),
        "recipe": [
            ("Мёд", "Мадху", 35),
            ("Кашмир гуава", "Пряная Гуава", 30),
            ("Груша", "Дюшес", 20),
            ("Кокос", "Сливочный орех", 15),
        ],
    },
    {
        "element": "ВОЗДУХ",
        "title": "AETHER",
        "keys": "Свобода · Лёгкость · Дыхание",
        "story": (
            "Когда в жизни тесно — вот этот микс. Помело с горчинкой, "
            "Сад Гесперид, Тропический сок, цитрус. Не разгоняет — раздвигает."
        ),
        "recipe": [
            ("Памела", "Помело", 35),
            ("Оранжина", "Сад Гесперид", 30),
            ("Ананас", "Тропический сок", 20),
            ("Лемонграсс", "Цитрусовая свежесть", 15),
        ],
    },
]

NAMES = [
    (
        "PHOENIX",
        "Феникс — мифическая птица, которая сгорает и возрождается из пепла. "
        "Имя микса про огонь как искру и новое начало.",
    ),
    (
        "ABYSS",
        "Abyss — бездна, глубокая водная пустота (греч. abyssos — бездонный). "
        "Имя про глубину, поток и течение.",
    ),
    (
        "GAIA",
        "Гея — в греческой мифологии Земля, праматерь всего живого. "
        "Имя про изобилие, жизнь и тепло.",
    ),
    (
        "AETHER",
        "Эфир / Aether — верхний воздух, чистая сущность, которой дышат боги. "
        "Имя про свободу, лёгкость и дыхание.",
    ),
]

AROMAS = [
    (
        "Мякоть Пейота",
        "Кактус",
        "Пейот — кактус пустыни: снаружи жёсткий, внутри сочная мякоть. "
        "Имя — образ вкуса: зелёный, чуть колючий, сочный. Не про вещество — про характер.",
    ),
    (
        "Цитрусовая свежесть",
        "Лемонграсс",
        "Лемонграсс — трава с лимонной свежестью. Для гостя оставили ощущение: "
        "цитрус + свежесть, без ботаники.",
    ),
    (
        "Ягодный Цветок",
        "Бузина",
        "Бузина даёт тёмную ягоду и лёгкий цветочный шлейф. Имя собрали из двух половин вкуса.",
    ),
    (
        "Травянистый экстракт",
        "Алоэ",
        "«Алоэ» на слух тянет к крему. Во вкусе — мягкая травяная, чуть аптечная нота, "
        "поэтому назвали по ощущению.",
    ),
    (
        "Энергетик",
        "Гоал",
        "Техн. «гоал» — тёмная ягода / черника с ударом. В меню — «энергетик»: "
        "имя от эффекта микса, не от этикетки.",
    ),
    (
        "Лаймовая вода",
        "Лаймовый сорбет",
        "«Сорбет» звучит как десерт. Вкус ближе к холодному кислому лайму — легче сказать «вода».",
    ),
    (
        "Зелёное яблоко",
        "Айс гренни",
        "Ice Granny — холодное зелёное яблоко. Английское имя убрали, оставили прямой образ фрукта.",
    ),
    (
        "Мадху",
        "Мёд",
        "Madhu в санскрите / индийской традиции — мёд, сладость, тёплое и густое. "
        "Короткое слово под тон Ауры.",
    ),
    (
        "Пряная Гуава",
        "Кашмир гуава",
        "«Кашмир» — география на банке. Для гостя важнее вкус: гуава с пряной глубиной.",
    ),
    (
        "Дюшес",
        "Груша",
        "Привычное русское имя грушевого вкуса (сорт / конфеты «дюшес»). Сразу читается как груша.",
    ),
    (
        "Сливочный орех",
        "Кокос",
        "Не пляжный кокос, а молочно-ореховая мягкая текстура — поэтому сливочный орех.",
    ),
    (
        "Помело",
        "Памела",
        "Памела — техн. / торговое имя того же фрукта. Гостю — «помело», без брендового оттенка.",
    ),
    (
        "Сад Гесперид",
        "Оранжина",
        "В мифе Геспериды стерегли сад золотых плодов — образ апельсинового сада, "
        "а не газировки «Оранжина».",
    ),
    (
        "Тропический сок",
        "Ананас",
        "Сочный тропик без курортного клише: про вкус напитка/сока, не про ломтик на этикетке.",
    ),
]


def wrap(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def draw() -> None:
    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)

    path = OUTS[0]
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle("Аура · Авторское меню · Огонь Вода Земля Воздух")
    c.setAuthor("HookahPlace Aura / Solovev R.K.")
    c.setPageCompression(1)

    W, H = A4
    left, right = 20 * mm, W - 20 * mm
    width = right - left
    bottom = 18 * mm
    y = H - 18 * mm

    def new_page():
        nonlocal y
        c.showPage()
        # quiet page wash
        c.setFillColorRGB(*WASH)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        y = H - 18 * mm
        # running header
        c.setFillColorRGB(*MUTED)
        c.setFont("Onest", 7.5)
        c.drawString(left, H - 10 * mm, "aura  ·  авторское меню")
        c.drawRightString(right, H - 10 * mm, "огонь · вода · земля · воздух")
        c.setStrokeColorRGB(*RULE)
        c.setLineWidth(0.4)
        c.line(left, H - 12 * mm, right, H - 12 * mm)
        y = H - 20 * mm

    def need(h: float):
        if y - h < bottom:
            new_page()

    def gap(h: float = 4):
        nonlocal y
        y -= h

    def put(txt: str, font: str, size: float, rgb=INK, *, leading=None, x=None, max_w=None):
        nonlocal y
        x0 = left if x is None else x
        mw = width if max_w is None else max_w
        lead = leading or size * 1.4
        for line in wrap(c, txt, font, size, mw):
            need(lead + 1)
            c.setFillColorRGB(*rgb)
            c.setFont(font, size)
            c.drawString(x0, y, line)
            y -= lead

    def hairline():
        nonlocal y
        need(10)
        gap(3)
        c.setStrokeColorRGB(*RULE)
        c.setLineWidth(0.5)
        c.line(left, y, right, y)
        gap(8)

    def section(label: str):
        nonlocal y
        need(18)
        gap(2)
        c.setFillColorRGB(*ACCENT)
        c.setFont("OnestB", 9)
        # tracked-ish small caps feel
        c.drawString(left, y, label.upper())
        gap(5)
        c.setStrokeColorRGB(*ACCENT)
        c.setLineWidth(0.9)
        c.line(left, y, left + 14 * mm, y)
        gap(10)

    # First page background
    c.setFillColorRGB(*WASH)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Brand header
    if LOGO.exists():
        logo_h = 16 * mm
        logo_w = logo_h * 1.15
        c.drawImage(
            ImageReader(str(LOGO)),
            (W - logo_w) / 2,
            y - logo_h + 2 * mm,
            width=logo_w,
            height=logo_h,
            mask="auto",
            preserveAspectRatio=True,
        )
        y -= logo_h + 3 * mm
    c.setFillColorRGB(*ACCENT)
    c.setFont("OnestB", 11)
    brand = "HOOKAHPLACE"
    # simple tracking
    total = sum(c.stringWidth(ch, "OnestB", 8) for ch in brand) + 1.1 * (len(brand) - 1)
    bx = (W - total) / 2
    c.setFont("Onest", 8)
    for ch in brand:
        c.drawString(bx, y, ch)
        bx += c.stringWidth(ch, "Onest", 8) + 1.1
    gap(10)

    c.setFillColorRGB(*INK)
    c.setFont("OnestB", 22)
    title = "Авторское меню"
    c.drawCentredString(W / 2, y, title)
    gap(9)
    c.setFillColorRGB(*MUTED)
    c.setFont("Robert", 10.5)
    c.drawCentredString(
        W / 2,
        y,
        "Огонь · Вода · Земля · Воздух",
    )
    gap(5)
    c.setFont("Onest", 8.5)
    c.drawCentredString(
        W / 2,
        y,
        "Сторитейлинг · составы · расшифровка ароматов",
    )
    gap(8)
    hairline()

    # —— Mixes ——
    section("Миксы")

    col_tech = left
    col_guest = left + 48 * mm
    col_pct = right - 14 * mm

    for mix in MIXES:
        block_h = 48 * mm
        need(block_h)

        # element + english title on one line
        c.setFillColorRGB(*ACCENT)
        c.setFont("OnestB", 9)
        c.drawString(left, y, mix["element"])
        c.setFillColorRGB(*INK)
        c.setFont("OnestB", 16)
        c.drawString(left + 28 * mm, y - 1, mix["title"])
        gap(7)

        c.setFillColorRGB(*MUTED)
        c.setFont("Robert", 10)
        c.drawString(left, y, mix["keys"])
        gap(8)

        for line in wrap(c, mix["story"], "Robert", 10.5, width):
            need(14)
            c.setFillColorRGB(*INK)
            c.setFont("Robert", 10.5)
            c.drawString(left, y, line)
            y -= 14
        gap(5)

        # recipe rows — aligned columns
        c.setFillColorRGB(*MUTED)
        c.setFont("Onest", 7.5)
        c.drawString(col_tech, y, "ТЕХН.")
        c.drawString(col_guest, y, "ГОСТЮ")
        c.drawRightString(col_pct + 12 * mm, y, "%")
        gap(4)
        c.setStrokeColorRGB(*RULE)
        c.setLineWidth(0.35)
        c.line(left, y + 2, right, y + 2)
        gap(2)

        for i, (tech, guest, pct) in enumerate(mix["recipe"]):
            need(12)
            if i % 2 == 0:
                c.setFillColorRGB(0.96, 0.94, 0.92)
                c.rect(left - 1 * mm, y - 2.2, width + 2 * mm, 9.5, fill=1, stroke=0)
            c.setFillColorRGB(*INK)
            c.setFont("Onest", 9.5)
            c.drawString(col_tech, y, tech)
            c.setFont("OnestM", 9.5)
            c.drawString(col_guest, y, guest)
            c.setFont("OnestB", 9.5)
            c.drawRightString(col_pct + 12 * mm, y, f"{pct}%")
            y -= 10

        gap(6)
        hairline()

    # —— Names ——
    section("Имена миксов")
    for name, why in NAMES:
        need(28)
        c.setFillColorRGB(*INK)
        c.setFont("OnestB", 12)
        c.drawString(left, y, name)
        gap(6)
        for line in wrap(c, why, "Onest", 9.5, width):
            need(13)
            c.setFillColorRGB(*INK)
            c.setFont("Onest", 9.5)
            c.drawString(left, y, line)
            y -= 13
        gap(6)

    hairline()

    # —— Aromas ——
    section("Ароматы")
    put(
        "Гостевое имя → технический аромат → откуда слово и зачем так назвали.",
        "Robert",
        9.5,
        MUTED,
        leading=13,
    )
    gap(4)

    for guest, tech, why in AROMAS:
        need(34)
        c.setFillColorRGB(*INK)
        c.setFont("OnestB", 11)
        c.drawString(left, y, f"«{guest}»")
        gap(5)
        c.setFillColorRGB(*ACCENT)
        c.setFont("OnestM", 8.5)
        c.drawString(left, y, f"это  ·  {tech}")
        gap(5)
        for line in wrap(c, why, "Onest", 9.2, width):
            need(12)
            c.setFillColorRGB(*INK)
            c.setFont("Onest", 9.2)
            c.drawString(left, y, line)
            y -= 12.2
        gap(7)

    gap(4)
    hairline()
    c.setFillColorRGB(*MUTED)
    c.setFont("Onest", 8)
    c.drawCentredString(
        W / 2,
        y,
        "Сделано Соловьевым Р.К.  ·  Made by Solovev R.K.  ·  hpaura.ru",
    )

    c.save()

    # Clean + compress via PyMuPDF for sharper/smaller deliverable
    try:
        import tempfile

        import pymupdf as fitz

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        src = fitz.open(path)
        src.save(str(tmp_path), garbage=4, deflate=True, clean=True)
        src.close()
        path.write_bytes(tmp_path.read_bytes())
        tmp_path.unlink(missing_ok=True)
    except Exception as exc:  # noqa: BLE001
        print(f"compress skip: {exc}")

    data = path.read_bytes()
    for dest in OUTS[1:]:
        dest.write_bytes(data)
    print(f"Wrote {path} ({len(data)} bytes)")


if __name__ == "__main__":
    draw()
