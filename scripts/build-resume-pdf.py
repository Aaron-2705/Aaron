#!/usr/bin/env python
"""Render data/resume.json to public/resume/dhwanit-sukhadiya-resume.pdf.

data/resume.json is the single source: the same file feeds the on-page dossier
viewer through data/resume.ts, so the page and the download cannot disagree.
Edit the JSON and re-run this; never hand-edit the PDF.

    pip install reportlab
    python scripts/build-resume-pdf.py

Design notes. A resume has two readers, a person and an applicant-tracking
parser, so this stays a single column of real selectable text with no tables,
no columns and no images. The site's steel accent appears only as hairline
rules and the name, which survives being printed in greyscale.
"""

import json
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
)

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "resume.json"
OUTPUT = ROOT / "public" / "resume" / "dhwanit-sukhadiya-resume.pdf"

# Matches the site's steel theme: electric blue accent on near-black ink.
ACCENT = HexColor("#3f74ff")
INK = HexColor("#14171f")
MUTED = HexColor("#4a5160")
HAIRLINE = HexColor("#c9cfda")

MARGIN = 0.62 * inch

# Standard WinAnsi bullet. Avoids any glyph the built-in Helvetica lacks, which
# would render as a black box and break text extraction for an ATS parser.
BULLET = "•"


class Rule(Flowable):
    """A full-width hairline. Thinner than anything reportlab draws by default."""

    def __init__(self, color=HAIRLINE, thickness=0.5, space_before=0):
        super().__init__()
        self.color = color
        self.thickness = thickness
        self.space_before = space_before
        self.width = 0
        self.height = thickness + space_before

    def wrap(self, avail_width, _avail_height):
        self.width = avail_width
        return avail_width, self.height

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


styles = {
    "name": ParagraphStyle(
        "name",
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=24,
        textColor=INK,
        spaceAfter=3,
    ),
    "title": ParagraphStyle(
        "title",
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=ACCENT,
        spaceAfter=5,
    ),
    "contact": ParagraphStyle(
        "contact",
        fontName="Helvetica",
        fontSize=8.6,
        leading=12,
        textColor=MUTED,
    ),
    "section": ParagraphStyle(
        "section",
        fontName="Helvetica-Bold",
        fontSize=8.4,
        leading=11,
        textColor=ACCENT,
        spaceBefore=11,
        spaceAfter=3,
    ),
    "entry": ParagraphStyle(
        "entry",
        fontName="Helvetica-Bold",
        fontSize=9.8,
        leading=12.5,
        textColor=INK,
        spaceBefore=4,
    ),
    "meta": ParagraphStyle(
        "meta",
        fontName="Helvetica-Oblique",
        fontSize=8.4,
        leading=11,
        textColor=MUTED,
        spaceAfter=2,
    ),
    "body": ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=9,
        leading=12.6,
        textColor=INK,
        alignment=TA_JUSTIFY,
    ),
    "bullet": ParagraphStyle(
        "bullet",
        fontName="Helvetica",
        fontSize=9,
        leading=12.4,
        textColor=INK,
        leftIndent=10,
        bulletIndent=1,
        spaceAfter=1.2,
    ),
    "skill": ParagraphStyle(
        "skill",
        fontName="Helvetica",
        fontSize=9,
        leading=12.4,
        textColor=INK,
        leftIndent=0,
        spaceAfter=1.6,
    ),
}


def esc(text: str) -> str:
    """Escape data before it meets reportlab's inline markup parser.

    Everything from resume.json goes through this. Without it a bare ampersand
    in a value is treated as the start of an entity and "H&B Infotech" is
    rendered as "H&B; Infotech" - caught by extracting the text back out of the
    generated PDF rather than by looking at it.
    """
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def tracked(text: str, spacing: str = "&nbsp;") -> str:
    """Letter-spacing for section headers. reportlab has no tracking property."""
    return spacing.join(text)


def section(title: str):
    return [Paragraph(tracked(title.upper()), styles["section"]), Rule()]


def build() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    story = []

    # -- masthead ----------------------------------------------------------
    story.append(Paragraph(esc(data["name"]), styles["name"]))
    story.append(Paragraph(esc(data["title"]), styles["title"]))
    c = data["contact"]
    story.append(
        Paragraph(
            # Only the channels present in the JSON. `phone` is optional and
            # currently omitted, so a fixed list would print an empty cell and a
            # dangling separator.
            "&nbsp;&nbsp;|&nbsp;&nbsp;".join(
                esc(c[k]) for k in ("phone", "email", "location", "linkedin") if c.get(k)
            ),
            styles["contact"],
        )
    )
    story.append(Spacer(1, 7))
    story.append(Rule(color=ACCENT, thickness=1.1))

    # -- summary -----------------------------------------------------------
    story += section("Summary")
    story.append(Spacer(1, 3))
    story.append(Paragraph(esc(data["summary"]), styles["body"]))

    # -- experience --------------------------------------------------------
    story += section("Experience")
    for job in data["experience"]:
        block = [
            Paragraph(esc(f"{job['role']}, {job['org']}"), styles["entry"]),
            Paragraph(esc(job["period"]), styles["meta"]),
        ]
        block += [Paragraph(esc(b), styles["bullet"], bulletText=BULLET) for b in job["bullets"]]
        story.append(KeepTogether(block))

    # -- projects ----------------------------------------------------------
    story += section("Home-lab projects")
    for project in data["projects"]:
        block = [Paragraph(esc(project["name"]), styles["entry"])]
        block += [
            Paragraph(esc(b), styles["bullet"], bulletText=BULLET) for b in project["bullets"]
        ]
        story.append(KeepTogether(block))

    # -- skills ------------------------------------------------------------
    story += section("Technical skills")
    story.append(Spacer(1, 3))
    for group in data["skills"]:
        story.append(
            Paragraph(
                f"<b>{esc(group['label'])}:</b>&nbsp; {esc(group['items'])}",
                styles["skill"],
            )
        )

    # -- education ---------------------------------------------------------
    story += section("Education")
    for school in data["education"]:
        story.append(
            KeepTogether(
                [
                    Paragraph(esc(school["institution"]), styles["entry"]),
                    Paragraph(
                        f"{esc(school['credential'])}&nbsp;&nbsp;|&nbsp;&nbsp;"
                        f"{esc(school['detail'])}&nbsp;&nbsp;|&nbsp;&nbsp;"
                        f"{esc(school['location'])}&nbsp;&nbsp;|&nbsp;&nbsp;{esc(school['period'])}",
                        styles["meta"],
                    ),
                ]
            )
        )

    # -- certifications ----------------------------------------------------
    story += section("Certifications")
    story.append(Spacer(1, 3))
    for cert in data["certifications"]:
        story.append(Paragraph(esc(cert), styles["bullet"], bulletText=BULLET))

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"{data['name'].title()} - Resume",
        author=data["name"].title(),
        subject=data["title"],
        creator="AARON portfolio - scripts/build-resume-pdf.py",
    )
    frame = Frame(
        MARGIN,
        MARGIN,
        LETTER[0] - 2 * MARGIN,
        LETTER[1] - 2 * MARGIN,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="resume", frames=[frame])])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story)
    print(f"wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    build()
