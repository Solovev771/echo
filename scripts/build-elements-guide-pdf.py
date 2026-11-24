#!/usr/bin/env python3
"""PDF guide from the guest Author's Menu photo + station tech card."""

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
ACCENT = (0.55, 0.14, 0.12)  # deep red like the menu
LINE = (0.82, 0.78, 0.76)

pdfmetrics.registerFont(TTFont("DejaVu", FONT))
pdfmetrics.registerFont(TTFont("DejaVuB", FONT_B))
pdfmetrics.registerFont(TTFont("Serif", FONT_I))

MIXES = [
    {
        "element": "ОГОНЬ",
        "title": "PHOENIX",
        "keys": "Возрождение · Пробуждение · Искра",
        "guest_line": (
            "Мякоть пейота, цитрусовая свежесть, ягодный цветок и травянистый экстракт"
        ),
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
        "guest_line": (
            "Энергетик, лаймовая вода, мякоть пейота и зелёное яблоко"
        ),
        "story": (
            "Не кофе. Просто ток: Энергия, Лаймовая вода, "
            "Мякоть Пейота, Зеленое Яблоко. Сел — и поехал. Без истерики."
        ),
        "recipe": [
            ("Гоал", "Энергетик / Энергия", 35),
            ("Лаймовый сорбет", "Лаймовая вода", 25),
            ("Кактус", "Мякоть Пейота", 20),
            ("Айс гренни", "Зелёное яблоко", 20),
        ],
    },
    {
        "element": "ЗЕМЛЯ",
        "title": "GAIA",
        "keys": "Изобилие · Жизнь · Тепло",
        "guest_line": "Мадху, пряная гуава, дюшес и сливочный орех",
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
        "guest_line": (
            "Помело, сад Гесперид, тропический сок и цитрусовая свежесть"
        ),
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
        "Энергетик / Энергия",
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

    text("aura  HOOKAHPLACE", "DejaVuB", 11, ACCENT, 14)
    text("Авторское меню", "DejaVuB", 18, BLACK, 22)
    text(
        "Огонь · Вода · Земля · Воздух — сторитейлинг, составы станции и расшифровка имён.",
        "DejaVu",
        9.5,
        MUTED,
        13,
    )
    y -= 2
    rule()

    text("1. Миксы как в меню", "DejaVuB", 13, ACCENT, 17)
    y -= 2

    for mix in MIXES:
        need(62)
        text(f"{mix['element']}  —  {mix['title']}", "DejaVuB", 12, BLACK, 16)
        text(mix["keys"], "Serif", 10, MUTED, 13)
        y -= 1
        text("Сторитейлинг", "DejaVuB", 9, MUTED, 12)
        text(mix["story"], "Serif", 10, BLACK, 13.5)
        y -= 1
        for tech, guest, pct in mix["recipe"]:
            text(f"• {tech} — {guest} — {pct}%", "DejaVu", 10, BLACK, 13)
        y -= 3
        rule()

    text("2. Имена миксов", "DejaVuB", 13, ACCENT, 17)
    y -= 2
    for name, why in NAMES:
        need(22)
        text(f"«{name}»", "DejaVuB", 11, BLACK, 14)
        text(why, "DejaVu", 9.5, BLACK, 13)
        y -= 3

    rule()
    text("3. Что стоит за красивыми словами ароматов", "DejaVuB", 13, ACCENT, 17)
    text(
        "Гостевое имя → технический аромат → откуда слово и зачем так назвали.",
        "DejaVu",
        9,
        MUTED,
        12,
    )
    y -= 3

    for guest, tech, why in AROMAS:
        need(30)
        text(f"«{guest}»", "DejaVuB", 11, BLACK, 14)
        text(f"это: {tech}", "DejaVu", 9, MUTED, 12)
        text(why, "DejaVu", 9.5, BLACK, 13)
        y -= 3

    rule()
    text(
        "Сделано Соловьевым Р.К. / Made by Solovev R.K. · HookahPlace Aura · hpaura.ru",
        "DejaVu",
        8,
        MUTED,
        11,
    )

    c.save()
    data = path.read_bytes()
    for dest in OUTS[1:]:
        dest.write_bytes(data)
    print(f"Wrote {path} ({len(data)} bytes)")


if __name__ == "__main__":
    draw()
