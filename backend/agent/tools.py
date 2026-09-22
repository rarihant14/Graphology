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

from concurrent.futures import ThreadPoolExecutor

from config import VISION_MODEL, get_gemini_client, get_text_model
from models import HandwritingFeatures, GraphologyReport
from .rule_engine import apply_rules
from .image_enhancement import enhance_image
from .measurements import measure_features

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool 1 — Vision: extract observable handwriting features
# ---------------------------------------------------------------------------

ALLOWED_VALUES: dict[str, tuple[str, ...]] = {
    "letter_size": ("small", "medium", "large"),
    "slant": ("left", "right", "upright", "mixed"),
    "baseline": ("straight", "ascending", "descending", "wavy"),
    "pressure": ("light", "medium", "heavy"),
    "letter_spacing": ("narrow", "normal", "wide"),
    "word_spacing": ("narrow", "normal", "wide"),
    "connectivity": ("connected", "disconnected", "mixed"),
    "margin_usage": ("wide left", "narrow left", "wide right", "narrow right", "balanced"),
    "loop_style": (
        "large upper loops", "small upper loops",
        "large lower loops", "small lower loops", "loopless",
    ),
    "legibility": ("very legible", "moderately legible", "illegible"),
    "t_bar_position": ("high", "middle", "low"),
    "t_bar_length": ("short", "medium", "long"),
    "i_dot": ("round", "high", "close", "dash", "absent"),
    "line_spacing": ("narrow", "normal", "wide"),
    "writing_speed": ("slow", "moderate", "fast"),
    "letter_form": ("rounded", "angular", "mixed"),
    "regularity": ("consistent", "irregular"),
    "ending_strokes": ("abrupt", "tapering", "extended"),
    "capital_size": ("small", "medium", "large"),
    "zone_emphasis": ("upper", "middle", "lower", "balanced"),
    "stroke_quality": ("smooth", "tremulous"),
}

# Features the OpenCV measurements can verify directly.
_MEASURED = ("slant", "baseline", "margin_usage", "line_spacing")

_VISION_PROMPT = (
    "You are an expert forensic document examiner. Analyze this handwriting image and "
    "extract only observable, objective features. Look carefully at the whole page before "
    "answering. Return only a raw JSON object. For every key below choose ONLY one of the "
    "exact allowed values, or \"unknown\" if the feature cannot be judged from this image "
    "(e.g. no t or i letters are present, or the image is too blurry). Never guess. "
    "Definitions: pressure = ink darkness/thickness of strokes; regularity = consistency of "
    "size, slant and spacing across the sample; zone_emphasis = which zone (upper "
    "ascenders, middle body, lower descenders) is most developed; ending_strokes = how word "
    "endings finish; capital_size = capitals relative to lowercase height. "
    "Keys and allowed values: "
    + "; ".join(f"{k}({'/'.join(v)})" for k, v in ALLOWED_VALUES.items())
    + ". Also include a key \"confidence\" whose value is an object mapping each of those "
    "keys to \"high\", \"medium\" or \"low\". No markdown, no explanation."
)


def _normalize(value) -> str:
    return str(value).strip().lower() if value is not None else "unknown"


def _vision_pass(image_bytes: bytes) -> dict[str, str]:
    """One vision call; returns only allowed, non-low-confidence feature values."""
    from google.genai import types as genai_types

    client = get_gemini_client()
    response = client.models.generate_content(
        model=VISION_MODEL,
        contents=[
            genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            _VISION_PROMPT,
        ],
        config=genai_types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip())
    data = json.loads(raw)
    confidence = data.get("confidence") if isinstance(data.get("confidence"), dict) else {}

    result: dict[str, str] = {}
    for key, allowed in ALLOWED_VALUES.items():
        value = _normalize(data.get(key))
        if value not in allowed:
            continue
        if _normalize(confidence.get(key)) == "low":
            continue
        result[key] = value
    return result


def _reconcile(
    pass_a: dict[str, str], pass_b: dict[str, str], measured: dict[str, str]
) -> dict[str, str]:
    """
    Combine two independent vision passes with OpenCV measurements.

    - Measured features: the measurement wins if either pass agrees with it or the
      passes disagree; if both passes agree with each other against the measurement,
      the vision value is kept (the measurement can be wrong on photos).
    - Other features: kept only when both passes agree; a single confident pass is
      accepted when the other had no opinion; conflicts become "unknown".
    """
    final: dict[str, str] = {}
    for key in ALLOWED_VALUES:
        a, b, m = pass_a.get(key), pass_b.get(key), measured.get(key)
        if key in _MEASURED and m:
            if a and a == b and a != m:
                final[key] = a
            else:
                final[key] = m
        elif a and b:
            if a == b:
                final[key] = a
            elif m and m in (a, b):
                final[key] = m
        elif a or b:
            final[key] = a or b
    return final


def _extract_handwriting_features(image_base64: str) -> str:
    """
    Raw function — called directly by the pipeline in agent.py.

    Two independent Gemini vision passes (enhanced and original image) are
    reconciled together with objective OpenCV measurements, so a single noisy
    model answer cannot decide a feature on its own.
    """
    features = HandwritingFeatures()
    try:
        original = base64.b64decode(image_base64)
        enhanced = enhance_image(original)
        measured = measure_features(original)

        with ThreadPoolExecutor(max_workers=2) as pool:
            fut_a = pool.submit(_vision_pass, enhanced)
            fut_b = pool.submit(_vision_pass, original)
            results = []
            for fut in (fut_a, fut_b):
                try:
                    results.append(fut.result())
                except Exception as exc:
                    logger.warning("Vision pass failed: %s", exc)
                    results.append({})

        final = _reconcile(results[0], results[1], measured)
        logger.info("Measured: %s | passA: %s | passB: %s", measured, results[0], results[1])
        features = HandwritingFeatures(**final)

    except Exception as exc:
        logger.error("Unexpected error in extract_handwriting_features: %s", exc)

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
    trait_labels: list[str] | None = None,
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
        + (
            f"Personality traits: {', '.join(trait_labels)}. Weave these in naturally "
            "where they fit — do not list them.\n"
            if trait_labels else ""
        )
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