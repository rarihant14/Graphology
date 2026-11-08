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
    PageBreak,
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
    "metric": ParagraphStyle(
        "ReportMetric", parent=_BASE["BodyText"], fontName="Helvetica-Bold",
        fontSize=24, leading=26, textColor=_PURPLE, alignment=TA_CENTER,
    ),
    "metric_label": ParagraphStyle(
        "ReportMetricLabel", parent=_BASE["BodyText"], fontName="Helvetica-Bold",
        fontSize=8, leading=10, textColor=_INK, alignment=TA_CENTER,
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
        scale = min(_CONTENT_WIDTH / width, 48 * mm / height)
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

    image = _sample_image(image_b64)
    if image:
        story.extend([image, Spacer(1, 8)])

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
        story.append(PageBreak())
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

    observations_by_category = {}
    for observation in report.observations:
        observations_by_category.setdefault(observation.category, []).append(observation)

    story.append(Paragraph("DETAILED VISUAL OBSERVATIONS", _STYLES["category"]))
    story.append(Paragraph(
        "This detailed section preserves every feature, its visible evidence, assessability, and confidence for review.",
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
