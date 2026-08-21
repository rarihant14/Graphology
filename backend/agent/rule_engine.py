"""
rules_engine.py — Deterministic, rule-based interpretation layer for the
graphology analysis pipeline.

This module contains no machine-learning or probabilistic models. Every
interpretation is derived from a static, human-readable lookup table
(GRAPHOLOGY_RULES) that maps observed handwriting feature values to
hedged personality descriptions.

Design goals:
  - Transparency: all rules are visible and editable in one place.
  - Auditability: given a set of features, the exact source of every
    interpretation can be traced back to a specific dict entry.
  - Humility: all interpretation strings are deliberately hedged with
    phrases like "may suggest", "could indicate", and "is often associated
    with" to avoid presenting subjective inferences as objective facts.
  - Graceful degradation: features the vision model could not extract
    are reported as insufficient data rather than silently dropped.

No external dependencies beyond the project's own models module.
"""

from models import HandwritingFeatures


# ---------------------------------------------------------------------------
# Fallback string used whenever a feature value has no matching rule
# ---------------------------------------------------------------------------
_UNKNOWN_INTERPRETATION = "insufficient handwriting data to interpret this trait"


# ---------------------------------------------------------------------------
# Master rules dictionary
# Structure: { feature_name: { observed_value: interpretation_string } }
# ---------------------------------------------------------------------------
GRAPHOLOGY_RULES: dict[str, dict[str, str]] = {

    "letter_size": {
        "small": (
            "may suggest a detail-oriented, concentrated mind with a tendency "
            "toward introversion or scholarly focus"
        ),
        "medium": (
            "is often associated with a balanced self-image and comfortable "
            "social adaptability"
        ),
        "large": (
            "could indicate a confident, outward-facing personality with a "
            "desire to be noticed or to lead"
        ),
        "very large": (
            "may suggest an especially strong need for recognition or an "
            "expansive, bold approach to self-expression"
        ),
        "variable": (
            "could indicate mood variability or a flexible, context-sensitive "
            "sense of self"
        ),
    },

    "slant": {
        "right": (
            "may suggest an emotionally expressive and outward personality "
            "with warmth toward others"
        ),
        "left": (
            "could indicate emotional reservation or a preference for "
            "independence and self-reliance"
        ),
        "upright": (
            "is often associated with logical thinking, emotional control, "
            "and a pragmatic worldview"
        ),
        "vertical": (
            "is often associated with logical thinking, emotional control, "
            "and a pragmatic worldview"
        ),
        "mixed": (
            "may suggest emotional variability, adaptability, or an inner "
            "tension between reason and feeling"
        ),
        "far right": (
            "could indicate intense emotional expressiveness or impulsiveness "
            "in social situations"
        ),
        "far left": (
            "may suggest a pronounced tendency toward withdrawal or a strong "
            "attachment to the past"
        ),
    },

    "baseline": {
        "straight": (
            "is often associated with emotional stability, self-discipline, "
            "and reliable goal-directed behaviour"
        ),
        "ascending": (
            "may suggest optimism, ambition, or an energised and hopeful "
            "outlook at the time of writing"
        ),
        "descending": (
            "could indicate fatigue, pessimism, or a temporary low in mood "
            "or motivation"
        ),
        "wavy": (
            "may suggest emotional inconsistency, creativity, or a mercurial "
            "and adaptable personality"
        ),
        "irregular": (
            "could indicate inner tension, a spontaneous nature, or difficulty "
            "maintaining consistent emotional states"
        ),
        "convex": (
            "may suggest initial enthusiasm that fades, possibly reflecting "
            "short-lived motivation patterns"
        ),
        "concave": (
            "could indicate slow-starting determination that builds momentum "
            "toward a goal"
        ),
    },

    "pressure": {
        "light": (
            "may suggest sensitivity, empathy, or a preference for avoiding "
            "confrontation and conflict"
        ),
        "medium": (
            "is often associated with a healthy balance of energy, commitment, "
            "and emotional resilience"
        ),
        "heavy": (
            "could indicate strong willpower, intensity of feeling, or a "
            "tendency to take life seriously"
        ),
        "very heavy": (
            "may suggest heightened emotional intensity, stubbornness, or "
            "significant inner drive"
        ),
        "variable": (
            "could indicate fluctuating energy levels or emotional sensitivity "
            "that responds strongly to context"
        ),
    },

    "letter_spacing": {
        "narrow": (
            "may suggest a need for closeness, possible cautiousness in "
            "spending, or a thrifty disposition"
        ),
        "normal": (
            "is often associated with a well-adjusted sense of personal space "
            "and social comfort"
        ),
        "wide": (
            "could indicate a generous nature, independent thinking, or a "
            "preference for personal breathing room"
        ),
        "very wide": (
            "may suggest isolation tendencies, a highly independent spirit, "
            "or difficulty with sustained concentration"
        ),
        "variable": (
            "could indicate inconsistency in social needs or a context-driven "
            "approach to interpersonal distance"
        ),
    },

    "word_spacing": {
        "narrow": (
            "may suggest a sociable, talkative nature or a desire to stay "
            "closely connected to others"
        ),
        "normal": (
            "is often associated with clear thinking and a balanced approach "
            "to social interaction"
        ),
        "wide": (
            "could indicate a preference for solitude, careful deliberation "
            "before engaging with others, or reserve"
        ),
        "very wide": (
            "may suggest pronounced introversion, loneliness, or a strong "
            "boundary between self and the outside world"
        ),
        "variable": (
            "could indicate an inconsistent social rhythm or shifting comfort "
            "levels in different contexts"
        ),
    },

    "connectivity": {
        "connected": (
            "is often associated with logical, sequential thinking and a "
            "methodical approach to problem-solving"
        ),
        "disconnected": (
            "may suggest intuitive leaps, creativity, or a preference for "
            "holistic rather than step-by-step reasoning"
        ),
        "mixed": (
            "could indicate a versatile thinker who moves between analytical "
            "and intuitive modes depending on the task"
        ),
        "partially connected": (
            "may suggest a balance of logic and intuition, with occasional "
            "reliance on gut feeling"
        ),
    },

    "margin_usage": {
        "wide left": (
            "could indicate caution about moving forward, a respect for "
            "tradition, or a tendency to reflect before acting"
        ),
        "narrow left": (
            "may suggest enthusiasm, impulsiveness, or an eagerness to "
            "engage without lengthy deliberation"
        ),
        "wide right": (
            "may suggest anxiety about the future or a reluctance to embrace "
            "new and unknown situations"
        ),
        "narrow right": (
            "could indicate boldness, a future orientation, or comfort with "
            "uncertainty and change"
        ),
        "balanced": (
            "is often associated with a sense of aesthetic order, "
            "self-awareness, and emotional equilibrium"
        ),
        "no margins": (
            "may suggest a fear of wasting space or resources, or a tendency "
            "toward all-or-nothing thinking"
        ),
        "increasing left": (
            "could indicate growing confidence or enthusiasm as a task "
            "or interaction progresses"
        ),
        "decreasing left": (
            "may suggest initial enthusiasm that gives way to caution or "
            "second-guessing"
        ),
    },

    "loop_style": {
        "large upper loops": (
            "may suggest idealism, spirituality, or a rich and active "
            "imaginative life"
        ),
        "small upper loops": (
            "could indicate pragmatism, scepticism of abstract ideas, or a "
            "preference for concrete reality"
        ),
        "large lower loops": (
            "is often associated with strong material drives, physical energy, "
            "or a focus on tangible rewards"
        ),
        "small lower loops": (
            "may suggest modesty in material ambitions or a tendency to "
            "repress physical and instinctual needs"
        ),
        "inflated lower loops": (
            "could indicate pronounced material desires or a strong emphasis "
            "on physical comfort and sensory experience"
        ),
        "loopless": (
            "may suggest directness, economy of expression, or a no-nonsense "
            "approach to communication"
        ),
        "narrow loops": (
            "could indicate repression, self-restraint, or inhibition in "
            "emotional or creative expression"
        ),
        "variable": (
            "may suggest inconsistency across imaginative and material drives, "
            "or a highly context-sensitive inner life"
        ),
    },

    "legibility": {
        "very legible": (
            "is often associated with a desire to be understood, clarity of "
            "thought, and consideration for the reader"
        ),
        "moderately legible": (
            "may suggest a balance between personal expression and concern "
            "for communicating clearly with others"
        ),
        "illegible": (
            "could indicate impatience, a highly subjective worldview, or "
            "indifference to external interpretation"
        ),
        "variable": (
            "may suggest that clarity of communication is situational, "
            "shifting with mood or the perceived importance of the audience"
        ),
        "stylised": (
            "could indicate a strong aesthetic sensibility or a desire to "
            "project a distinctive personal image"
        ),
    },
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def apply_rules(features: HandwritingFeatures) -> dict[str, str]:
    """
    Map each field in a HandwritingFeatures instance to a hedged personality
    interpretation using the GRAPHOLOGY_RULES lookup table.

    The function iterates over every feature defined in HandwritingFeatures,
    normalises the observed value to lowercase, and retrieves the matching
    interpretation string. If a feature is "unknown" or its value does not
    appear in the rules dict, the fallback message is used so the caller
    always receives a complete mapping with no missing keys.

    Args:
        features: A HandwritingFeatures instance (partial or fully populated).

    Returns:
        A dict mapping each feature name (str) to its interpretation (str).
        Every key in HandwritingFeatures will be present in the output.

    Example:
        >>> feats = HandwritingFeatures(slant="right", pressure="heavy")
        >>> result = apply_rules(feats)
        >>> print(result["slant"])
        'may suggest an emotionally expressive and outward personality ...'
    """
    interpretations: dict[str, str] = {}

    for field_name in features.model_fields:
        observed_value: str = getattr(features, field_name, "unknown")

        # Treat any blank or explicitly unknown value as uninterpretable
        if not observed_value or observed_value.strip().lower() == "unknown":
            interpretations[field_name] = _UNKNOWN_INTERPRETATION
            continue

        feature_rules = GRAPHOLOGY_RULES.get(field_name, {})
        interpretation = feature_rules.get(
            observed_value.strip().lower(),
            _UNKNOWN_INTERPRETATION,
        )
        interpretations[field_name] = interpretation

    return interpretations