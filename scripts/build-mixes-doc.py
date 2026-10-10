#!/usr/bin/env python3
"""Generate presentable AURA Special mixes work document."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.shared import Cm, Pt, RGBColor


OUT = Path(__file__).resolve().parents[1] / "docs" / "AURA_Special_miksy.docx"

# Brand palette
YELLOW = RGBColor(0xF5, 0xC5, 0x18)
ORANGE = RGBColor(0xE8, 0x6A, 0x17)
BLACK = RGBColor(0x11, 0x11, 0x11)
MUTED = RGBColor(0x55, 0x55, 0x55)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)


from build_mixes_data import AROMA_MAP, MIXES, guest_name, guest_line


def set_run_font(run, name="Georgia", size=11, bold=False, color=BLACK, italic=False):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def shade_cell(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    # Replace existing shading — duplicate w:shd breaks Microsoft Word
    for child in list(tcPr):
        if child.tag == qn("w:shd"):
            tcPr.remove(child)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    tcPr.append(shd)


def set_cell_borders(cell, color="111111", size="8"):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        b = OxmlElement(f"w:{edge}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), size)
        b.set(qn("w:color"), color)
        tcBorders.append(b)
    tcPr.append(tcBorders)


def add_heading_styled(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    if level == 0:
        set_run_font(run, size=28, bold=True, color=BLACK)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif level == 1:
        set_run_font(run, size=18, bold=True, color=ORANGE)
    else:
        set_run_font(run, size=13, bold=True, color=BLACK)
    return p


def add_body(doc, text, *, italic=False, color=BLACK, size=11, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(text)
    set_run_font(run, size=size, italic=italic, color=color)
    return p


def add_label_value(doc, label, value):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    r1 = p.add_run(f"{label}: ")
    set_run_font(r1, size=10, bold=True, color=MUTED)
    r2 = p.add_run(value)
    set_run_font(r2, size=10, color=BLACK)


def recipe_line(recipe):
    return " / ".join(f"{name} {pct}" for name, pct in recipe)


def add_recipe_table(doc, recipe):
    table = doc.add_table(rows=1 + len(recipe), cols=4)
    table.style = "Table Grid"
    headers = ("Техн. имя", "Для гостя", "%", "Г / 20 г")
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(h)
        set_run_font(run, size=9, bold=True, color=BLACK)
        shade_cell(cell, "F5C518")
        set_cell_borders(cell, "111111", "6")
    for ri, (name, pct) in enumerate(recipe, start=1):
        grams = round(20 * pct / 100, 1)
        values = (name, guest_name(name), str(pct), str(grams))
        for ci, val in enumerate(values):
            cell = table.rows[ri].cells[ci]
            cell.text = ""
            p = cell.paragraphs[0]
            run = p.add_run(val)
            set_run_font(run, size=10, color=BLACK)
            if ri % 2 == 0:
                shade_cell(cell, "FFF8E7")
            set_cell_borders(cell, "111111", "4")
    doc.add_paragraph()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()

    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)

    # Cover
    add_heading_styled(doc, "АУРА", level=0)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("SPECIAL · Авторские миксы")
    set_run_font(r, size=14, bold=True, color=ORANGE)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Рабочий каталог для кальянной станции и зала")
    set_run_font(r, size=11, color=MUTED)

    add_body(
        doc,
        "HookahPlace Aura · hpaura.ru. В меню гостю — поэтические имена ароматов. "
        "В техничке — исходные названия табака + % и граммовка. "
        "Сторитейлинг собран из концепции заведения и тона сайта: замедлиться и насладиться моментом.",
        size=10,
        color=MUTED,
    )

    add_heading_styled(doc, "Как пользоваться", level=1)
    add_body(
        doc,
        "1. Гостю — имя микса, сторитейлинг и гостевые ноты без процентов.\n"
        "2. На станции — техническое имя, % и граммовка на 20 г.\n"
        "3. Итерации 2–3 — запасные характеры той же темы.\n"
        "4. Зона зала подсказывает, куда вести гостя с этим миксом.\n"
        "5. Тон: сдержанный, в голосе Ауры — без слащавости.",
    )

    add_heading_styled(doc, "Словарь ароматов", level=1)
    glossary = doc.add_table(rows=1 + len(AROMA_MAP), cols=2)
    for i, h in enumerate(("Техн. имя (станция)", "Для гостя (меню)")):
        cell = glossary.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        set_run_font(run, size=9, bold=True, color=BLACK)
        shade_cell(cell, "F5C518")
        set_cell_borders(cell)
    for ri, (tech, guest) in enumerate(sorted(AROMA_MAP.items()), start=1):
        for ci, val in enumerate((tech, guest)):
            cell = glossary.rows[ri].cells[ci]
            cell.text = ""
            run = cell.paragraphs[0].add_run(val)
            set_run_font(run, size=9, color=BLACK)
            if ri % 2 == 0:
                shade_cell(cell, "FFF8E7")
            set_cell_borders(cell, size="4")
    doc.add_paragraph()

    add_heading_styled(doc, "Связь с концепцией заведения", level=1)
    add_body(
        doc,
        "«Здесь каждая деталь помогает замедлиться и насладиться моментом.» "
        "Аура — переход от повседневности к внутреннему состоянию. "
        "Special-миксы — главы путешествия по зонам: нейтральный вход, зелёная мистика, "
        "сине-фиолетовый космос, сектор солнечного света. Один микс — одна эмоция.",
    )

    # Summary table
    add_heading_styled(doc, "Карта Special-меню", level=1)
    summary = doc.add_table(rows=1 + len(MIXES), cols=5)
    for i, h in enumerate(("Микс", "Зона", "Характер", "Итер. меню", "Состав меню")):
        cell = summary.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h)
        set_run_font(run, size=9, bold=True, color=BLACK)
        shade_cell(cell, "F5C518")
        set_cell_borders(cell)

    for ri, mix in enumerate(MIXES, start=1):
        menu_it = next(x for x in mix["iterations"] if x["n"] == mix["menu"])
        vals = (
            mix["name"],
            mix["zone"],
            mix["character"],
            f"№{mix['menu']}",
            recipe_line(menu_it["recipe"]),
        )
        for ci, val in enumerate(vals):
            cell = summary.rows[ri].cells[ci]
            cell.text = ""
            run = cell.paragraphs[0].add_run(val)
            set_run_font(run, size=8, color=BLACK)
            if ri % 2 == 0:
                shade_cell(cell, "FFF8E7")
            set_cell_borders(cell, size="4")

    doc.add_paragraph()

    # Detailed cards
    for mix in MIXES:
        doc.add_page_break()
        add_heading_styled(doc, mix["name"], level=1)
        add_label_value(doc, "Зона", mix["zone"])
        add_label_value(doc, "Характер", mix["character"])
        add_label_value(doc, "Вкус", mix["profile"])
        add_label_value(doc, "Когда предлагать", mix["when"])

        add_heading_styled(doc, "Сторитейлинг для гостя", level=2)
        add_body(doc, mix["story_guest"], italic=True)

        menu_it = next(x for x in mix["iterations"] if x["n"] == mix["menu"])
        add_heading_styled(doc, f"Рекомендуемый микс · Итерация {menu_it['n']}", level=2)
        add_body(doc, menu_it["note"], size=10, color=MUTED)
        add_body(doc, f"Гостю: {guest_line(menu_it['recipe'])}", size=10)
        add_body(doc, f"Станция: {recipe_line(menu_it['recipe'])}", size=10)
        add_recipe_table(doc, menu_it["recipe"])
        add_body(doc, menu_it["story"], italic=True, size=10)

        add_heading_styled(doc, "Все итерации (для работы и тестов)", level=2)
        for it in mix["iterations"]:
            mark = "  ·  МЕНЮ" if it["n"] == mix["menu"] else ""
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(f"Итерация {it['n']}{mark}")
            set_run_font(run, size=11, bold=True, color=ORANGE if it["n"] == mix["menu"] else BLACK)
            add_body(doc, recipe_line(it["recipe"]), size=10, space_after=2)
            add_body(doc, it["note"], size=9, color=MUTED, space_after=2)
            add_body(doc, it["story"], italic=True, size=9, color=MUTED)

    # Closing (no forced blank page)
    add_heading_styled(doc, "Правила станции", level=1)
    add_body(
        doc,
        "• Граммовка в таблицах — на 20 г. При другой закладке сохраняйте проценты.\n"
        "• Не объявляйте гостю проценты без запроса — сначала имя, характер, история.\n"
        "• Если гость просит «мягче/жёстче» — берите соседнюю итерацию той же темы.\n"
        "• Special — отдельная вкладка меню: жёлтый / чёрный / оранжевый акцент.\n"
        "• Тон подачи: сдержанный, уверенный, без «милый» и лишней эзотерической пены.",
    )
    add_body(
        doc,
        "Аура · Special · Рабочая версия каталога",
        size=9,
        color=MUTED,
    )

    doc.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
