#!/usr/bin/env python3
"""Clean presentable AURA concept document."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

OUT = Path(__file__).resolve().parents[1] / "docs" / "AURA_Kontseptsiya.docx"

BLACK = RGBColor(0x11, 0x11, 0x11)
ORANGE = RGBColor(0xE8, 0x6A, 0x17)
MUTED = RGBColor(0x55, 0x55, 0x55)


def font(run, size=11, bold=False, italic=False, color=BLACK):
    run.font.name = "Georgia"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Georgia")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def h(doc, text, size=18, color=ORANGE, center=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    font(r, size=size, bold=True, color=color)
    return p


def body(doc, text, *, italic=False, size=11, color=BLACK):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run(text)
    font(r, size=size, italic=italic, color=color)
    return p


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)

    h(doc, "АУРА", size=28, color=BLACK, center=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Концепция заведения — Искусство Внутреннего Мира")
    font(r, size=12, bold=True, color=ORANGE)

    body(
        doc,
        "Место, где каждая искра света и каждый штрих в дизайне — проявление внутренней энергии, "
        "а каждая зона — отдельная глава большого духовного повествования. "
        "«Аура» — не просто заведение, а храм гармонии, красоты и связи человека с Вселенной.",
    )

    h(doc, "Идея и глубина")
    body(
        doc,
        "Это переход от повседневности к внутреннему просветлению — между восприятием и ощущением. "
        "Каждая деталь вибрирует от энергетического потока, интерьер ведёт к глубинам своей сути. "
        "Гости не просто отдыхают: они путешествуют по картинам своей энергии и раскрывают скрытые грани личности.",
    )

    h(doc, "Переход и внутреннее путешествие")
    body(
        doc,
        "Вход сопровождается подсветкой — путь к внутреннему порталу, символический ритуал перехода "
        "в особую вселенную. Внутри атмосфера наполняется цветами, отражающими пульсацию энергетического поля: "
        "ощущение живого биополя, динамичной энергии.",
    )

    h(doc, "Эксклюзивные зоны и их символика")

    zones = [
        (
            "Нейтральный сектор",
            "Вход — чистое пространство перед восхищением. Спокойствие и медитативное настроение, "
            "подготовка к внутренним открытиям.",
        ),
        (
            "Зелёный сектор",
            "Оазис загадки. Разломы в гладких поверхностях создают мистику. Здесь энергия связывает "
            "человека и его ауру — единство бытия через тонкую гипсовую композицию на грани искусства и эзотерики.",
        ),
        (
            "Сине-фиолетовый сектор",
            "Пространство безграничных возможностей. Разлом в стене — окно в космос. "
            "Бесконечная свобода, где мысли, чувства и мечты сливаются в единую энергию непознанных горизонтов.",
        ),
        (
            "Сектор солнечного света",
            "Луч солнца, пронзающий тьму: тепло и свет, наполняющий внутреннюю энергию. "
            "Аура гостя активируется яркими оттенками, пробуждая чувства и усиливая жизненную силу.",
        ),
    ]
    for title, text in zones:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(title)
        font(r, size=12, bold=True, color=BLACK)
        body(doc, text, size=10, color=MUTED)

    h(doc, "Визуальная и энергетическая эстетика")
    body(
        doc,
        "Каждый элемент — часть энергетической мозаики. Разломы и цветовые переходы задают визуальный ритм, "
        "который дополняет внутренний опыт гостя.",
    )
    body(
        doc,
        "«AURA» — портал во внутреннюю истину, красоту и гармонию. Здесь каждый чувствует себя частью "
        "бесконечной вселенной, где энергия и созидание идут рука об руку. Пространство для тех, кто ищет "
        "вдохновение, хочет подключиться к своей энергии и выйти за границы обыденного — в состояние "
        "божественной гармонии и роскоши.",
        italic=True,
    )

    body(doc, "Аура · Концепция заведения · Рабочая версия", size=9, color=MUTED)
    doc.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
