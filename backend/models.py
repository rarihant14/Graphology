"""
models.py — Pydantic v2 data models for the handwriting analysis pipeline.

HandwritingFeatures holds the raw visual features extracted from a handwriting
sample. GraphologyReport bundles those features with the derived personality
interpretation and a disclaimer.
"""

from pydantic import BaseModel, Field


class HandwritingFeatures(BaseModel):
    """
    Represents the visual and structural features extracted from a handwriting
    sample during graphological analysis.

    All fields default to "unknown" so that partial extractions — where the
    model could only identify some features — never raise validation errors.
    Every field is therefore effectively optional at construction time.
    """

    letter_size: str = Field(
        default="unknown",
        description="Overall size of individual letters (e.g. small, medium, large).",
    )
    slant: str = Field(
        default="unknown",
        description="Direction letters lean (e.g. left, right, upright).",
    )
    baseline: str = Field(
        default="unknown",
        description="How writing sits relative to the ruled or imagined line "
                    "(e.g. straight, ascending, descending, wavy).",
    )
    pressure: str = Field(
        default="unknown",
        description="Force applied while writing (e.g. light, medium, heavy).",
    )
    letter_spacing: str = Field(
        default="unknown",
        description="Space between individual letters (e.g. narrow, normal, wide).",
    )
    word_spacing: str = Field(
        default="unknown",
        description="Space between words (e.g. narrow, normal, wide).",
    )
    connectivity: str = Field(
        default="unknown",
        description="How letters are joined within words "
                    "(e.g. connected, disconnected, mixed).",
    )
    margin_usage: str = Field(
        default="unknown",
        description="How the writer uses page margins "
                    "(e.g. wide left, narrow right, balanced).",
    )
    loop_style: str = Field(
        default="unknown",
        description="Shape and size of loops in letters such as 'l', 'g', 'y' "
                    "(e.g. large upper loops, inflated lower loops, loopless).",
    )
    legibility: str = Field(
        default="unknown",
        description="Overall readability of the handwriting "
                    "(e.g. very legible, moderately legible, illegible).",
    )
    t_bar_position: str = Field(
        default="unknown",
        description="Height at which the t-bar crosses the stem (high, middle, low).",
    )
    t_bar_length: str = Field(
        default="unknown",
        description="Length of the t-bar (short, medium, long).",
    )
    i_dot: str = Field(
        default="unknown",
        description="Style of i-dots (round, high, close, dash, absent).",
    )
    line_spacing: str = Field(
        default="unknown",
        description="Vertical space between lines of text (narrow, normal, wide).",
    )
    writing_speed: str = Field(
        default="unknown",
        description="Apparent writing speed (slow, moderate, fast).",
    )
    letter_form: str = Field(
        default="unknown",
        description="Overall shape of letters (rounded, angular, mixed).",
    )
    regularity: str = Field(
        default="unknown",
        description="Consistency of size, slant and spacing (consistent, irregular).",
    )
    ending_strokes: str = Field(
        default="unknown",
        description="How words and strokes end (abrupt, tapering, extended).",
    )
    capital_size: str = Field(
        default="unknown",
        description="Size of capital letters relative to lowercase (small, medium, large).",
    )
    zone_emphasis: str = Field(
        default="unknown",
        description="Which zone dominates (upper, middle, lower, balanced).",
    )
    stroke_quality: str = Field(
        default="unknown",
        description="Line quality of the strokes (smooth, tremulous).",
    )


class TraitTag(BaseModel):
    """A short personality trait label with the handwriting cues behind it."""

    label: str = Field(description="Trait label, e.g. 'Thoughtful' or 'Trust builder'.")
    why: str = Field(default="", description="Observed handwriting cues that support this trait.")


class DimensionScore(BaseModel):
    """
    A single scored life dimension (e.g. Emotional Balance, Money Mindset)
    within the 7-dimension profile, together with the evidence that produced
    its score.

    The score and evidence are always computed deterministically from the
    extracted HandwritingFeatures — never invented by an LLM — so every
    number here can be traced back to an actually observed feature value.
    """

    key: str = Field(description="Stable identifier, e.g. 'emotional_balance'.")
    label: str = Field(description="Human-readable dimension name, e.g. 'Emotional Balance'.")
    score: int = Field(ge=0, le=100, description="Deterministic 0-100 score for this dimension.")
    essence: str = Field(description="Plain-English summary of what this score suggests.")
    evidence: list[str] = Field(
        description="Visible handwriting cues that produced this score — 'why we see it'. "
                    "Sourced directly from the rule engine's feature interpretations.",
    )
    strength: str = Field(description="How this trait can show up as a strength.")
    blind_spot: str = Field(description="The potential downside of this trait when overused.")
    next_move: str = Field(description="One small, practical action tied to this dimension.")
    confidence: str = Field(description="'high' or 'low' — how many features contributed evidence.")


class GraphologyReport(BaseModel):
    """
    A complete graphology report produced from a handwriting sample.

    Combines the extracted HandwritingFeatures with a natural-language
    summary of inferred personality traits, a mandatory disclaimer, and a
    scored 7-dimension profile with evidence-backed reasoning for each score.
    """

    features: HandwritingFeatures = Field(
        description="Structured visual features extracted from the handwriting sample.",
    )
    personality_traits: str = Field(
        description="Natural-language summary of personality characteristics "
                    "inferred from the handwriting features.",
    )
    disclaimer: str = Field(
        description="A statement clarifying the limitations and non-scientific "
                    "nature of graphological analysis.",
    )
    overall_score: int = Field(
        default=50, ge=0, le=100,
        description="Overall Life Alignment Quotient — average of the 7 dimension scores.",
    )
    archetype: str = Field(
        default="",
        description="Deterministically chosen label for the highest-scoring dimension.",
    )
    archetype_tagline: str = Field(default="", description="One-line description of the archetype.")
    dimensions: list[DimensionScore] = Field(
        default_factory=list,
        description="The 7-dimension scored profile with evidence for each score.",
    )
    traits: list[TraitTag] = Field(
        default_factory=list,
        description="Personality trait tags supported by the observed handwriting cues.",
    )
    story: str = Field(
        default="",
        description="Short narrative paragraph tying the dimension scores together.",
    )
    confidence_note: str = Field(
        default="",
        description="Plain-language transparency note on how much of the sample was observable.",
    )