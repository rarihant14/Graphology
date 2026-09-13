"""
tools.py — Agno tool definitions for the graphology analysis pipeline.

Each tool has two versions:
  - _raw function (underscore prefix) — callable directly by the pipeline
  - @tool decorated version — registered with the Agno agent

This separation allows the pipeline in agent.py to call tools directly
without going through the Agno Function wrapper.
"""

import json
import re
import base64
import logging
from agno.tools import tool

from config import get_vision_model, get_text_model
from models import HandwritingFeatures, GraphologyReport
from .rule_engine import apply_rules

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool 1 — Vision: extract observable handwriting features
# ---------------------------------------------------------------------------

def _extract_handwriting_features(image_base64: str) -> str:
    """
    Raw function — called directly by the pipeline in agent.py.

    Send a base64-encoded handwriting image to the Gemini vision model and
    extract a structured set of observable features.
    """
    prompt = (
        "Analyze this handwriting image. Extract only observable, objective features. "
        "Return only a raw JSON object with these exact keys, and for each key choose "
        "ONLY one of the exact allowed values listed in parentheses (do not invent other "
        "wording — these values are matched literally downstream): "
        "letter_size(small/medium/large), "
        "slant(left/right/upright/mixed), "
        "baseline(straight/ascending/descending/wavy), "
        "pressure(light/medium/heavy), "
        "letter_spacing(narrow/normal/wide), "
        "word_spacing(narrow/normal/wide), "
        "connectivity(connected/disconnected/mixed), "
        "margin_usage(wide left/narrow left/wide right/narrow right/balanced), "
        "loop_style(large upper loops/small upper loops/large lower loops/small lower loops/loopless), "
        "legibility(very legible/moderately legible/illegible). "
        "Return only JSON, no markdown, no explanation."
    )

    try:
        image_bytes = base64.b64decode(image_base64)

        from google.genai import types as genai_types
        vision_model = get_vision_model()
        image_part = genai_types.Part.from_bytes(
            data=image_bytes,
            mime_type="image/jpeg",
        )
        response = vision_model.generate_content([image_part, prompt])

        raw_text = response.text.strip()

        # Strip accidental markdown code fences
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        feature_dict = json.loads(raw_text)
        features = HandwritingFeatures(**feature_dict)

    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse Gemini vision response as JSON: %s", exc)
        features = HandwritingFeatures()

    except Exception as exc:
        logger.error("Unexpected error in extract_handwriting_features: %s", exc)
        features = HandwritingFeatures()

    return features.model_dump_json()


@tool(
    name="extract_handwriting_features",
    description="Analyzes a handwriting image and extracts observable features as structured data",
)
def extract_handwriting_features(image_base64: str) -> str:
    """Agno tool wrapper — delegates to _extract_handwriting_features."""
    return _extract_handwriting_features(image_base64)


# ---------------------------------------------------------------------------
# Tool 2 — Rules engine: map features to interpretations
# ---------------------------------------------------------------------------

def _apply_graphology_rules(features_json: str) -> str:
    """
    Raw function — called directly by the pipeline in agent.py.

    Deserialise a HandwritingFeatures JSON string and pass it through the
    deterministic rules engine to produce per-feature personality interpretations.
    """
    try:
        feature_dict = json.loads(features_json)
        features = HandwritingFeatures(**feature_dict)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Failed to deserialise features_json: %s — using defaults.", exc)
        features = HandwritingFeatures()

    interpretations = apply_rules(features)
    return json.dumps(interpretations, ensure_ascii=False)


@tool(
    name="apply_graphology_rules",
    description="Applies deterministic graphology rules to extracted handwriting features",
)
def apply_graphology_rules(features_json: str) -> str:
    """Agno tool wrapper — delegates to _apply_graphology_rules."""
    return _apply_graphology_rules(features_json)


# ---------------------------------------------------------------------------
# Tool 3 — Text model: synthesise a personality report
# ---------------------------------------------------------------------------

def _generate_personality_report(interpretations_json: str) -> str:
    """
    Raw function — called directly by the pipeline in agent.py.

    Deserialise a per-feature interpretations dict and ask the Gemini text
    model to synthesise it into a warm, hedged personality traits report.
    """
    try:
        interpretations: dict = json.loads(interpretations_json)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse interpretations_json: %s", exc)
        interpretations = {}

    prompt = (
        "You are a graphology analysis assistant. Based on these handwriting interpretations:\n"
        f"{json.dumps(interpretations, indent=2)}\n\n"
        "Write a personality traits analysis. Rules:\n"
        "- Use hedged language throughout: may suggest, could indicate, is often associated with\n"
        "- Never state traits as absolute facts\n"
        "- Be warm, reflective, and insightful in tone\n"
        "- Structure output with exactly these tags:\n"
        "  [PERSONALITY_TRAITS] your analysis here [/PERSONALITY_TRAITS]\n"
        "  [DISCLAIMER] your disclaimer here [/DISCLAIMER]\n"
        "- Disclaimer must state graphology is not scientifically validated and "
        "this report is for reflective and entertainment purposes only."
    )

    personality_traits = (
        "Unable to generate personality analysis at this time. "
        "Please review the extracted features and interpretations directly."
    )
    disclaimer = (
        "Graphology is not a scientifically validated method of personality assessment. "
        "This report is intended for reflective and entertainment purposes only and should "
        "not be used for clinical, professional, or legal decision-making."
    )

    try:
        text_model = get_text_model()
        response = text_model.generate_content(prompt)
        raw_output = response.text.strip()

        traits_match = re.search(
            r"\[PERSONALITY_TRAITS\](.*?)\[/PERSONALITY_TRAITS\]",
            raw_output,
            flags=re.DOTALL | re.IGNORECASE,
        )
        if traits_match:
            personality_traits = traits_match.group(1).strip()

        disclaimer_match = re.search(
            r"\[DISCLAIMER\](.*?)\[/DISCLAIMER\]",
            raw_output,
            flags=re.DOTALL | re.IGNORECASE,
        )
        if disclaimer_match:
            disclaimer = disclaimer_match.group(1).strip()

    except Exception as exc:
        logger.error("Unexpected error in generate_personality_report: %s", exc)

    result = {
        "personality_traits": personality_traits,
        "disclaimer": disclaimer,
    }
    return json.dumps(result, ensure_ascii=False)


@tool(
    name="generate_personality_report",
    description="Generates a personality traits report from graphology interpretations",
)
def generate_personality_report(interpretations_json: str) -> str:
    """Agno tool wrapper — delegates to _generate_personality_report."""
    return _generate_personality_report(interpretations_json)


# ---------------------------------------------------------------------------
# Tool 4 — Text model: narrate the computed dimension scores into one story
# ---------------------------------------------------------------------------

def _generate_report_story(
    dimension_results: list[dict],
    archetype: dict,
    overall_score: int,
) -> str:
    """
    Raw function — called directly by the pipeline in agent.py.

    Ask the Gemini text model for one short paragraph that ties the already
    computed (deterministic) dimension scores together into a narrative.
    The prompt explicitly forbids introducing any new facts — this call only
    narrates numbers/evidence that were already computed, it never decides
    them, so a failure or a low-quality response can never distort a score.
    """
    summary_lines = "\n".join(
        f"- {r['label']}: {r['score']}/100 — {r['essence']}" for r in dimension_results
    )

    prompt = (
        "You are a graphology report writer. Using ONLY the facts listed below, write one "
        "short warm paragraph (4-6 sentences) that ties these scores together into a "
        "narrative summary. Do not invent any new facts, traits, or handwriting details "
        "beyond what is listed here. Use hedged language throughout (may, could, tends to).\n\n"
        f"Archetype: {archetype['name']} — {archetype['tagline']}\n"
        f"Overall Life Alignment Quotient: {overall_score}/100\n"
        f"Dimension scores:\n{summary_lines}\n"
    )

    fallback_story = (
        f"Your profile points to a {archetype['name'].lower()} pattern — "
        f"{archetype['tagline'].lower()} With an overall alignment score of "
        f"{overall_score}/100, your handwriting suggests a mix of strengths and growth "
        "areas across the seven dimensions above."
    )

    try:
        text_model = get_text_model()
        response = text_model.generate_content(prompt)
        story = response.text.strip()
        return story or fallback_story
    except Exception as exc:
        logger.error("Unexpected error in generate_report_story: %s", exc)
        return fallback_story


@tool(
    name="generate_report_story",
    description="Narrates the computed dimension scores into one short story paragraph",
)
def generate_report_story(dimension_results: list[dict], archetype: dict, overall_score: int) -> str:
    """Agno tool wrapper — delegates to _generate_report_story."""
    return _generate_report_story(dimension_results, archetype, overall_score)