"""
report_pdf.py — builds a detailed, multi-page PDF from a GraphologyReport.

Everything in the PDF is derived from the already-computed report (scores,
evidence, traits, story) plus the deterministic rule engine, so the document
never contains claims the on-screen report doesn't support.
"""

import io
import base64
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable, Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)

from agent.rule_engine import apply_rules
from models import GraphologyReport

PURPLE = colors.HexColor("#6d28d9")
PURPLE_LIGHT = colors.HexColor("#ede9fe")
INK = colors.HexColor("#1f1b2e")
MUTED = colors.HexColor("#6b7280")
LINE = colors.HexColor("#e5e7eb")
GREEN = colors.HexColor("#16a34a")
AMBER = colors.HexColor("#d97706")
RED = colors.HexColor("#dc2626")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# Feature display grouping for the detailed breakdown table.
FEATURE_GROUPS: list[tuple[str, list[str]]] = [
    ("Size, Slant and Baseline", ["letter_size", "slant", "baseline", "capital_size"]),
    ("Pressure and Stroke", ["pressure", "stroke_quality", "writing_speed", "ending_strokes"]),
    ("Spacing and Layout", ["letter_spacing", "word_spacing", "line_spacing", "margin_usage"]),
    ("Form and Flow", ["connectivity", "letter_form", "regularity", "legibility"]),
    ("Zones, Loops and Signature Marks", ["loop_style", "zone_emphasis", "t_bar_position", "t_bar_length", "i_dot"]),
]

CORE_STYLE: dict[str, dict[str, str]] = {
    "emotional_balance": {"high": "Caring + Steady", "medium": "Adaptive + Responsive", "low": "Intense + Honest"},
    "thinking_learning": {"high": "Thoughtful + Analytical", "medium": "Flexible + Practical", "low": "Intuitive + Quick"},
    "health_vitality": {"high": "Energetic + Active", "medium": "Paced + Situational", "low": "Reserved + Conserving"},
    "goals_achievement": {"high": "Persistent + Planned", "medium": "Steady + Adaptive", "low": "Open + Exploring"},
    "relationships": {"high": "Warm + Engaged", "medium": "Measured + Selective", "low": "Independent + Reserved"},
    "money_mindset": {"high": "Grounded + Practical", "medium": "Cautious + Security-minded", "low": "Careful + Hesitant"},
    "personal_growth": {"high": "Reflective + Structured", "medium": "Aware + Searching", "low": "Deep + Searching"},
}


def _band(score: int) -> str:
    return "high" if score >= 70 else "medium" if score >= 40 else "low"


def _band_label(score: int) -> str:
    return {"high": "Strong", "medium": "Developing", "low": "Growth focus"}[_band(score)]


def _score_color(score: int):
    return GREEN if score >= 70 else AMBER if score >= 40 else RED


def _esc(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------

_base = getSampleStyleSheet()
S = {
    "h1": ParagraphStyle("h1", parent=_base["Title"], fontName="Times-Bold", fontSize=26,
                         textColor=INK, alignment=0, spaceAfter=4, leading=30),
    "sub": ParagraphStyle("sub", parent=_base["BodyText"], fontName="Helvetica", fontSize=10.5,
                          textColor=MUTED, leading=15, spaceAfter=10),
    "h2": ParagraphStyle("h2", parent=_base["Heading2"], fontName="Helvetica-Bold", fontSize=9,
                         textColor=PURPLE, spaceBefore=10, spaceAfter=3, leading=12),
    "body": ParagraphStyle("body", parent=_base["BodyText"], fontName="Helvetica", fontSize=10.5,
                           textColor=INK, leading=16, spaceAfter=6),
    "small": ParagraphStyle("small", parent=_base["BodyText"], fontName="Helvetica", fontSize=8.5,
                            textColor=MUTED, leading=12),
    "cell": ParagraphStyle("cell", parent=_base["BodyText"], fontName="Helvetica", fontSize=8.5,
                           textColor=INK, leading=11.5),
    "cellb": ParagraphStyle("cellb", parent=_base["BodyText"], fontName="Helvetica-Bold", fontSize=8.5,
                            textColor=INK, leading=11.5),
    "quote": ParagraphStyle("quote", parent=_base["BodyText"], fontName="Times-Italic", fontSize=12.5,
                            textColor=PURPLE, leading=19, alignment=TA_CENTER),
    "chip": ParagraphStyle("chip", parent=_base["BodyText"], fontName="Helvetica-Bold", fontSize=9,
                           textColor=PURPLE, alignment=TA_CENTER, leading=12),
}


class ScoreBar(Flowable):
    """Horizontal 0-100 bar with rounded ends and a right-aligned value."""

    def __init__(self, score: int, width: float, height: float = 7):
        super().__init__()
        self.score, self.width, self.height = score, width, height

    def wrap(self, *_):
        return self.width, self.height + 2

    def draw(self):
        c = self.canv
        c.setFillColor(LINE)
        c.roundRect(0, 1, self.width, self.height, self.height / 2, stroke=0, fill=1)
        c.setFillColor(_score_color(self.score))
        c.roundRect(0, 1, max(self.width * self.score / 100, self.height), self.height,
                    self.height / 2, stroke=0, fill=1)


def _section_title(text: str, subtitle: str = ""):
    items = [Paragraph(_esc(text), S["h1"])]
    if subtitle:
        items.append(Paragraph(_esc(subtitle), S["sub"]))
    items.append(Spacer(1, 4))
    return items


def _labeled(label: str, text: str):
    return [Paragraph(_esc(label.upper()), S["h2"]), Paragraph(_esc(text), S["body"])]


def _panel(flowables, bg=PURPLE_LIGHT, pad=10):
    t = Table([[flowables]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), pad + 2), ("RIGHTPADDING", (0, 0), (-1, -1), pad + 2),
        ("TOPPADDING", (0, 0), (-1, -1), pad), ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
    ]))
    return t


# ---------------------------------------------------------------------------
# Page furniture
# ---------------------------------------------------------------------------

def _cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#1e1038"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(PURPLE)
    canvas.rect(0, PAGE_H * 0.36, PAGE_W, 3, stroke=0, fill=1)
    canvas.restoreState()


def _later_pages(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, PAGE_H - 12 * mm, "Inksight  |  Graphology Analysis")
    canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, f"Page {doc.page}")
    canvas.drawString(MARGIN, 10 * mm, "For self-reflection and entertainment only.")
    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN, PAGE_H - 14 * mm, PAGE_W - MARGIN, PAGE_H - 14 * mm)
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------

def _cover(report: GraphologyReport, name: str, date: str):
    white = lambda size, bold=False, color="#ffffff", lead=None: ParagraphStyle(
        "c", fontName="Helvetica-Bold" if bold else "Helvetica", fontSize=size,
        textColor=colors.HexColor(color), leading=lead or size + 6)
    return [
        Spacer(1, 70 * mm),
        Paragraph("INKSIGHT", white(13, True, "#c4b5fd")),
        Spacer(1, 6),
        Paragraph("Graphology Analysis Report", ParagraphStyle(
            "ct", fontName="Times-Bold", fontSize=38, textColor=colors.white, leading=44)),
        Spacer(1, 10),
        Paragraph("A personalised self-discovery report based on traditional graphology.",
                  white(13, False, "#ddd6fe", 19)),
        Spacer(1, 62 * mm),
        Paragraph("Prepared for", white(10, False, "#a78bfa")),
        Paragraph(_esc(name or "You"), white(22, True)),
        Spacer(1, 4),
        Paragraph(date, white(10, False, "#a78bfa")),
        Spacer(1, 12),
        Paragraph(f"Archetype: {_esc(report.archetype)}" if report.archetype else "",
                  white(11, True, "#e9d5ff")),
        PageBreak(),
    ]


def _awareness():
    steps = [
        ("01  Observe", "Your handwriting contains visible patterns in size, spacing, slant, "
                        "pressure, rhythm and letter formation."),
        ("02  Reflect", "Graphology uses these patterns to suggest tendencies, not fixed truths "
                        "or diagnoses."),
        ("03  Apply", "The most useful part is what you can do with the insight: strengths to "
                      "use and patterns to watch."),
        ("04  Choose", "Keep what resonates with your lived experience. Treat the report as a "
                       "conversation starter with yourself."),
    ]
    cells = [[Paragraph(f"<b>{a}</b><br/>{_esc(b)}", S["cell"])] for a, b in steps]
    grid = Table([[cells[0][0], cells[1][0]], [cells[2][0], cells[3][0]]],
                 colWidths=[CONTENT_W / 2] * 2)
    grid.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return [
        *_section_title("Begin With Awareness",
                        "This report turns handwriting observations into an easy-to-read self-reflection."),
        grid, Spacer(1, 12),
        _panel([Paragraph("A NOTE ON INTERPRETATION", S["h2"]), Paragraph(
            "Graphology is a traditional interpretive practice, not a scientifically validated "
            "measure of personality, health, financial behaviour, relationships or future outcomes. "
            "Use this report for reflection and entertainment only.", S["body"])]),
        Spacer(1, 8),
        _panel([Paragraph("HOW TO READ YOUR REPORT", S["h2"]), Paragraph(
            "Look at the combination of score + interpretation + evidence + practical action. "
            "A lower score is not a flaw, and a higher score is not automatically a strength in "
            "every situation. Scores come from the handwriting cues that were clearly visible; "
            "cues that could not be judged are left out rather than guessed.", S["body"])],
               bg=colors.HexColor("#f9fafb")),
        PageBreak(),
    ]


def _handwriting_page(report: GraphologyReport, image_b64: str | None):
    f = report.features
    observed = [
        (k.replace("_", " "), getattr(f, k)) for k in f.model_fields
        if (getattr(f, k) or "unknown").lower() != "unknown"
    ]
    items = _section_title(
        "Your Handwriting",
        "The report is based on the patterns visible in your submitted writing sample.")
    if image_b64:
        try:
            raw = base64.b64decode(image_b64.split(",")[-1])
            from PIL import Image as PILImage
            with PILImage.open(io.BytesIO(raw)) as im:
                w, h = im.size
            max_w, max_h = CONTENT_W, 110 * mm
            ratio = min(max_w / w, max_h / h)
            items += [Image(io.BytesIO(raw), width=w * ratio, height=h * ratio), Spacer(1, 10)]
        except Exception:
            pass
    cue_text = ", ".join(f"{k}: {v}" for k, v in observed) or "No cues could be clearly observed."
    items += [
        Paragraph("PRIMARY VISIBLE CUES", S["h2"]),
        Paragraph(_esc(cue_text), S["body"]),
        Paragraph(_esc(report.confidence_note or ""), S["small"]),
        PageBreak(),
    ]
    return items


def _snapshot(report: GraphologyReport):
    dims = report.dimensions
    rows = []
    for d in dims:
        rows.append([
            Paragraph(f"<b>{_esc(d.label)}</b>", S["cell"]),
            ScoreBar(d.score, CONTENT_W * 0.5),
            Paragraph(f"<b>{d.score}</b>  <font color='#6b7280'>{_band_label(d.score)}</font>", S["cell"]),
        ])
    t = Table(rows, colWidths=[CONTENT_W * 0.30, CONTENT_W * 0.52, CONTENT_W * 0.18])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
    ]))
    items = _section_title("Your Profile Snapshot", "Your seven-dimension profile at a glance.")
    items.append(t)
    items.append(Spacer(1, 14))
    items.append(_panel([
        Paragraph("OVERALL LIFE ALIGNMENT QUOTIENT", S["h2"]),
        Paragraph(f"<font size=30 color='#6d28d9'><b>{report.overall_score}</b></font>"
                  f"<font size=12 color='#6b7280'> / 100</font>", S["body"]),
    ]))
    if dims:
        best = max(dims, key=lambda d: d.score)
        low = min(dims, key=lambda d: d.score)
        items += [Spacer(1, 8), Paragraph(
            f"<b>Strongest area:</b> {_esc(best.label)} ({best.score}) &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>Growth focus:</b> {_esc(low.label)} ({low.score})", S["body"])]
    items.append(PageBreak())
    return items


def _dashboard(report: GraphologyReport):
    items = _section_title("Your Personality Dashboard",
                           "A more human way to read your profile, beyond the numbers.")
    items.append(_panel([
        Paragraph("YOUR ARCHETYPE", S["h2"]),
        Paragraph(f"<font name='Times-Bold' size=22>{_esc(report.archetype)}</font>", S["body"]),
        Paragraph(f"<i>{_esc(report.archetype_tagline)}</i>", S["body"]),
    ]))
    items.append(Spacer(1, 10))
    if report.personality_traits:
        items += [Paragraph("WHAT YOUR HANDWRITING POINTS TOWARD", S["h2"]),
                  Paragraph(_esc(report.personality_traits), S["body"])]
    if report.traits:
        items += [Spacer(1, 6), Paragraph("KEY TRAITS", S["h2"])]
        chips = [Paragraph(_esc(t.label), S["chip"]) for t in report.traits]
        per_row = 3
        rows = [chips[i:i + per_row] + [""] * (per_row - len(chips[i:i + per_row]))
                for i in range(0, len(chips), per_row)]
        ct = Table(rows, colWidths=[CONTENT_W / per_row] * per_row)
        ct.setStyle(TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("BACKGROUND", (0, 0), (-1, -1), PURPLE_LIGHT),
            ("INNERGRID", (0, 0), (-1, -1), 4, colors.white),
            ("BOX", (0, 0), (-1, -1), 4, colors.white),
        ]))
        items += [ct, Spacer(1, 8)]
        for t in report.traits:
            if t.why:
                items.append(Paragraph(f"<b>{_esc(t.label)}</b> - seen in {_esc(t.why)}", S["small"]))
        items.append(Spacer(1, 10))
        labels = [t.label.lower() for t in report.traits[:3]]
        items.append(_panel([Paragraph(
            "Your profile in one line: " + " + ".join(labels) + ".", S["quote"])]))
    items.append(PageBreak())
    return items


def _xfactor(report: GraphologyReport):
    top = sorted(report.dimensions, key=lambda d: d.score, reverse=True)[:3]
    items = _section_title("Know Your X-Factor",
                           "Your strongest dimensions and what they can look like in everyday life.")
    for d in top:
        items.append(KeepTogether([
            Paragraph(f"<b>{_esc(d.label)}</b> &nbsp; <font color='#6d28d9'>{d.score}</font>", S["body"]),
            ScoreBar(d.score, CONTENT_W),
            Spacer(1, 4),
            Paragraph("WHAT YOUR PROFILE SUGGESTS", S["h2"]), Paragraph(_esc(d.essence), S["body"]),
            Paragraph("MAKE IT USEFUL", S["h2"]), Paragraph(_esc(d.strength), S["body"]),
            Spacer(1, 10),
        ]))
    items.append(PageBreak())
    return items


def _dimension_pages(report: GraphologyReport):
    items = []
    for d in report.dimensions:
        band = _band(d.score)
        head = [
            *_section_title(f"Your {d.label}", f"{d.score} / 100  -  {_band_label(d.score)}"),
            ScoreBar(d.score, CONTENT_W, 9), Spacer(1, 8),
        ]
        body = [
            *_labeled("Your essence", d.essence),
            *_labeled("Your strength", d.strength),
            *_labeled("Watch for", d.blind_spot),
            *_labeled("Mindful action", d.next_move),
            Paragraph("CORE STYLE", S["h2"]),
            Paragraph(f"<b>{CORE_STYLE.get(d.key, {}).get(band, '')}</b>", S["body"]),
        ]
        ev_rows = [[Paragraph(_esc(e), S["cell"])] for e in d.evidence]
        ev = Table(ev_rows, colWidths=[CONTENT_W])
        ev.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE), ("BOX", (0, 0), (-1, -1), 0.5, LINE),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ]))
        note = ("Confidence: high - two or more clearly visible cues supported this score."
                if d.confidence == "high" else
                "Confidence: low - fewer than two cues were clearly visible for this dimension, "
                "so read this score as a light indication.")
        items += head + body + [
            Paragraph("HOW WE REACHED THIS INSIGHT", S["h2"]), ev,
            Spacer(1, 6), Paragraph(note, S["small"]), PageBreak(),
        ]
    return items


def _feature_breakdown(report: GraphologyReport):
    interp = apply_rules(report.features)
    items = _section_title(
        "Handwriting Feature Breakdown",
        "Every cue examined in your sample, what was observed, and what it may suggest.")
    for group, keys in FEATURE_GROUPS:
        rows = [[Paragraph("Feature", S["cellb"]), Paragraph("Observed", S["cellb"]),
                 Paragraph("What it may suggest", S["cellb"])]]
        for k in keys:
            val = (getattr(report.features, k, "unknown") or "unknown")
            if val.lower() == "unknown":
                rows.append([Paragraph(k.replace("_", " ").title(), S["cell"]),
                             Paragraph("Not observed", S["small"]),
                             Paragraph("Not clearly visible in this sample, so it was not scored.", S["small"])])
            else:
                rows.append([Paragraph(k.replace("_", " ").title(), S["cellb"]),
                             Paragraph(_esc(val), S["cell"]),
                             Paragraph(_esc(interp.get(k, "")), S["cell"])])
        t = Table(rows, colWidths=[CONTENT_W * 0.22, CONTENT_W * 0.18, CONTENT_W * 0.60], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PURPLE_LIGHT),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE), ("BOX", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        items.append(KeepTogether([Paragraph(group.upper(), S["h2"]), t, Spacer(1, 8)]))
    items.append(PageBreak())
    return items


def _growth_plan(report: GraphologyReport):
    dims = sorted(report.dimensions, key=lambda d: d.score)
    lowest = dims[:3]
    steps = ["WEEK 1  -  CLARITY", "WEEK 2  -  EXPRESSION", "WEEK 3  -  MOMENTUM", "WEEK 4  -  REVIEW"]
    texts = []
    if lowest:
        texts.append(f"Focus on {lowest[0].label}. {lowest[0].next_move}")
    if len(lowest) > 1:
        texts.append(f"Turn to {lowest[1].label}. {lowest[1].next_move}")
    if len(lowest) > 2:
        texts.append(f"Build {lowest[2].label} into a routine. {lowest[2].next_move}")
    texts.append("Ask: what worked, what drained me, and what should I continue, stop or change? "
                 "Keep the habits that helped and drop the rest.")
    items = _section_title("Your 30-Day Growth Plan", "Turn the report into a small experiment, not a label.")
    for label, text in zip(steps, texts):
        items.append(KeepTogether([_panel([Paragraph(label, S["h2"]), Paragraph(_esc(text), S["body"])],
                                          bg=colors.HexColor("#f9fafb")), Spacer(1, 6)]))
    if lowest:
        d = lowest[0]
        items += [Spacer(1, 6), Paragraph(f"GROWTH LOOP FOR {d.label.upper()}", S["h2"])]
        loop = Table([[Paragraph(f"<b>{a}</b><br/>{b}", S["cell"]) for a, b in (
            ("1 Reflect", "What matters most right now?"), ("2 Choose", "What is one action within my control?"),
            ("3 Repeat", "What can I practise weekly?"), ("4 Review", "What changed after 30 days?"))]],
            colWidths=[CONTENT_W / 4] * 4)
        loop.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.5, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                                  ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                                  ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        items.append(loop)
    items += [Spacer(1, 12), _panel([Paragraph(
        "The goal is not to fix yourself. It is to test which insights genuinely help you live and work better.",
        S["quote"])]), PageBreak()]
    return items


def _story_and_close(report: GraphologyReport):
    items = _section_title("Your Graphology Story", "A narrative summary that is easier to remember than a page of scores.")
    for para in (report.story or report.personality_traits or "").split("\n\n"):
        if para.strip():
            items.append(Paragraph(_esc(para.strip()), S["body"]))
    items += [Spacer(1, 10), _panel([
        Paragraph("THE TAKEAWAY", S["h2"]),
        Paragraph("You do not need to become a different person. The most useful shift may be to turn "
                  "your existing strengths into clearer decisions, stronger boundaries and consistent action.",
                  S["body"])]),
        Spacer(1, 14),
        Paragraph("DISCLAIMER", S["h2"]),
        Paragraph(_esc(report.disclaimer), S["small"]),
        Spacer(1, 6),
        Paragraph("This report is not financial, medical, legal or psychological advice.", S["small"]),
    ]
    return items


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_report_pdf(report: GraphologyReport, name: str = "", image_b64: str | None = None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=22 * mm, bottomMargin=18 * mm,
        title="Inksight Graphology Report", author="Inksight",
    )
    date = datetime.now().strftime("%d %B %Y")
    story = [
        *_cover(report, name, date),
        *_awareness(),
        *_handwriting_page(report, image_b64),
        *_snapshot(report),
        *_dashboard(report),
        *_xfactor(report),
        *_dimension_pages(report),
        *_feature_breakdown(report),
        *_growth_plan(report),
        *_story_and_close(report),
    ]
    doc.build(story, onFirstPage=_cover_page, onLaterPages=_later_pages)
    return buf.getvalue()
