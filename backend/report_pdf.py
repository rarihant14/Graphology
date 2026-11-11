"""Render a visual-only handwriting observation report as a PDF."""

import base64
import html
import io
import os
from math import cos, pi, sin
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    Paragraph,
    PageBreak,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Line, Polygon, String

from agent.observations import CATEGORY_NAMES, HandwritingObservationReport

_PURPLE = colors.HexColor("#6d28d9")
_INK = colors.HexColor("#1f1b2e")
_MUTED = colors.HexColor("#6b7280")
_LINE = colors.HexColor("#e5e7eb")
_PAGE_WIDTH, _PAGE_HEIGHT = A4
_MARGIN = 18 * mm
_CONTENT_WIDTH = _PAGE_WIDTH - 2 * _MARGIN
_BASE = getSampleStyleSheet()
_STYLES = {
    "title": ParagraphStyle(
        "ReportTitle", parent=_BASE["Title"], fontName="Helvetica-Bold",
        fontSize=26, leading=32, textColor=_INK, alignment=0, spaceAfter=9,
    ),
    "subtitle": ParagraphStyle(
        "ReportSubtitle", parent=_BASE["BodyText"], fontSize=12,
        leading=18, textColor=_MUTED, spaceAfter=14,
    ),
    "category": ParagraphStyle(
        "CategoryTitle", parent=_BASE["Heading2"], fontName="Helvetica-Bold",
        fontSize=14, leading=18, textColor=_PURPLE, spaceBefore=16, spaceAfter=9,
    ),
    "body": ParagraphStyle(
        "ReportBody", parent=_BASE["BodyText"], fontSize=11.2,
        leading=17, textColor=_INK,
    ),
    "small": ParagraphStyle(
        "ReportSmall", parent=_BASE["BodyText"], fontSize=9.5,
        leading=13, textColor=_MUTED,
    ),
    "footer": ParagraphStyle(
        "ReportFooter", parent=_BASE["BodyText"], fontSize=8,
        leading=10, textColor=_MUTED, alignment=TA_CENTER,
    ),
    "metric": ParagraphStyle(
        "ReportMetric", parent=_BASE["BodyText"], fontName="Helvetica-Bold",
        fontSize=27, leading=30, textColor=_PURPLE, alignment=TA_CENTER,
    ),
    "metric_label": ParagraphStyle(
        "ReportMetricLabel", parent=_BASE["BodyText"], fontName="Helvetica-Bold",
        fontSize=9, leading=12, textColor=_INK, alignment=TA_CENTER,
    ),
    "cover_brand": ParagraphStyle(
        "CoverBrand", parent=_BASE["BodyText"], fontName="Helvetica-Bold",
        fontSize=12, leading=14, textColor=colors.HexColor("#9fe4f4"), alignment=TA_CENTER,
    ),
    "cover_title": ParagraphStyle(
        "CoverTitle", parent=_BASE["Title"], fontName="Helvetica-Bold",
        fontSize=22, leading=25, textColor=colors.white, alignment=TA_CENTER,
    ),
    "cover_body": ParagraphStyle(
        "CoverBody", parent=_BASE["BodyText"], fontSize=9.5,
        leading=13, textColor=colors.white, alignment=TA_CENTER,
    ),
    "cover_prepared": ParagraphStyle(
        "CoverPrepared", parent=_BASE["BodyText"], fontName="Helvetica-Bold",
        fontSize=12, leading=15, textColor=colors.white, alignment=TA_CENTER,
    ),
    "cover_name": ParagraphStyle(
        "CoverName", parent=_BASE["BodyText"], fontSize=12,
        leading=15, textColor=colors.white, alignment=TA_CENTER,
    ),
    "cover_footer": ParagraphStyle(
        "CoverFooter", parent=_BASE["BodyText"], fontSize=7,
        leading=9, textColor=colors.HexColor("#7890b5"), alignment=TA_LEFT,
    ),
    "banner_title": ParagraphStyle(
        "BannerTitle", parent=_BASE["Title"], fontName="Helvetica-Bold",
        fontSize=20, leading=25, textColor=colors.white, spaceAfter=3,
    ),
    "banner_subtitle": ParagraphStyle(
        "BannerSubtitle", parent=_BASE["BodyText"], fontSize=10.5,
        leading=14, textColor=colors.HexColor("#ede9fe"),
    ),
}


def _escape(value: str) -> str:
    return html.escape(value or "", quote=True)


def _footer(canvas, document) -> None:
    canvas.saveState()
    canvas.setStrokeColor(_LINE)
    canvas.line(_MARGIN, 13 * mm, _PAGE_WIDTH - _MARGIN, 13 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(_MUTED)
    canvas.drawString(_MARGIN, 9 * mm, "INKSIGHT · Reflective handwriting report")
    canvas.drawRightString(_PAGE_WIDTH - _MARGIN, 9 * mm, str(document.page))
    canvas.restoreState()


def _sample_image(image_b64: str | None):
    if not image_b64:
        return None
    try:
        raw = base64.b64decode(image_b64.split(",")[-1], validate=True)
        from PIL import Image as PILImage

        with PILImage.open(io.BytesIO(raw)) as source:
            width, height = source.size
        scale = min(_CONTENT_WIDTH / width, 48 * mm / height)
        return Image(io.BytesIO(raw), width=width * scale, height=height * scale)
    except (ValueError, OSError):
        return None


def _visible_cues_table(report):
    """Render a concise evidence panel immediately below the submitted image."""
    observations = [
        item for item in report.observations
        if item.assessability != "not_assessable"
    ][:6]
    rows = [[
        Paragraph("Visible cue", _STYLES["metric_label"]),
        Paragraph("Observed value", _STYLES["metric_label"]),
        Paragraph("Evidence note", _STYLES["metric_label"]),
    ]]
    for observation in observations:
        rows.append([
            Paragraph(_escape(observation.feature_name), _STYLES["small"]),
            Paragraph(_escape(observation.observed_value.replace("_", " ").title()), _STYLES["small"]),
            Paragraph(_escape(observation.evidence.description), _STYLES["small"]),
        ])
    table = Table(rows, colWidths=[_CONTENT_WIDTH * 0.28, _CONTENT_WIDTH * 0.22, _CONTENT_WIDTH * 0.50])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0f2fe")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#075985")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#bae6fd")),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#dbeafe")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


_DISCLAIMER = (
    "Graphology is a traditional interpretive practice, not scientifically validated. "
    "This report is for self-reflection and entertainment only, not diagnosis or financial, "
    "health, or relationship advice."
)


def _page_title(story, title: str, subtitle: str = ""):
    palette = ["#4c1d95", "#1d4ed8", "#0f766e", "#9a3412", "#9d174d"]
    color = palette[sum(ord(char) for char in title) % len(palette)]
    content = [Paragraph(_escape(title), _STYLES["banner_title"])]
    if subtitle:
        content.append(Paragraph(_escape(subtitle), _STYLES["banner_subtitle"]))
    banner = Table([[content]], colWidths=[_CONTENT_WIDTH])
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(color)),
        ("BOX", (0, 0), (-1, -1), 0, colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(banner)
    story.append(Spacer(1, 7))


def _dimension_table(dimension, appendix: bool = False):
    rows = [
        [Paragraph("Score", _STYLES["small"]), Paragraph(f"<b>{dimension.score}/100</b>", _STYLES["body"])],
        [Paragraph("What your profile suggests", _STYLES["small"]), Paragraph(_escape(dimension.essence), _STYLES["body"])],
        [Paragraph("Strength", _STYLES["small"]), Paragraph(_escape(dimension.strength), _STYLES["body"])],
        [Paragraph("Watch for", _STYLES["small"]), Paragraph(_escape(dimension.blind_spot), _STYLES["body"])],
        [Paragraph("Growth shift", _STYLES["small"]), Paragraph(_escape(dimension.growth_shift), _STYLES["body"])],
        [Paragraph("Core style", _STYLES["small"]), Paragraph(_escape(dimension.core_style), _STYLES["body"])],
        [Paragraph("Mindful action", _STYLES["small"]), Paragraph(_escape(dimension.mindful_action), _STYLES["body"])],
    ]
    if appendix:
        rows.extend([
            [Paragraph("Next move", _STYLES["small"]), Paragraph(_escape(dimension.next_move), _STYLES["body"])],
            [Paragraph("Reflection", _STYLES["small"]), Paragraph("Which part of this interpretation matches your lived experience, and which part does not?", _STYLES["body"])],
        ])
    table = Table(rows, colWidths=[_CONTENT_WIDTH * 0.27, _CONTENT_WIDTH * 0.73])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f0ff")),
        ("BOX", (0, 0), (-1, -1), 0.5, _LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def _dimension_context(dimension):
    """Add a fuller plain-language explanation without turning the reading into a verdict."""
    if dimension.detailed_explanation:
        return Paragraph(_escape(dimension.detailed_explanation), _STYLES["body"])
    label = _escape(dimension.label)
    evidence = ", ".join(_escape(cue) for cue in (dimension.evidence or [])[:3])
    return Paragraph(
        f"<b>Putting this into context.</b> {label} is best read as a pattern of emphasis in this sample, "
        f"not as a permanent description of your personality. The visible cues may become more noticeable "
        f"when you are working under familiar conditions, and less noticeable when your pace, purpose, tool, "
        f"or writing environment changes. This is why the interpretation uses language such as may, suggests, "
        f"and tends to. The evidence connected with this dimension includes {evidence or 'only limited visible cues'}. "
        f"A useful next step is to compare the description with two or three real situations: one where the pattern "
        f"helped you, one where it created friction, and one where it was not present at all. That comparison "
        f"makes the report more personal and more balanced than accepting a score on its own. Keep the part that "
        f"creates a practical choice, question the part that feels too broad, and remember that a lower score is "
        f"an invitation to explore a different response rather than evidence of a flaw.",
        _STYLES["body"],
    )


def _radar_chart(profile):
    """Small seven-axis profile chart for the snapshot page."""
    drawing = Drawing(220, 190)
    center_x, center_y, radius = 105, 88, 60
    values = [dimension.score for dimension in profile.dimensions[:7]]
    points = []
    for index in range(7):
        angle = pi / 2 + (2 * pi * index / 7)
        x = center_x + radius * cos(angle)
        y = center_y + radius * sin(angle)
        drawing.add(Line(center_x, center_y, x, y, strokeColor=_LINE, strokeWidth=0.5))
        points.extend([x, y])
    drawing.add(Polygon(points, strokeColor=_LINE, fillColor=None, strokeWidth=0.7))
    profile_points = []
    for index, value in enumerate(values):
        angle = pi / 2 + (2 * pi * index / 7)
        profile_points.extend([
            center_x + radius * (value / 100) * cos(angle),
            center_y + radius * (value / 100) * sin(angle),
        ])
    drawing.add(Polygon(profile_points, strokeColor=_PURPLE, fillColor=colors.HexColor("#e9d5ff"), strokeWidth=1.5))
    drawing.add(String(67, 5, "PROFILE RADAR", fontSize=7, fillColor=_MUTED))
    return drawing


def _score_bars(profile):
    """Create a compact, colorful comparison diagram for all seven dimensions."""
    drawing = Drawing(_CONTENT_WIDTH, 145)
    palette = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#db2777", "#9333ea"]
    left, bar_left, bar_width = 0, 155, _CONTENT_WIDTH - 205
    for index, dimension in enumerate(profile.dimensions[:7]):
        y = 124 - index * 18
        label = dimension.label[:22]
        drawing.add(String(left, y + 3, label, fontSize=7.5, fillColor=_INK))
        drawing.add(Line(bar_left, y + 5, bar_left + bar_width, y + 5, strokeColor=_LINE, strokeWidth=7))
        drawing.add(Line(bar_left, y + 5, bar_left + bar_width * dimension.score / 100, y + 5,
                         strokeColor=colors.HexColor(palette[index]), strokeWidth=7))
        drawing.add(String(bar_left + bar_width + 8, y + 2, str(dimension.score), fontSize=7.5, fillColor=_INK))
    drawing.add(String(bar_left, 2, "0", fontSize=7, fillColor=_MUTED))
    drawing.add(String(bar_left + bar_width - 12, 2, "100", fontSize=7, fillColor=_MUTED))
    return drawing


def _append_profile_pages(story, profile, summary, name: str):
    """Append the Inksight-style main report and personal insight appendix."""
    # Part A: main report
    story.append(PageBreak())
    _page_title(story, "Begin With Awareness", "A reflective report is most useful when it becomes a choice, not a label.")
    cards = [[
        Paragraph("<b>01 Observe</b><br/>Notice the visible pattern before assigning meaning.", _STYLES["body"]),
        Paragraph("<b>02 Reflect</b><br/>Ask what feels familiar, useful, or incomplete.", _STYLES["body"]),
    ], [
        Paragraph("<b>03 Apply</b><br/>Turn one insight into a small experiment.", _STYLES["body"]),
        Paragraph("<b>04 Choose</b><br/>Keep what helps and leave what does not fit.", _STYLES["body"]),
    ]]
    story.append(Table(cards, colWidths=[_CONTENT_WIDTH / 2] * 2, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f0ff")),
        ("BOX", (0, 0), (-1, -1), 0.5, _LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ])))
    story.append(Paragraph("A NOTE ON INTERPRETATION", _STYLES["category"]))
    story.append(Paragraph(_DISCLAIMER, _STYLES["body"]))
    story.append(Paragraph("HOW TO READ YOUR REPORT", _STYLES["category"]))
    story.append(Paragraph("Read the score beside the language and evidence. A low score is not a flaw; it is a possible area for curiosity, practice, or a different context.", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Your Handwriting", "The image is the source. The interpretation stays grounded in what is visible.")
    story.append(Paragraph("PRIMARY VISIBLE CUES", _STYLES["category"]))
    story.append(Paragraph(summary.method_confidence.method, _STYLES["body"]))
    story.append(Paragraph("The detailed visual observations are retained in the analysis payload and are used as the evidence base for the profile below.", _STYLES["body"]))
    story.append(Paragraph("A handwriting sample contains several layers at once: the form of individual letters, the rhythm between letters and words, the relationship between lines, and the way the page is used as a visual field. No single mark should carry the whole interpretation. The report combines multiple visible cues and keeps uncertain features qualified, so you can see both what the image can support and where your own lived experience remains the stronger source of truth.", _STYLES["body"]))
    story.append(Paragraph("Image quality and sample sufficiency", _STYLES["category"]))
    story.append(Paragraph("The quality labels on the cover describe how much of the uploaded sample was available for visual review. Where a cue was not clear, the profile uses cautious language rather than certainty.", _STYLES["body"]))
    story.append(Paragraph("For the most useful future comparison, write a similar passage in ordinary conditions, using the same type of pen and a comfortable pace. Comparing samples over time can reveal which observations are stable and which belonged to a particular moment. This report supports that curiosity; it does not replace context, conversation, or professional guidance.", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Profile Snapshot", "Seven dimensions, one overall quotient, and two useful anchors.")
    bars = [[Paragraph(f"<b>{_escape(d.label)}</b>", _STYLES["body"]), Paragraph(f"{d.score}/100", _STYLES["body"])] for d in profile.dimensions]
    story.append(Table(bars, colWidths=[_CONTENT_WIDTH * 0.75, _CONTENT_WIDTH * 0.25], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")), ("BOX", (0, 0), (-1, -1), 0.5, _LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"OVERALL QUOTIENT  {profile.overall_score}/100", _STYLES["metric"]))
    story.append(Paragraph(f"Strongest focus: {_escape(profile.strongest_focus)} · Growth focus: {_escape(profile.growth_focus)}", _STYLES["body"]))
    story.append(Paragraph("DIMENSION COMPARISON", _STYLES["category"]))
    story.append(_score_bars(profile))
    story.append(_radar_chart(profile))
    story.append(Paragraph("The quotient is the rounded mean of the seven dimension scores. The bars show relative emphasis in this sample; they are not grades, diagnoses, or fixed personality limits.", _STYLES["small"]))

    story.append(PageBreak())
    _page_title(story, "Personality Dashboard", profile.one_line_profile)
    story.append(Paragraph(f"<b>{_escape(profile.archetype)}</b><br/>{_escape(profile.archetype_tagline)}", _STYLES["body"]))
    story.append(Paragraph("TRAIT SIGNALS", _STYLES["category"]))
    chips = [d.label for d in profile.dimensions] + ["Persistence", "Communication", "Initiative", "Practical Thinking", "Discipline"]
    story.append(Paragraph(" · ".join(_escape(item) for item in chips[:12]), _STYLES["body"]))
    chip_rows = []
    for start in range(0, min(12, len(chips)), 4):
        row = [Paragraph(_escape(item), _STYLES["small"]) for item in chips[start:start + 4]]
        row.extend([Paragraph("", _STYLES["small"])] * (4 - len(row)))
        chip_rows.append(row)
    if chip_rows:
        story.append(Table(chip_rows, colWidths=[_CONTENT_WIDTH / 4] * 4, style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f0ff")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#ddd6fe")),
            ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#e9d5ff")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])))
    story.append(Paragraph("Your profile is a conversation starter: it may describe tendencies in this sample, not the limits of who you are.", _STYLES["body"]))
    story.append(Paragraph("Read the dashboard as a landscape rather than a leaderboard. Stronger dimensions may show where a familiar response is already available to you; the growth focus may show where a smaller, more deliberate experiment could add flexibility. People use different dimensions at different times, so the most valuable insight is often the contrast between two scores and the situation that brings that contrast out.", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Know Your X-Factor", "Three high-scoring signals that may be useful when you choose your next step.")
    for d in profile.dimensions[:3]:
        story.append(Paragraph(f"<b>{_escape(d.label)} · {d.score}/100</b>", _STYLES["category"]))
        story.append(Paragraph(f"What your profile suggests: {_escape(d.essence)}<br/>Make it useful: {_escape(d.next_move)}", _STYLES["body"]))

    # Six main dimension pages, ordered by score, with Personal Growth reserved for the appendix.
    for d in profile.dimensions:
        if d.key == "personal_growth":
            continue
        story.append(PageBreak())
        _page_title(story, d.label, f"{d.score}/100 · {_escape(d.core_style)}")
        story.append(_dimension_table(d))
        story.append(Spacer(1, 7))
        story.append(_dimension_context(d))
        story.append(Paragraph("HOW WE REACHED THIS INSIGHT", _STYLES["category"]))
        story.append(Paragraph(_escape(d.cue_note), _STYLES["small"]))
        story.append(Paragraph("A practical reading: this dimension describes a possible pattern in how you approach situations. Context, mood, writing conditions, and deliberate writing style can all influence what is visible.", _STYLES["small"]))
        story.append(Paragraph(" · ".join(_escape(cue) for cue in d.evidence[:4]) or "No single cue was strong enough to summarize.", _STYLES["small"]))

    story.append(PageBreak())
    _page_title(story, "30-Day Growth Plan", "Small experiments create better information than fixed labels.")
    for week, text_value in [
        ("Week 1 · Clarity", "Name one pattern you notice and one situation where it helps."),
        ("Week 2 · Expression", "Practice communicating one need, boundary, or idea more directly."),
        ("Week 3 · Momentum", "Choose one mindful action from your lowest-scoring dimension and repeat it three times."),
        ("Week 4 · Review", "Write what changed, what did not, and what you want to keep testing."),
    ]:
        story.append(Paragraph(f"<b>{week}</b><br/>{text_value}", _STYLES["body"]))
        story.append(Spacer(1, 7))

    story.append(PageBreak())
    _page_title(story, "Graphology Story", "A narrative summary of the profile, written as a possibility rather than a verdict.")
    story.append(Paragraph(profile.one_line_profile, _STYLES["body"]))
    story.append(Paragraph("The strongest patterns may show where your current habits create ease. The lower patterns are not weaknesses; they may simply point to places where a different practice could help.", _STYLES["body"]))
    story.append(Paragraph("The useful question is not whether every sentence is true. It is whether one sentence gives you a better choice in real life.", _STYLES["body"]))
    story.append(Paragraph("Across the report, the most reliable thread is the invitation to compare the language with your own experience. Keep the observations that create clarity, and treat the rest as prompts for further reflection.", _STYLES["body"]))
    story.append(Paragraph("A reflective reading becomes more useful when it ends in a testable choice. Notice the setting in which a pattern appears, name the result you want, and try one small change before drawing a broad conclusion. This keeps the report warm and practical: it gives you language for a possibility while leaving room for context, growth, and surprise.", _STYLES["body"]))
    story.append(Paragraph("THE TAKEAWAY", _STYLES["category"]))
    story.append(Paragraph("Use the report as a mirror with a question attached: what would you like to try next?", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Trust the Process", "See your patterns. Understand your tendencies. Choose your next move.")
    story.append(Paragraph(_DISCLAIMER, _STYLES["body"]))
    story.append(Paragraph("About Inksight", _STYLES["category"]))
    story.append(Paragraph("Inksight turns visible handwriting cues into a structured reflection experience. It is designed to support curiosity, not replace professional advice or lived experience.", _STYLES["body"]))

    # Part B: personal insight layer.
    story.append(PageBreak())
    _page_title(story, "Your Personal Insight Layer", "Score + interpretation + evidence + action")
    story.append(Paragraph(_DISCLAIMER, _STYLES["body"]))
    for d in profile.dimensions:
        story.append(PageBreak())
        _page_title(story, d.label, f"Personal insight · {d.score}/100")
        story.append(_dimension_table(d, appendix=True))
        story.append(Paragraph("WHY WE SEE IT", _STYLES["category"]))
        for index, cue in enumerate((d.evidence or ["No strong cue was available."])[:4], 1):
            story.append(Paragraph(f"<b>Evidence {index}</b> · {_escape(cue)}", _STYLES["small"]))
        story.append(Paragraph("ORIGINAL REPORT CUES", _STYLES["category"]))
        story.append(Paragraph(_escape(d.cue_note), _STYLES["small"]))
        story.append(Paragraph("The original observation record remains the source for every score and interpretation.", _STYLES["small"]))

    story.append(PageBreak())
    _page_title(story, "Top 5 Strengths", "Ranked signals to practice, not labels to perform.")
    strength_names = ["Persistence", "Communication", "Initiative", "Practical Thinking", "Discipline"]
    for index, (strength_name, d) in enumerate(zip(strength_names, profile.dimensions[:5]), 1):
        story.append(Paragraph(f"<b>{index}. {_escape(strength_name)} · {d.score}/100</b><br/>{_escape(d.strength)}<br/><font color='#6b7280'>Potential blind spot: {_escape(d.blind_spot)}<br/>Cue: {_escape((d.evidence or ['Not enough evidence'])[0])}</font>", _STYLES["body"]))
        story.append(Spacer(1, 6))

    story.append(PageBreak())
    _page_title(story, "You May Be Someone Who…", "Seven readable statements to test against your lived experience.")
    for d in profile.dimensions:
        story.append(Paragraph(f"• You may be someone who {_escape(d.essence[0].lower() + d.essence[1:] if d.essence else 'is still discovering what fits')}.", _STYLES["body"]))
    story.append(Paragraph("A USEFUL TEST", _STYLES["category"]))
    story.append(Paragraph("Keep the statement that helps you notice a choice. Set aside the statement that does not match your lived experience.", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Personalised 30-Day Plan", "Built from the three lowest-scoring dimensions, with low scores treated as invitations rather than flaws.")
    for index, d in enumerate(sorted(profile.dimensions, key=lambda item: item.score)[:4], 1):
        story.append(Paragraph(f"<b>Focus {index}: {_escape(d.label)}</b><br/>{_escape(d.next_move)}<br/><font color='#6b7280'>Why: {_escape(d.growth_shift)}</font>", _STYLES["body"]))
        story.append(Spacer(1, 6))
    story.append(Paragraph("DAY 30 REVIEW", _STYLES["category"]))
    story.append(Paragraph("What became easier? What still needs a smaller experiment? What will you carry into the next month?", _STYLES["body"]))
    story.append(Paragraph("30-DAY PRINCIPLE: consistent and small is more informative than intense and temporary.", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Share Card", "A compact version of the reflection to save or share.")
    story.append(Paragraph(f"<b>{_escape(name or 'Your Inksight Profile')}</b><br/>{_escape(profile.archetype)}<br/>{_escape(profile.one_line_profile)}", _STYLES["body"]))
    story.append(Paragraph(" · ".join(f"{_escape(d.label)} {d.score}/100" for d in profile.dimensions[:3]), _STYLES["body"]))
    story.append(Paragraph("Suggested caption: A reflective snapshot of the patterns in my handwriting, with one next step to try.", _STYLES["body"]))
    story.append(Paragraph("CTA: See your patterns. Understand your tendencies. Choose your next move.", _STYLES["body"]))

    story.append(PageBreak())
    _page_title(story, "Method + Confidence", "What was observed, how it was interpreted, and where the limits are.")
    story.append(Paragraph(summary.method_confidence.method, _STYLES["body"]))
    story.append(Paragraph(f"Confidence level: {summary.method_confidence.confidence}", _STYLES["body"]))
    for limitation in summary.method_confidence.limitations:
        story.append(Paragraph(f"• {_escape(limitation)}", _STYLES["body"]))
    story.append(Paragraph(_DISCLAIMER, _STYLES["body"]))


def _write_share_card(profile, name: str) -> None:
    """Write the requested 1080x1350 branded share card beside generated output."""
    try:
        from PIL import Image as PILImage, ImageDraw, ImageFont

        output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
        os.makedirs(output_dir, exist_ok=True)
        canvas = PILImage.new("RGB", (1080, 1350), "#0b0814")
        draw = ImageDraw.Draw(canvas)
        font = ImageFont.load_default()
        draw.rectangle((42, 42, 1038, 1308), outline="#7c3aed", width=4)
        draw.text((88, 110), "INKSIGHT", fill="#c4b5fd", font=font)
        draw.text((88, 205), name or "Your handwriting profile", fill="#f3f0ff", font=font)
        draw.text((88, 305), profile.archetype, fill="#a78bfa", font=font)
        draw.text((88, 390), profile.archetype_tagline, fill="#d1d5db", font=font)
        y = 560
        for dimension in profile.dimensions[:3]:
            draw.text((100, y), f"{dimension.label}  {dimension.score}/100", fill="#f3f0ff", font=font)
            draw.rectangle((100, y + 48, 980, y + 64), fill="#24133f")
            draw.rectangle((100, y + 48, 100 + (880 * dimension.score // 100), y + 64), fill="#8b5cf6")
            y += 150
        draw.text((88, 1120), "See your patterns. Understand your tendencies.", fill="#c4b5fd", font=font)
        draw.text((88, 1170), "Choose your next move.", fill="#c4b5fd", font=font)
        canvas.save(os.path.join(output_dir, "share_card.png"))
    except Exception:
        return


def build_report_pdf(
    report: HandwritingObservationReport,
    name: str = "",
    image_b64: str | None = None,
) -> bytes:
    """Build a paginated PDF containing the API observations and summary."""
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=_MARGIN,
        rightMargin=_MARGIN,
        topMargin=17 * mm,
        bottomMargin=19 * mm,
        title="Handwriting Observation Report",
        author="Graphology AI",
    )
    cover = Table([
        [Paragraph("INKSIGHT", _STYLES["cover_brand"])],
        [Paragraph("PDA GRAPHOLOGY<br/>ANALYSIS REPORT", _STYLES["cover_title"])],
        [Paragraph("A personalized self-discovery report based on traditional graphology", _STYLES["cover_body"])],
        [Paragraph("Prepared for", _STYLES["cover_prepared"])],
        [Paragraph(_escape(name or "Your handwriting profile"), _STYLES["cover_name"])],
        [Paragraph("Discover your patterns. Understand your strengths. Choose your next step.", _STYLES["cover_body"])],
    ], colWidths=[_CONTENT_WIDTH], rowHeights=[54, 88, 52, 39, 36, 74])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1b3157")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    image = _sample_image(image_b64)
    story = [
        Spacer(1, 27 * mm), cover, Spacer(1, 11 * mm),
        Paragraph("Inksight · Your handwriting, interpreted as a mirror for reflection.", _STYLES["cover_footer"]),
        PageBreak(),
        *([image, Spacer(1, 8)] if image else []),
        *([Paragraph("VISIBLE CUES IN THIS IMAGE", _STYLES["category"]), _visible_cues_table(report), Spacer(1, 10)] if image else []),
        Paragraph("INKSIGHT", _STYLES["category"]),
        Paragraph("Handwriting Insight Report", _STYLES["title"]),
        Paragraph("Discover your patterns. Understand your strengths. Choose your next step.", _STYLES["subtitle"]),
        Paragraph(
            f"Schema {report.schema_version} · {datetime.now().strftime('%d %B %Y')}"
            + (f" · {_escape(name)}" if name else ""),
            _STYLES["subtitle"],
        ),
        *([Paragraph(f"Prepared for {_escape(name)}", _STYLES["subtitle"])] if name else []),
        Paragraph("IMAGE ASSESSMENT", _STYLES["category"]),
    ]

    assessment_items = list(report.image_assessment.model_dump().items())
    assessment_rows = []
    for index in range(0, len(assessment_items), 2):
        row = []
        for key, value in assessment_items[index:index + 2]:
            row.extend([
                Paragraph(f"<b>{_escape(key.replace('_', ' ').title())}</b>", _STYLES["small"]),
                Paragraph(_escape(value), _STYLES["body"]),
            ])
        if len(row) == 2:
            row.extend([Paragraph("", _STYLES["small"]), Paragraph("", _STYLES["body"])])
        assessment_rows.append(row)
    assessment_table = Table(
        assessment_rows,
        colWidths=[_CONTENT_WIDTH * 0.24, _CONTENT_WIDTH * 0.26] * 2,
    )
    assessment_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
        ("BOX", (0, 0), (-1, -1), 0.5, _LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.extend([assessment_table, Spacer(1, 8)])

    summary = report.report_summary
    if summary:
        story.append(Paragraph("REPORT AT A GLANCE", _STYLES["category"]))
        assessable_count = sum(item.assessability != "not_assessable" for item in report.observations)
        confidence_rank = {"high": 3, "medium": 2, "low": 1}
        highest_strengths = sorted(
            summary.top_strengths,
            key=lambda item: confidence_rank.get(item.confidence, 0),
            reverse=True,
        )[:5]
        metric_table = Table([
            [
                Paragraph("70", _STYLES["metric"]),
                Paragraph(str(assessable_count), _STYLES["metric"]),
                Paragraph(_escape(summary.method_confidence.confidence), _STYLES["metric"]),
            ],
            [
                Paragraph("FEATURES REVIEWED", _STYLES["metric_label"]),
                Paragraph("VISUALLY ASSESSABLE", _STYLES["metric_label"]),
                Paragraph("OVERALL COVERAGE", _STYLES["metric_label"]),
            ],
        ], colWidths=[_CONTENT_WIDTH / 3] * 3)
        metric_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f0ff")),
            ("BOX", (0, 0), (-1, -1), 0.8, _PURPLE),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
            ("TOPPADDING", (0, 1), (-1, 1), 2),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
        ]))
        story.append(metric_table)
        story.append(Paragraph("TOP 5 HIGHEST-CONFIDENCE STRENGTHS", _STYLES["category"]))
        strength_rows = []
        for index, item in enumerate(highest_strengths, 1):
            strength_rows.append([
                Paragraph(f"<b>{index}</b>", _STYLES["metric_label"]),
                Paragraph(
                    f"<b>{_escape(item.title)}</b> · {_escape(item.description)}<br/>"
                    f"<font color='#6b7280'>Why we see it: {_escape(item.evidence[0])}</font>",
                    _STYLES["small"],
                ),
            ])
        if strength_rows:
            strength_table = Table(strength_rows, colWidths=[_CONTENT_WIDTH * 0.08, _CONTENT_WIDTH * 0.92])
            strength_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#faf9ff")),
                ("BOX", (0, 0), (-1, -1), 0.5, _LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(strength_table)
        story.append(Paragraph(
            "This one-page overview is a concise starting point. The following pages explain the evidence, limitations, actions, and all 70 visual observations in detail.",
            _STYLES["small"],
        ))
        """
        story.append(Paragraph("INTERPRETATION DETAILS", _STYLES["category"]))
        story.append(Paragraph("POTENTIAL BLIND SPOTS", _STYLES["category"]))
        for item in summary.potential_blind_spots:
            story.append(Paragraph(
                f"<b>{_escape(item.title)}</b> ({_escape(item.confidence)} confidence)<br/>"
                f"{_escape(item.description)}<br/>"
                f"<font color='#6b7280'><b>Why we see it:</b> {_escape(item.evidence[0])}. "
                f"{_escape(item.evidence[1])}</font>",
                _STYLES["body"],
            ))
            story.append(Spacer(1, 4))
        story.append(Paragraph("YOU MAY BE SOMEONE WHO", _STYLES["category"]))
        for statement in summary.you_may_be_someone_who:
            story.append(Paragraph(f"• {_escape(statement)}", _STYLES["body"]))
        story.append(Paragraph("METHOD + CONFIDENCE", _STYLES["category"]))
        method = summary.method_confidence
        story.append(Paragraph(
            f"<b>{_escape(method.confidence)}</b><br/>{_escape(method.method)}<br/>"
            + "<br/>".join(f"• {_escape(item)}" for item in method.limitations),
            _STYLES["body"],
        ))
        story.append(Paragraph("PERSONALISED 30-DAY PLAN", _STYLES["category"]))
        for index, item in enumerate(summary.personalized_30_day_plan, 1):
            story.append(Paragraph(
                f"<b>{index}. {_escape(item.title)} · {_escape(item.timeframe)}</b><br/>"
                f"{_escape(item.action)}<br/><font color='#6b7280'>Why: {_escape(item.reason)}</font>",
                _STYLES["body"],
            ))
            story.append(Spacer(1, 4))
        card = summary.shareable_result_card
        if card:
            story.append(Paragraph("SHAREABLE RESULT CARD", _STYLES["category"]))
            card_rows = [[
                Paragraph(f"<b>{_escape(card.headline)}</b><br/>{_escape(card.supporting_line)}", _STYLES["body"]),
                Paragraph("<b>Highlights</b><br/>" + "<br/>".join(f"• {_escape(item)}" for item in card.highlights), _STYLES["body"]),
            ], [
                Paragraph(f"<b>Next step</b><br/>{_escape(card.call_to_action)}", _STYLES["body"]),
                Paragraph("Reflective use only · Not a diagnosis or validated personality assessment.", _STYLES["small"]),
            ]]
            card_table = Table(card_rows, colWidths=[_CONTENT_WIDTH * 0.55, _CONTENT_WIDTH * 0.45])
            card_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f0ff")),
                ("BOX", (0, 0), (-1, -1), 0.7, _PURPLE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            story.append(card_table)
        """

    if report.profile_snapshot and summary:
        _append_profile_pages(story, report.profile_snapshot, summary, name)

    """
    observations_by_category = {}
    for observation in report.observations:
        if observation.category == "letter_size_and_proportion":
            continue
        observations_by_category.setdefault(observation.category, []).append(observation)

    story.append(Paragraph("DETAILED VISUAL OBSERVATIONS", _STYLES["category"]))
    story.append(Paragraph(
        "This detailed section presents the selected handwriting categories with visible evidence, assessability, and confidence for review.",
        _STYLES["small"],
    ))
    for category, category_observations in observations_by_category.items():
        story.append(Paragraph(_escape(CATEGORY_NAMES[category]), _STYLES["category"]))
        rows = [[
            Paragraph("<b>Feature and observation</b>", _STYLES["body"]),
            Paragraph("<b>Evidence and confidence</b>", _STYLES["body"]),
        ]]
        for observation in category_observations:
            supporting_letters = ", ".join(observation.evidence.supporting_letters)
            evidence_text = _escape(observation.evidence.description)
            if supporting_letters:
                evidence_text += f"<br/><font color='#6b7280'>Letters: {_escape(supporting_letters)}</font>"
            evidence_text += (
                f"<br/><font color='#6b7280'>Confidence: {_escape(observation.confidence)}"
                f" · {_escape(observation.assessability.replace('_', ' '))}</font>"
            )
            rows.append([
                Paragraph(
                    f"<b>{_escape(observation.feature_name)}</b><br/>"
                    f"{_escape(observation.observed_value)}",
                    _STYLES["body"],
                ),
                Paragraph(evidence_text, _STYLES["small"]),
            ])

        table = Table(
            rows,
            colWidths=[_CONTENT_WIDTH * 0.34, _CONTENT_WIDTH * 0.66],
            repeatRows=1,
            splitByRow=1,
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f0ff")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, _LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, _LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(KeepTogether([table]))
    """

    story.extend([
        Spacer(1, 10),
        Paragraph(
            "All entries describe visible image features only. A static image cannot "
            "establish physical writing pressure, actual writing speed, or confirmed pen lifts.",
            _STYLES["footer"],
        ),
    ])
    if report.profile_snapshot:
        _write_share_card(report.profile_snapshot, name)
    document.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
