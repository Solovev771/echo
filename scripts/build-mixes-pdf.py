#!/usr/bin/env python3
"""Build a clean, fully-openable Special mixes PDF (Cyrillic-safe)."""

import sys
from pathlib import Path

from fpdf import FPDF

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_mixes_data import MIXES

OUT = Path(__file__).resolve().parents[1] / "docs" / "AURA_Special_miksy.pdf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_I = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

YELLOW = (245, 197, 24)
ORANGE = (232, 106, 23)
BLACK = (17, 17, 17)
MUTED = (85, 85, 85)
ROW_ALT = (255, 248, 231)


def recipe_line(recipe):
    return " / ".join(f"{name} {pct}" for name, pct in recipe)


class AuraPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, "АУРА · Special · Авторские миксы", align="L")
        self.ln(8)

    def footer(self):
        self.set_y(-12)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"{self.page_no()}", align="C")


def reset_x(pdf):
    pdf.set_x(pdf.l_margin)

def ensure_space(pdf: AuraPDF, h: float):
    if pdf.get_y() + h > pdf.h - pdf.b_margin:
        pdf.add_page()


def h1(pdf, text):
    ensure_space(pdf, 14)
    reset_x(pdf)
    pdf.set_font("DejaVu", "B", 16)
    pdf.set_text_color(*ORANGE)
    pdf.multi_cell(0, 8, text)
    pdf.ln(2)
    reset_x(pdf)


def h2(pdf, text):
    ensure_space(pdf, 12)
    reset_x(pdf)
    pdf.set_font("DejaVu", "B", 12)
    pdf.set_text_color(*BLACK)
    pdf.multi_cell(0, 7, text)
    pdf.ln(1)
    reset_x(pdf)



def body(pdf, text, *, size=10, color=BLACK, italic=False):
    ensure_space(pdf, 10)
    reset_x(pdf)
    pdf.set_font("Serif" if italic else "DejaVu", "", size)
    pdf.set_text_color(*color)
    pdf.multi_cell(0, 5.2, text)
    pdf.ln(1)
    reset_x(pdf)


def label(pdf, key, value):
    ensure_space(pdf, 8)
    reset_x(pdf)
    pdf.set_font("DejaVu", "B", 9)
    pdf.set_text_color(*MUTED)
    key_w = pdf.get_string_width(f"{key}: ") + 1
    pdf.cell(key_w, 5, f"{key}: ")
    pdf.set_font("DejaVu", "", 9)
    pdf.set_text_color(*BLACK)
    pdf.multi_cell(0, 5, value)
    pdf.ln(1)
    reset_x(pdf)


def recipe_table(pdf, recipe):
    ensure_space(pdf, 8 + 6 * (len(recipe) + 1))
    reset_x(pdf)
    col_w = [70, 25, 40]
    headers = ["Компонент", "%", "Грамм на 20 г"]
    pdf.set_font("DejaVu", "B", 9)
    pdf.set_fill_color(*YELLOW)
    pdf.set_text_color(*BLACK)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1, fill=True)
    pdf.ln()
    reset_x(pdf)
    pdf.set_font("DejaVu", "", 9)
    for ri, (name, pct) in enumerate(recipe):
        grams = round(20 * pct / 100, 1)
        fill = ri % 2 == 1
        if fill:
            pdf.set_fill_color(*ROW_ALT)
        vals = [name, str(pct), str(grams)]
        for i, v in enumerate(vals):
            pdf.cell(col_w[i], 6.5, v, border=1, fill=fill)
        pdf.ln()
        reset_x(pdf)
    pdf.ln(3)


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = AuraPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(18, 16, 18)
    pdf.add_font("DejaVu", "", FONT)
    pdf.add_font("DejaVu", "B", FONT_B)
    pdf.add_font("Serif", "", FONT_I)

    # Cover / intro
    pdf.add_page()
    pdf.ln(8)
    pdf.set_font("DejaVu", "B", 28)
    pdf.set_text_color(*BLACK)
    pdf.cell(0, 14, "АУРА", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "B", 13)
    pdf.set_text_color(*ORANGE)
    pdf.cell(0, 8, "SPECIAL · Авторские миксы", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(
        0,
        7,
        "Рабочий каталог для кальянной станции и зала",
        align="C",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(6)
    body(
        pdf,
        "Документ собран из черновых итераций: сторитейлинг приведён к языку заведения "
        "(чаша и поле), на каждую тему выбран рекомендуемый микс для Special-меню. "
        "Остальные итерации — для тестов и подстройки под гостя.",
        size=10,
        color=MUTED,
    )

    h1(pdf, "Как пользоваться")
    body(
        pdf,
        "1. В меню гостю — название, короткий сторитейлинг и рекомендуемая итерация (метка «МЕНЮ»).\n"
        "2. На станции — таблица % и граммовка на 20 г закладки; пропорции можно масштабировать.\n"
        "3. Итерации 2–3 — запасные характеры той же темы: мягче / жёстче / глубже.\n"
        "4. Зона зала подсказывает, куда логично вести гостя с этим миксом.\n"
        "5. Сторитейлинг — сухой, «гадальный» тон без слащавости.",
    )

    h1(pdf, "Связь с концепцией заведения")
    body(
        pdf,
        "Аура — переход от повседневности к внутреннему состоянию. Special-миксы — не просто вкусы, "
        "а главы путешествия по зонам: нейтральный вход, зелёная мистика, сине-фиолетовый космос, "
        "сектор солнечного света. Каждый микс держит одну эмоцию.",
    )

    h1(pdf, "Карта Special-меню")
    # Compact map without huge table wrapping issues
    for mix in MIXES:
        menu_it = next(x for x in mix["iterations"] if x["n"] == mix["menu"])
        ensure_space(pdf, 16)
        reset_x(pdf)
        pdf.set_font("DejaVu", "B", 10)
        pdf.set_text_color(*ORANGE)
        pdf.multi_cell(0, 5, mix["name"])
        reset_x(pdf)
        pdf.set_font("DejaVu", "", 9)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(0, 4.5, f"{mix['zone']} | {mix['character']}")
        reset_x(pdf)
        pdf.set_text_color(*BLACK)
        pdf.multi_cell(0, 4.5, f"МЕНЮ итер. {mix['menu']}: {recipe_line(menu_it['recipe'])}")
        pdf.ln(2)
        reset_x(pdf)

    # Detail cards
    for mix in MIXES:
        pdf.add_page()
        h1(pdf, mix["name"])
        label(pdf, "Зона", mix["zone"])
        label(pdf, "Характер", mix["character"])
        label(pdf, "Вкус", mix["profile"])
        label(pdf, "Когда предлагать", mix["when"])

        h2(pdf, "Сторитейлинг для гостя")
        body(pdf, mix["story_guest"], italic=True, size=10)

        menu_it = next(x for x in mix["iterations"] if x["n"] == mix["menu"])
        h2(pdf, f"Рекомендуемый микс · Итерация {menu_it['n']}")
        body(pdf, menu_it["note"], size=9, color=MUTED)
        body(pdf, recipe_line(menu_it["recipe"]), size=10)
        recipe_table(pdf, menu_it["recipe"])
        body(pdf, menu_it["story"], italic=True, size=9, color=MUTED)

        h2(pdf, "Все итерации (для работы и тестов)")
        for it in mix["iterations"]:
            mark = "  ·  МЕНЮ" if it["n"] == mix["menu"] else ""
            ensure_space(pdf, 22)
            pdf.set_font("DejaVu", "B", 10)
            pdf.set_text_color(*(ORANGE if it["n"] == mix["menu"] else BLACK))
            pdf.cell(0, 6, f"Итерация {it['n']}{mark}", new_x="LMARGIN", new_y="NEXT")
            body(pdf, recipe_line(it["recipe"]), size=9)
            body(pdf, it["note"], size=8, color=MUTED)
            body(pdf, it["story"], italic=True, size=8, color=MUTED)

    # Rules — no blank page
    ensure_space(pdf, 40)
    if pdf.get_y() > pdf.h - 70:
        pdf.add_page()
    h1(pdf, "Правила станции")
    body(
        pdf,
        "• Граммовка в таблицах — на 20 г. При другой закладке сохраняйте проценты.\n"
        "• Не объявляйте гостю проценты без запроса — сначала имя, характер, история.\n"
        "• Если гость просит «мягче/жёстче» — берите соседнюю итерацию той же темы.\n"
        "• Special — отдельная вкладка меню: жёлтый / чёрный / оранжевый акцент.\n"
        "• Тон подачи: сдержанный, уверенный, без «милый» и лишней эзотерической пены.",
    )
    body(pdf, "Аура · Special · Рабочая версия каталога", size=8, color=MUTED)

    pdf.output(OUT)
    print(f"Wrote {OUT} pages={pdf.page_no()}")


if __name__ == "__main__":
    build()
