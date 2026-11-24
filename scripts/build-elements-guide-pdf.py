#!/usr/bin/env python3
"""Author's Menu guide PDF — Platypus tables, airy spacing, no overlaps."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "assets" / "fonts"
LOGO = ROOT / "assets" / "brand" / "aura-logo.png"
OUTS = [
    ROOT / "docs" / "AURA_Elementy_miksy.pdf",
    ROOT / "public" / "files" / "AURA_Elementy_miksy.pdf",
    Path("/opt/cursor/artifacts") / "AURA_Elementy_miksy.pdf",
]

pdfmetrics.registerFont(TTFont("Onest", str(FONTS / "Onest-Regular.ttf")))
pdfmetrics.registerFont(TTFont("OnestM", str(FONTS / "Onest-Medium.ttf")))
pdfmetrics.registerFont(TTFont("OnestB", str(FONTS / "Onest-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Robert", str(FONTS / "CoFoRobert-RegularIt.ttf")))

INK = colors.Color(0.12, 0.08, 0.07)
MUTED = colors.Color(0.42, 0.36, 0.34)
ACCENT = colors.Color(0.48, 0.12, 0.10)
RULE = colors.Color(0.86, 0.82, 0.79)
ROW = colors.Color(0.96, 0.94, 0.92)
PAGE = colors.Color(0.99, 0.98, 0.97)

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
            ("Кактус", "Мякоть Пейота", "40%"),
            ("Лемонграсс", "Цитрусовая свежесть", "30%"),
            ("Бузина", "Ягодный Цветок", "20%"),
            ("Алоэ", "Травянистый экстракт", "10%"),
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
            ("Гоал", "Энергетик", "35%"),
            ("Лаймовый сорбет", "Лаймовая вода", "25%"),
            ("Кактус", "Мякоть Пейота", "20%"),
            ("Айс гренни", "Зелёное яблоко", "20%"),
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
            ("Мёд", "Мадху", "35%"),
            ("Кашмир гуава", "Пряная Гуава", "30%"),
            ("Груша", "Дюшес", "20%"),
            ("Кокос", "Сливочный орех", "15%"),
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
            ("Памела", "Помело", "35%"),
            ("Оранжина", "Сад Гесперид", "30%"),
            ("Ананас", "Тропический сок", "20%"),
            ("Лемонграсс", "Цитрусовая свежесть", "15%"),
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


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "brand",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=8,
            textColor=ACCENT,
            alignment=TA_CENTER,
            spaceAfter=2 * mm,
            leading=11,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=20,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=3 * mm,
            leading=24,
        ),
        "sub": ParagraphStyle(
            "sub",
            parent=base["Normal"],
            fontName="Robert",
            fontSize=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=2 * mm,
            leading=15,
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=8.5,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6 * mm,
            leading=12,
        ),
        "sec": ParagraphStyle(
            "sec",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=9,
            textColor=ACCENT,
            spaceBefore=4 * mm,
            spaceAfter=5 * mm,
            leading=12,
        ),
        "el": ParagraphStyle(
            "el",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=9,
            textColor=ACCENT,
            leading=12,
        ),
        "title": ParagraphStyle(
            "title",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=16,
            textColor=INK,
            leading=20,
            spaceAfter=2 * mm,
        ),
        "keys": ParagraphStyle(
            "keys",
            parent=base["Normal"],
            fontName="Robert",
            fontSize=10.5,
            textColor=MUTED,
            leading=15,
            spaceAfter=3.5 * mm,
        ),
        "story": ParagraphStyle(
            "story",
            parent=base["Normal"],
            fontName="Robert",
            fontSize=10.5,
            textColor=INK,
            leading=16,
            spaceAfter=5 * mm,
        ),
        "th": ParagraphStyle(
            "th",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=7.5,
            textColor=MUTED,
            leading=10,
        ),
        "th_r": ParagraphStyle(
            "th_r",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=7.5,
            textColor=MUTED,
            alignment=TA_RIGHT,
            leading=10,
        ),
        "td": ParagraphStyle(
            "td",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=10,
            textColor=INK,
            leading=14,
        ),
        "td_m": ParagraphStyle(
            "td_m",
            parent=base["Normal"],
            fontName="OnestM",
            fontSize=10,
            textColor=INK,
            leading=14,
        ),
        "td_r": ParagraphStyle(
            "td_r",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=10,
            textColor=INK,
            alignment=TA_RIGHT,
            leading=14,
        ),
        "name": ParagraphStyle(
            "name",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=12,
            textColor=INK,
            spaceBefore=3 * mm,
            spaceAfter=2 * mm,
            leading=16,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=9.5,
            textColor=INK,
            leading=14.5,
            spaceAfter=3 * mm,
        ),
        "aroma": ParagraphStyle(
            "aroma",
            parent=base["Normal"],
            fontName="OnestB",
            fontSize=11,
            textColor=INK,
            spaceBefore=3 * mm,
            spaceAfter=1.5 * mm,
            leading=14,
        ),
        "tech": ParagraphStyle(
            "tech",
            parent=base["Normal"],
            fontName="OnestM",
            fontSize=8.5,
            textColor=ACCENT,
            spaceAfter=1.5 * mm,
            leading=12,
        ),
        "foot": ParagraphStyle(
            "foot",
            parent=base["Normal"],
            fontName="Onest",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceBefore=4 * mm,
            leading=11,
        ),
    }


def rule() -> HRFlowable:
    return HRFlowable(
        width="100%",
        thickness=0.5,
        color=RULE,
        spaceBefore=3 * mm,
        spaceAfter=6 * mm,
    )


def recipe_table(recipe: list[tuple[str, str, str]], s: dict) -> Table:
    """Fixed tab stops: tech | guest | %"""
    data = [
        [
            Paragraph("ТЕХН.", s["th"]),
            Paragraph("ГОСТЮ", s["th"]),
            Paragraph("%", s["th_r"]),
        ]
    ]
    for tech, guest, pct in recipe:
        data.append(
            [
                Paragraph(tech, s["td"]),
                Paragraph(guest, s["td_m"]),
                Paragraph(pct, s["td_r"]),
            ]
        )

    # page content width ≈ 170mm with 20mm margins
    col_widths = [55 * mm, 90 * mm, 25 * mm]
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    style_cmds = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, 0), 0.4, RULE),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 2),
    ]
    for i in range(1, len(data)):
        if i % 2 == 1:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), ROW))
    t.setStyle(TableStyle(style_cmds))
    return t


def mix_block(mix: dict, s: dict) -> KeepTogether:
    head = Table(
        [
            [
                Paragraph(mix["element"], s["el"]),
                Paragraph(mix["title"], s["title"]),
            ]
        ],
        colWidths=[32 * mm, 138 * mm],
        hAlign="LEFT",
    )
    head.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return KeepTogether(
        [
            Spacer(1, 2 * mm),
            head,
            Paragraph(mix["keys"], s["keys"]),
            Paragraph(mix["story"], s["story"]),
            recipe_table(mix["recipe"], s),
            rule(),
        ]
    )


def build(path: Path) -> None:
    s = styles()
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Аура · Авторское меню · Огонь Вода Земля Воздух",
        author="HookahPlace Aura / Solovev R.K.",
    )

    story: list = []

    if LOGO.exists():
        img = Image(str(LOGO), width=18 * mm, height=15.5 * mm)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 2 * mm))

    story.append(Paragraph("HOOKAHPLACE", s["brand"]))
    story.append(Paragraph("Авторское меню", s["h1"]))
    story.append(Paragraph("Огонь · Вода · Земля · Воздух", s["sub"]))
    story.append(Paragraph("Сторитейлинг · составы · расшифровка ароматов", s["meta"]))
    story.append(rule())

    story.append(Paragraph("МИКСЫ", s["sec"]))
    for mix in MIXES:
        story.append(mix_block(mix, s))

    story.append(Paragraph("ИМЕНА МИКСОВ", s["sec"]))
    for name, why in NAMES:
        story.append(Paragraph(name, s["name"]))
        story.append(Paragraph(why, s["body"]))

    story.append(rule())
    story.append(Paragraph("АРОМАТЫ", s["sec"]))
    story.append(
        Paragraph(
            "Гостевое имя → технический аромат → откуда слово и зачем так назвали.",
            s["keys"],
        )
    )
    for guest, tech, why in AROMAS:
        story.append(Paragraph(f"«{guest}»", s["aroma"]))
        story.append(Paragraph(f"это  ·  {tech}", s["tech"]))
        story.append(Paragraph(why, s["body"]))

    story.append(
        Paragraph(
            "Сделано Соловьевым Р.К.  ·  Made by Solovev R.K.  ·  hpaura.ru",
            s["foot"],
        )
    )

    def on_page(canvas, _doc):
        canvas.saveState()
        canvas.setFillColor(PAGE)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

    # compress
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


def main() -> None:
    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
    primary = OUTS[0]
    build(primary)
    data = primary.read_bytes()
    for dest in OUTS[1:]:
        dest.write_bytes(data)
    print(f"Wrote {primary} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
