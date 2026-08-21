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


class GraphologyReport(BaseModel):
    """
    A complete graphology report produced from a handwriting sample.

    Combines the extracted HandwritingFeatures with a natural-language
    summary of inferred personality traits and a mandatory disclaimer
    reminding readers that graphology is not a validated science.
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