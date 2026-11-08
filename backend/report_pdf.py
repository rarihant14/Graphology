"""Render a visual-only handwriting observation report as a PDF."""

import base64
import html
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

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
        fontSize=22, leading=27, textColor=_INK, alignment=0, spaceAfter=5,
    ),
    "subtitle": ParagraphStyle(
        "ReportSubtitle", parent=_BASE["BodyText"], fontSize=9.5,
        leading=14, textColor=_MUTED, spaceAfter=10,
    ),
    "category": ParagraphStyle(
        "CategoryTitle", parent=_BASE["Heading2"], fontName="Helvetica-Bold",
        fontSize=11, leading=14, textColor=_PURPLE, spaceBefore=12, spaceAfter=5,
    ),
    "body": ParagraphStyle(
        "ReportBody", parent=_BASE["BodyText"], fontSize=8.5,
        leading=12, textColor=_INK,
    ),
    "small": ParagraphStyle(
        "ReportSmall", parent=_BASE["BodyText"], fontSize=7.5,
        leading=10, textColor=_MUTED,
    ),
    "footer": ParagraphStyle(
        "ReportFooter", parent=_BASE["BodyText"], fontSize=8,
        leading=10, textColor=_MUTED, alignment=TA_CENTER,
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
    canvas.drawString(_MARGIN, 9 * mm, "Visual handwriting observations · Not personality analysis")
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
        scale = min(_CONTENT_WIDTH / width, 70 * mm / height)
        return Image(io.BytesIO(raw), width=width * scale, height=height * scale)
    except (ValueError, OSError):
        return None


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
    story = [
        Paragraph("Handwriting Observation Report", _STYLES["title"]),
        Paragraph(
            f"Schema {report.schema_version} · {datetime.now().strftime('%d %B %Y')}"
            + (f" · {_escape(name)}" if name else ""),
            _STYLES["subtitle"],
        ),
        Paragraph("IMAGE ASSESSMENT", _STYLES["category"]),
    ]

    assessment_rows = []
    for key, value in report.image_assessment.model_dump().items():
        assessment_rows.append([
            Paragraph(f"<b>{_escape(key.replace('_', ' ').title())}</b>", _STYLES["body"]),
            Paragraph(_escape(value), _STYLES["body"]),
        ])
    assessment_table = Table(assessment_rows, colWidths=[_CONTENT_WIDTH * 0.38, _CONTENT_WIDTH * 0.62])
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

    image = _sample_image(image_b64)
    if image:
        story.extend([image, Spacer(1, 8)])

    summary = report.report_summary
    if summary:
        story.append(Paragraph("YOUR INTERPRETATION SUMMARY", _STYLES["category"]))
        story.append(Paragraph("TOP 5 STRENGTHS", _STYLES["category"]))
        for item in summary.top_strengths:
            story.append(Paragraph(
                f"<b>{_escape(item.title)}</b> ({_escape(item.confidence)} confidence)<br/>"
                f"{_escape(item.description)}<br/><font color='#6b7280'>Based on: {_escape(item.evidence[0])}</font>",
                _STYLES["body"],
            ))
            story.append(Spacer(1, 4))
        story.append(Paragraph("POTENTIAL BLIND SPOTS", _STYLES["category"]))
        for item in summary.potential_blind_spots:
            story.append(Paragraph(
                f"<b>{_escape(item.title)}</b> ({_escape(item.confidence)} confidence)<br/>"
                f"{_escape(item.description)}<br/><font color='#6b7280'>Based on: {_escape(item.evidence[0])}</font>",
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

    observations_by_category = {}
    for observation in report.observations:
        observations_by_category.setdefault(observation.category, []).append(observation)

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

    story.extend([
        Spacer(1, 10),
        Paragraph(
            "All entries describe visible image features only. A static image cannot "
            "establish physical writing pressure, actual writing speed, or confirmed pen lifts.",
            _STYLES["footer"],
        ),
    ])
    document.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
