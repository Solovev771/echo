#!/usr/bin/env python3
"""One-pager PDF: Огонь / Вода / Земля / Воздух — story, recipe, aroma keys."""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUTS = [
    ROOT / "docs" / "AURA_Elementy_miksy.pdf",
    ROOT / "public" / "files" / "AURA_Elementy_miksy.pdf",
    Path("/opt/cursor/artifacts") / "AURA_Elementy_miksy.pdf",
]

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_I = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

BLACK = (0.07, 0.07, 0.07)
MUTED = (0.35, 0.35, 0.35)
ACCENT = (0.91, 0.416, 0.09)
LINE = (0.85, 0.85, 0.85)

pdfmetrics.registerFont(TTFont("DejaVu", FONT))
pdfmetrics.registerFont(TTFont("DejaVuB", FONT_B))
pdfmetrics.registerFont(TTFont("Serif", FONT_I))

MIXES = [
    {
        "name": "Огонь",
        "was": "Аура",
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
        "name": "Вода",
        "was": "Энергетический поток",
        "story": (
            "Не кофе. Просто ток: Энергия, Лаймовая вода, "
            "Мякоть Пейота, Зеленое Яблоко. Сел — и поехал. Без истерики."
        ),
        "recipe": [
            ("Гоал", "Энергия", 35),
            ("Лаймовый сорбет", "Лаймовая вода", 25),
            ("Кактус", "Мякоть Пейота", 20),
            ("Айс гренни", "Зеленое Яблоко", 20),
        ],
    },
    {
        "name": "Земля",
        "was": "Уединение",
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
        "name": "Воздух",
        "was": "Пространство",
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
        "Энергия",
        "Гоал",
        "Техн. «гоал» — тёмная ягода / черника с ударом. Имя взяли от эффекта микса, не от этикетки.",
    ),
    (
        "Лаймовая вода",
        "Лаймовый сорбет",
        "«Сорбет» звучит как десерт. Вкус ближе к холодному кислому лайму — легче сказать «вода».",
    ),
    (
        "Зеленое Яблоко",
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
    c.setTitle("Аура · Огонь Вода Земля Воздух")
    c.setAuthor("HookahPlace Aura")
    W, H = A4
    left, right = 18 * mm, W - 18 * mm
    width = right - left
    y = H - 18 * mm

    def new_page():
        nonlocal y
        c.showPage()
        y = H - 18 * mm

    def need(h: float):
        nonlocal y
        if y - h < 16 * mm:
            new_page()

    def text(txt, font, size, rgb=BLACK, leading=None):
        nonlocal y
        lead = leading or size * 1.35
        for line in wrap(c, txt, font, size, width):
            need(lead + 1)
            c.setFillColorRGB(*rgb)
            c.setFont(font, size)
            c.drawString(left, y, line)
            y -= lead

    def rule():
        nonlocal y
        need(8)
        c.setStrokeColorRGB(*LINE)
        c.setLineWidth(0.6)
        c.line(left, y, right, y)
        y -= 8

    # Cover / intro
    text("АУРА", "DejaVuB", 22, ACCENT, 26)
    text("Огонь · Вода · Земля · Воздух", "DejaVuB", 14, BLACK, 18)
    text(
        "Сторитейлинг, составы для станции и расшифровка гостевых имён ароматов.",
        "DejaVu",
        10,
        MUTED,
        14,
    )
    y -= 4
    rule()

    # Mixes
    text("1. Миксы", "DejaVuB", 13, ACCENT, 18)
    y -= 2

    for mix in MIXES:
        need(55)
        text(f"{mix['name']}  ·  было: {mix['was']}", "DejaVuB", 12, BLACK, 16)
        text("Сторитейлинг", "DejaVuB", 9, MUTED, 12)
        text(mix["story"], "Serif", 10, BLACK, 14)
        y -= 2
        text("Состав (техн. — гостю — % · на 20 г)", "DejaVuB", 9, MUTED, 12)
        for tech, guest, pct in mix["recipe"]:
            g = round(20 * pct / 100, 1)
            text(f"• {tech} — {guest} — {pct}%  ({g} г)", "DejaVu", 10, BLACK, 13)
        y -= 4
        rule()

    # Aromas
    text("2. Что стоит за красивыми словами", "DejaVuB", 13, ACCENT, 18)
    text(
        "Гостевое имя → технический аромат → откуда слово и зачем так назвали.",
        "DejaVu",
        9,
        MUTED,
        12,
    )
    y -= 3

    for guest, tech, why in AROMAS:
        need(32)
        text(f"«{guest}»", "DejaVuB", 11, BLACK, 14)
        text(f"это: {tech}", "DejaVu", 9, MUTED, 12)
        text(why, "DejaVu", 9.5, BLACK, 13)
        y -= 4

    y -= 2
    rule()
    text("HookahPlace Aura · hpaura.ru · рабочая версия", "DejaVu", 8, MUTED, 11)

    c.save()
    data = path.read_bytes()
    for dest in OUTS[1:]:
        dest.write_bytes(data)
    print(f"Wrote {path} ({len(data)} bytes)")
    for dest in OUTS[1:]:
        print(f"Copied {dest}")


if __name__ == "__main__":
    draw()
