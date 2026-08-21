"""
agent.py — Direct sequential pipeline (no agent loop) for speed and reliability.
"""

import base64
import logging

from config import GEMINI_API_KEY, TEXT_MODEL
from models import GraphologyReport, HandwritingFeatures
from .tools import (
    _extract_handwriting_features,
    _apply_graphology_rules,
    _generate_personality_report,
)
import json

logger = logging.getLogger(__name__)

_FALLBACK_TRAITS = (
    "The personality analysis could not be fully extracted. Please try again."
)
_FALLBACK_DISCLAIMER = (
    "Graphology is not a scientifically validated method of personality assessment. "
    "This report is intended for reflective and entertainment purposes only and should "
    "not be used for clinical, professional, or legal decision-making."
)


async def run_graphology_pipeline(image_bytes: bytes) -> GraphologyReport:
    """Run the 3-step graphology pipeline directly without an agent loop."""

    # Step 1: Encode image to base64
    logger.info("Pipeline started — encoding image to base64.")
    image_base64: str = base64.b64encode(image_bytes).decode("utf-8")

    # Step 2: Extract handwriting features via Gemini vision
    logger.info("Step 1 — Extracting handwriting features.")
    try:
        features_json: str = _extract_handwriting_features(image_base64)
        logger.info("Features extracted: %s", features_json[:200])
    except Exception as exc:
        raise RuntimeError(f"Feature extraction failed: {exc}") from exc

    # Step 3: Apply deterministic rules engine
    logger.info("Step 2 — Applying graphology rules.")
    try:
        interpretations_json: str = _apply_graphology_rules(features_json)
        logger.info("Rules applied: %s", interpretations_json[:200])
    except Exception as exc:
        raise RuntimeError(f"Rules engine failed: {exc}") from exc

    # Step 4: Generate personality report via Gemini text
    logger.info("Step 3 — Generating personality report.")
    try:
        report_json: str = _generate_personality_report(interpretations_json)
        logger.info("Report generated: %s", report_json[:200])
    except Exception as exc:
        raise RuntimeError(f"Narrative generation failed: {exc}") from exc

    # Step 5: Parse final report JSON
    logger.info("Assembling GraphologyReport.")
    try:
        report_data = json.loads(report_json)
        personality_traits = report_data.get("personality_traits", _FALLBACK_TRAITS)
        disclaimer = report_data.get("disclaimer", _FALLBACK_DISCLAIMER)
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("Could not parse report JSON: %s — using fallback.", exc)
        personality_traits = _FALLBACK_TRAITS
        disclaimer = _FALLBACK_DISCLAIMER

    report = GraphologyReport(
        features=HandwritingFeatures(),
        personality_traits=personality_traits,
        disclaimer=disclaimer,
    )

    logger.info("Pipeline complete.")
    return report