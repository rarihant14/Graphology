"""Schema and vision extraction for evidence-based handwriting observations."""

import json
import logging
import re
from typing import Literal

from google.genai import types as genai_types
from pydantic import BaseModel, ConfigDict, Field, model_validator

from config import VISION_MODEL, get_gemini_client

logger = logging.getLogger(__name__)

_CATEGORY_ROWS = (
    ("letter_size_and_proportion", (
        "lowercase_size|very_small,small,medium,large,very_large,unknown",
        "capital_size|very_small,small,medium,large,very_large,unknown",
        "letter_width|very_narrow,narrow,normal,wide,very_wide,unknown",
        "letter_height_variation|minimal,moderate,high,unknown",
        "ascender_height|short,medium,long,very_long,unknown",
        "descender_height|short,medium,long,very_long,unknown",
        "middle_zone_height|short,medium,tall,unknown",
    )),
    ("slant_and_inclination", (
        "predominant_slant|strong_left,slight_left,upright,slight_right,strong_right,mixed,unknown",
        "slant_variability|minimal,moderate,high,unknown",
        "left_slant_frequency|none,rare,occasional,frequent,predominant,unknown",
        "right_slant_frequency|none,rare,occasional,frequent,predominant,unknown",
        "upright_writing_frequency|none,rare,occasional,frequent,predominant,unknown",
    )),
    ("spacing_characteristics", (
        "interletter_spacing|very_narrow,narrow,normal,wide,very_wide,unknown",
        "interword_spacing|very_narrow,narrow,normal,wide,very_wide,unknown",
        "interline_spacing|very_narrow,narrow,normal,wide,very_wide,unknown",
        "paragraph_spacing|none,minimal,moderate,wide,unknown",
        "spacing_consistency|high,moderate,low,unknown",
    )),
    ("baseline_and_alignment", (
        "baseline_direction|strongly_ascending,slightly_ascending,straight,slightly_descending,strongly_descending,unknown",
        "baseline_variability|minimal,moderate,high,unknown",
        "baseline_curvature|straight,upward_arc,downward_arc,wavy,irregular,unknown",
        "line_alignment|left_aligned,right_aligned,centered,justified_like,irregular,unknown",
        "word_alignment|uniform,variable,irregular,unknown",
    )),
    ("pressure_and_stroke", (
        "ink_darkness|very_light,light,medium,dark,very_dark,unknown",
        "stroke_width|very_thin,thin,medium,thick,very_thick,unknown",
        "stroke_darkness_consistency|consistent,moderately_variable,highly_variable,unknown",
        "stroke_continuity|continuous,mostly_continuous,frequently_interrupted,unknown",
        "stroke_smoothness|smooth,mostly_smooth,irregular,tremulous,unknown",
        "stroke_edge_quality|clean,soft,feathered,jagged,mixed,unknown",
    )),
    ("letter_formation", (
        "letter_roundedness|strongly_rounded,rounded,mixed,angular,strongly_angular,unknown",
        "letter_angularity|minimal,low,moderate,high,very_high,unknown",
        "letter_connectivity|fully_connected,mostly_connected,mixed,mostly_disconnected,fully_disconnected,unknown",
        "letter_separation_frequency|none,rare,occasional,frequent,predominant,unknown",
        "letter_simplification|minimal,moderate,high,very_high,unknown",
        "letter_formation_consistency|high,moderate,low,unknown",
    )),
    ("loops_and_writing_zones", (
        "upper_loop_size|absent,small,medium,large,very_large,unknown",
        "lower_loop_size|absent,small,medium,large,very_large,unknown",
        "upper_loop_openness|open,partially_open,closed,mixed,unknown",
        "lower_loop_openness|open,partially_open,closed,mixed,unknown",
        "upper_zone_development|minimal,moderate,prominent,unknown",
        "middle_zone_proportion|small,balanced,large,unknown",
        "lower_zone_development|minimal,moderate,prominent,unknown",
    )),
    ("letter_specific_characteristics", (
        "t_bar_height|very_low,low,middle,high,very_high,unknown",
        "t_bar_length|very_short,short,medium,long,very_long,unknown",
        "t_bar_direction|ascending,horizontal,descending,irregular,unknown",
        "i_dot_shape|round,oval,dash,irregular,absent,unknown",
        "i_dot_height|very_close,close,normal,high,very_high,unknown",
        "i_dot_offset|centered,left_offset,right_offset,variable,unknown",
        "o_formation|circular,oval_vertical,oval_horizontal,angular,open,irregular,unknown",
        "a_formation|single_storey,double_storey,mixed,unknown",
    )),
    ("word_and_stroke_endings", (
        "initial_stroke_style|direct,hooked,curved,extended,flourished,mixed,unknown",
        "terminal_stroke_style|abrupt,tapered,curved,extended,flourished,mixed,unknown",
        "terminal_stroke_direction|upward,horizontal,downward,curved,variable,unknown",
        "terminal_stroke_extension|none,short,moderate,long,very_long,unknown",
        "stroke_tapering|none,subtle,moderate,pronounced,unknown",
    )),
    ("margins_and_page_layout", (
        "left_margin|very_narrow,narrow,medium,wide,very_wide,unknown",
        "right_margin|very_narrow,narrow,medium,wide,very_wide,unknown",
        "top_margin|very_narrow,narrow,medium,wide,very_wide,unknown",
        "bottom_margin|very_narrow,narrow,medium,wide,very_wide,unknown",
        "margin_consistency|high,moderate,low,unknown",
        "page_utilization|very_low,low,moderate,high,very_high,unknown",
    )),
    ("writing_rhythm_and_flow", (
        "apparent_writing_speed|slow_appearing,moderate_appearing,fast_appearing,indeterminate,unknown",
        "rhythm_uniformity|uniform,mostly_uniform,variable,highly_variable,unknown",
        "stroke_flow|flowing,mostly_flowing,interrupted,fragmented,unknown",
        "pen_lift_evidence|minimal,occasional,frequent,not_assessable,unknown",
        "correction_and_overwriting_frequency|none,rare,occasional,frequent,very_frequent,unknown",
    )),
    ("overall_handwriting_characteristics", (
        "legibility|very_legible,legible,moderately_legible,difficult_to_read,illegible,unknown",
        "overall_regularity|highly_consistent,consistent,moderately_irregular,highly_irregular,unknown",
        "writing_density|very_sparse,sparse,moderate,dense,very_dense,unknown",
        "letter_size_consistency|high,moderate,low,unknown",
        "spatial_organization|highly_ordered,ordered,moderately_variable,disorganized,unknown",
    )),
)

CATEGORY_NAMES = {
    "letter_size_and_proportion": "Letter Size and Proportion",
    "slant_and_inclination": "Slant and Inclination",
    "spacing_characteristics": "Spacing Characteristics",
    "baseline_and_alignment": "Baseline and Alignment",
    "pressure_and_stroke": "Pressure and Stroke Characteristics",
    "letter_formation": "Letter Formation",
    "loops_and_writing_zones": "Loops and Writing Zones",
    "letter_specific_characteristics": "Letter-Specific Characteristics",
    "word_and_stroke_endings": "Word and Stroke Endings",
    "margins_and_page_layout": "Margins and Page Layout",
    "writing_rhythm_and_flow": "Writing Rhythm and Flow",
    "overall_handwriting_characteristics": "Overall Handwriting Characteristics",
}

FEATURES: dict[str, dict[str, object]] = {}
for _category, _rows in _CATEGORY_ROWS:
    for _row in _rows:
        _feature_id, _values = _row.split("|")
        _name = _feature_id.replace("_", " ").title()
        _name = re.sub(r"\bT Bar\b", "T-Bar", _name)
        _name = re.sub(r"\bI Dot\b", "I-Dot", _name)
        _name = _name.replace("Correction And Overwriting", "Correction and Overwriting")
        FEATURES[_feature_id] = {
            "category": _category,
            "feature_name": _name,
            "allowed_values": tuple(_values.split(",")),
        }

_LETTERS = {
    "lowercase_size": ["a", "c", "e", "m", "n", "o", "r", "s", "x"],
    "capital_size": ["uppercase", "lowercase"],
    "letter_width": ["readable letters"],
    "letter_height_variation": ["repeated letters"],
    "ascender_height": ["b", "d", "f", "h", "k", "l"],
    "descender_height": ["g", "j", "p", "q", "y"],
    "middle_zone_height": ["a", "c", "e", "m", "n", "o", "r", "s", "x"],
    "predominant_slant": ["vertical stems"],
    "slant_variability": ["comparable letters"],
    "left_slant_frequency": ["vertical stems"],
    "right_slant_frequency": ["vertical stems"],
    "upright_writing_frequency": ["vertical stems"],
    "interletter_spacing": ["multi-letter words"],
    "interword_spacing": ["word gaps"],
    "interline_spacing": ["multiple lines"],
    "paragraph_spacing": ["multiple paragraphs"],
    "spacing_consistency": ["multiple words", "multiple lines"],
    "baseline_direction": ["sufficiently long lines"],
    "baseline_variability": ["multiple words", "multiple lines"],
    "baseline_curvature": ["sufficiently long lines"],
    "line_alignment": ["at least three lines"],
    "word_alignment": ["words across lines"],
    "ink_darkness": ["ink", "background"],
    "stroke_width": ["resolved strokes"],
    "stroke_darkness_consistency": ["multiple strokes"],
    "stroke_continuity": ["resolved stroke boundaries"],
    "stroke_smoothness": ["resolved stroke paths"],
    "stroke_edge_quality": ["high-resolution strokes"],
    "letter_roundedness": ["a", "c", "e", "m", "n", "o"],
    "letter_angularity": ["representative letters"],
    "letter_connectivity": ["multi-letter words"],
    "letter_separation_frequency": ["multi-letter words"],
    "letter_simplification": ["recognizable letter forms"],
    "letter_formation_consistency": ["repeated letters"],
    "upper_loop_size": ["b", "d", "f", "h", "k", "l"],
    "lower_loop_size": ["g", "j", "p", "q", "y"],
    "upper_loop_openness": ["visible upper loops"],
    "lower_loop_openness": ["visible lower loops"],
    "upper_zone_development": ["multiple ascenders"],
    "middle_zone_proportion": ["middle, upper and lower zones"],
    "lower_zone_development": ["multiple descenders"],
    "t_bar_height": ["multiple lowercase t letters"],
    "t_bar_length": ["multiple lowercase t letters"],
    "t_bar_direction": ["clear t crossbars"],
    "i_dot_shape": ["multiple lowercase i letters"],
    "i_dot_height": ["multiple lowercase i letters"],
    "i_dot_offset": ["multiple lowercase i letters"],
    "o_formation": ["multiple lowercase o letters"],
    "a_formation": ["multiple lowercase a letters"],
    "initial_stroke_style": ["multiple letter beginnings"],
    "terminal_stroke_style": ["multiple letter endings"],
    "terminal_stroke_direction": ["complete word endings"],
    "terminal_stroke_extension": ["complete word endings"],
    "stroke_tapering": ["visible stroke endpoints"],
    "left_margin": ["complete left page boundary"],
    "right_margin": ["complete right page boundary"],
    "top_margin": ["complete top page boundary"],
    "bottom_margin": ["complete bottom page boundary"],
    "margin_consistency": ["page boundaries", "multiple lines"],
    "page_utilization": ["complete page boundaries"],
    "apparent_writing_speed": ["representative handwriting"],
    "rhythm_uniformity": ["multiple words", "multiple lines"],
    "stroke_flow": ["visible letter formations"],
    "pen_lift_evidence": ["visible stroke discontinuities"],
    "correction_and_overwriting_frequency": ["sufficient handwritten content"],
    "legibility": ["readable content"],
    "overall_regularity": ["multiple lines", "representative letters"],
    "writing_density": ["sufficient writing area"],
    "letter_size_consistency": ["comparable letters"],
    "spatial_organization": ["substantial visible writing area"],
}

_DEFINITIONS = {
    "lowercase_size": "average visual size of lowercase middle-zone letters",
    "capital_size": "relative dimensions of uppercase letters compared with lowercase middle-zone letters",
    "letter_width": "horizontal dimension of letters relative to their height",
    "letter_height_variation": "variation in the height of comparable letters",
    "ascender_height": "relative height of upper extensions compared with the middle-zone body",
    "descender_height": "relative length of lower extensions compared with the middle-zone body",
    "middle_zone_height": "average height of lowercase middle-zone letters",
    "predominant_slant": "dominant direction of inclination in representative letter stems",
    "slant_variability": "degree of variation in letter inclination",
    "left_slant_frequency": "frequency of left-inclined letter stems",
    "right_slant_frequency": "frequency of right-inclined letter stems",
    "upright_writing_frequency": "frequency of approximately vertical letter stems",
    "interletter_spacing": "average horizontal gap between adjacent letters",
    "interword_spacing": "average distance between consecutive words",
    "interline_spacing": "vertical distance between consecutive handwritten lines",
    "paragraph_spacing": "vertical distance separating handwritten paragraphs",
    "spacing_consistency": "uniformity of letter, word, and line spacing",
    "baseline_direction": "overall directional movement of the handwriting baseline",
    "baseline_variability": "degree of vertical fluctuation in the baseline",
    "baseline_curvature": "overall geometric shape of the baseline",
    "line_alignment": "relative positioning of successive handwritten lines",
    "word_alignment": "consistency of word positioning within handwritten lines",
    "ink_darkness": "visible darkness of handwritten ink relative to the background, not physical pressure",
    "stroke_width": "apparent thickness of handwritten strokes",
    "stroke_darkness_consistency": "uniformity of visible ink darkness",
    "stroke_continuity": "visual continuity of individual stroke formations",
    "stroke_smoothness": "smoothness of visible stroke trajectories",
    "stroke_edge_quality": "appearance of handwritten stroke boundaries",
    "letter_roundedness": "degree of curved and rounded letter formations",
    "letter_angularity": "frequency of sharp corners and pointed letter formations",
    "letter_connectivity": "degree of visible connection between adjacent letters",
    "letter_separation_frequency": "frequency of visible gaps between adjacent letters",
    "letter_simplification": "degree of simplification in conventional letter formations",
    "letter_formation_consistency": "uniformity of repeated letter construction",
    "upper_loop_size": "relative size of loops in upper-zone letters",
    "lower_loop_size": "relative size of loops in lower-zone letters",
    "upper_loop_openness": "degree of openness or closure in upper loops",
    "lower_loop_openness": "degree of openness or closure in lower loops",
    "upper_zone_development": "relative prominence of upper-zone extensions",
    "middle_zone_proportion": "relative proportion of middle-zone letters compared with total writing height",
    "lower_zone_development": "relative prominence of lower-zone extensions",
    "t_bar_height": "vertical position of the crossbar on lowercase t",
    "t_bar_length": "horizontal length of the lowercase t crossbar",
    "t_bar_direction": "direction of the lowercase t crossbar",
    "i_dot_shape": "geometric appearance of lowercase i dots",
    "i_dot_height": "vertical distance between an i dot and its stem",
    "i_dot_offset": "horizontal alignment of an i dot relative to its stem",
    "o_formation": "geometric shape and closure of lowercase o",
    "a_formation": "single-storey or double-storey structure of lowercase a, not closure",
    "initial_stroke_style": "visible formation pattern at the beginning of letters or words",
    "terminal_stroke_style": "visual formation pattern at the end of letters or words",
    "terminal_stroke_direction": "direction of the final visible stroke",
    "terminal_stroke_extension": "degree of extension beyond normal letter or word boundaries",
    "stroke_tapering": "reduction in stroke thickness or darkness towards an endpoint",
    "left_margin": "horizontal distance between handwriting and the left page boundary",
    "right_margin": "horizontal distance between handwriting and the right page boundary",
    "top_margin": "vertical distance between handwriting and the top page boundary",
    "bottom_margin": "vertical distance between handwriting and the bottom page boundary",
    "margin_consistency": "uniformity of margins across the page",
    "page_utilization": "proportion of usable page area occupied by handwriting",
    "apparent_writing_speed": "visual impression of apparent writing pace, never measured speed",
    "rhythm_uniformity": "consistency of visible handwriting formation patterns",
    "stroke_flow": "visual continuity and connectedness of writing formations",
    "pen_lift_evidence": "visible evidence of possible pen lifts, not confirmation of actual lifts",
    "correction_and_overwriting_frequency": "frequency of visible corrections, retracing, and overwriting",
    "legibility": "ease of visually recognizing handwritten content",
    "overall_regularity": "overall consistency of letter size, slant, spacing, baseline, and formation",
    "writing_density": "amount of handwriting relative to available writing area",
    "letter_size_consistency": "uniformity of letter dimensions throughout the sample",
    "spatial_organization": "overall visual arrangement of handwriting across the available page",
}

_MINIMUM_EVIDENCE = {
    "lowercase_size": "multiple lowercase letters",
    "capital_size": "uppercase and lowercase letters",
    "letter_width": "multiple readable letters",
    "letter_height_variation": "repeated or comparable letters",
    "ascender_height": "relevant ascender letters",
    "descender_height": "relevant descender letters",
    "middle_zone_height": "multiple middle-zone letters",
    "predominant_slant": "multiple representative vertical strokes",
    "slant_variability": "multiple comparable letters",
    "left_slant_frequency": "multiple evaluable vertical strokes",
    "right_slant_frequency": "multiple evaluable vertical strokes",
    "upright_writing_frequency": "multiple evaluable vertical strokes",
    "interletter_spacing": "multiple multi-letter words",
    "interword_spacing": "multiple word gaps",
    "interline_spacing": "at least two visible lines",
    "paragraph_spacing": "multiple paragraphs",
    "spacing_consistency": "multiple words and lines",
    "baseline_direction": "sufficiently long handwriting lines",
    "baseline_variability": "multiple words or lines",
    "baseline_curvature": "sufficiently long individual lines",
    "line_alignment": "at least three visible lines",
    "word_alignment": "multiple words across lines",
    "ink_darkness": "clearly visible ink and background",
    "stroke_width": "adequate image resolution",
    "stroke_darkness_consistency": "multiple visible strokes",
    "stroke_continuity": "clearly resolved stroke boundaries",
    "stroke_smoothness": "adequate stroke resolution",
    "stroke_edge_quality": "high-resolution image",
    "letter_roundedness": "multiple representative letters",
    "letter_angularity": "multiple representative letters",
    "letter_connectivity": "multiple multi-letter words",
    "letter_separation_frequency": "multiple multi-letter words",
    "letter_simplification": "recognizable conventional letter forms",
    "letter_formation_consistency": "repeated letter occurrences",
    "upper_loop_size": "relevant upper-loop letters",
    "lower_loop_size": "relevant lower-loop letters",
    "upper_loop_openness": "visible upper loops",
    "lower_loop_openness": "visible lower loops",
    "upper_zone_development": "multiple ascenders",
    "middle_zone_proportion": "all three zones or sufficient representative letters",
    "lower_zone_development": "multiple descenders",
    "t_bar_height": "multiple lowercase t letters",
    "t_bar_length": "multiple lowercase t letters",
    "t_bar_direction": "clearly visible t crossbars",
    "i_dot_shape": "multiple lowercase i letters",
    "i_dot_height": "multiple lowercase i letters",
    "i_dot_offset": "multiple lowercase i letters",
    "o_formation": "multiple lowercase o letters",
    "a_formation": "multiple lowercase a letters",
    "initial_stroke_style": "multiple identifiable letter beginnings",
    "terminal_stroke_style": "multiple identifiable letter endings",
    "terminal_stroke_direction": "multiple complete word endings",
    "terminal_stroke_extension": "multiple complete word endings",
    "stroke_tapering": "clearly visible stroke endpoints",
    "left_margin": "complete left page boundary",
    "right_margin": "complete right page boundary",
    "top_margin": "complete top page boundary",
    "bottom_margin": "complete bottom page boundary",
    "margin_consistency": "visible page boundaries and multiple lines",
    "page_utilization": "complete page boundaries",
    "apparent_writing_speed": "sufficient representative handwriting",
    "rhythm_uniformity": "multiple words and lines",
    "stroke_flow": "multiple visible letter formations",
    "pen_lift_evidence": "clearly visible stroke discontinuities",
    "correction_and_overwriting_frequency": "sufficient handwritten content",
    "legibility": "sufficient readable content",
    "overall_regularity": "multiple lines and representative letters",
    "writing_density": "sufficient writing area",
    "letter_size_consistency": "multiple comparable letters",
    "spatial_organization": "substantial visible writing area",
}

_COVERAGE_VALUES = (
    "single_letter", "single_word", "multiple_words", "single_line",
    "multiple_lines", "page_level", "insufficient", "not_applicable",
)

_LATIN_LETTER_FEATURES = {
    "lowercase_size", "capital_size", "ascender_height", "descender_height",
    "middle_zone_height", "letter_roundedness", "upper_loop_size",
    "lower_loop_size", "upper_loop_openness", "lower_loop_openness",
    "upper_zone_development", "lower_zone_development", "t_bar_height",
    "t_bar_length", "t_bar_direction", "i_dot_shape", "i_dot_height",
    "i_dot_offset", "o_formation", "a_formation",
}
_PAGE_BOUNDARY_FEATURES = {
    "left_margin", "right_margin", "top_margin", "bottom_margin",
    "margin_consistency", "page_utilization",
}


class ImageAssessment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_quality: Literal["excellent", "good", "fair", "poor", "unknown"]
    handwriting_visibility: Literal["high", "medium", "low", "none", "unknown"]
    resolution: Literal["adequate", "limited", "poor", "unknown"]
    orientation: Literal[
        "upright", "rotated_90", "rotated_180", "rotated_270", "skewed", "unknown"
    ]
    cropping: Literal["complete", "partial", "severe", "unknown"]
    page_boundaries: Literal["visible", "partially_visible", "not_visible", "unknown"]
    script: Literal[
        "latin", "devanagari", "arabic", "cyrillic", "other", "mixed", "unknown"
    ]
    sample_sufficiency: Literal["adequate", "limited", "insufficient", "unknown"]


class Evidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
    supporting_letters: list[str]
    coverage: Literal[
        "single_letter", "single_word", "multiple_words", "single_line",
        "multiple_lines", "page_level", "insufficient", "not_applicable",
    ]


class Observation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_id: str
    category: str
    feature_name: str
    observed_value: str
    confidence: Literal["high", "medium", "low"]
    assessability: Literal["assessable", "partially_assessable", "not_assessable"]
    evidence: Evidence


class SummaryItem(BaseModel):
    """A cautious interpretation tied to one or more visible observations."""

    title: str
    description: str
    evidence: list[str]
    confidence: Literal["high", "medium", "low"]


class MethodConfidence(BaseModel):
    method: str
    confidence: str
    limitations: list[str]


class ActionPlanItem(BaseModel):
    title: str
    action: str
    reason: str
    timeframe: str


class ShareableResultCard(BaseModel):
    headline: str
    supporting_line: str
    highlights: list[str]
    call_to_action: str


class ProfileDimension(BaseModel):
    key: str
    label: str
    score: int
    essence: str
    strength: str
    blind_spot: str
    next_move: str
    evidence: list[str]
    confidence: str
    core_style: str
    growth_shift: str
    mindful_action: str
    cue_note: str


class ProfileSnapshot(BaseModel):
    overall_score: int
    archetype: str
    archetype_tagline: str
    one_line_profile: str
    dimensions: list[ProfileDimension]
    strongest_focus: str
    growth_focus: str


class ReportSummary(BaseModel):
    """Reader-friendly summary derived from the evidence-backed observations."""

    top_strengths: list[SummaryItem]
    potential_blind_spots: list[SummaryItem]
    you_may_be_someone_who: list[str]
    method_confidence: MethodConfidence
    personalized_30_day_plan: list[ActionPlanItem] = Field(default_factory=list)
    shareable_result_card: ShareableResultCard | None = None


class HandwritingObservationReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["2.0", "2.1"]
    image_assessment: ImageAssessment
    observations: list[Observation]
    report_summary: ReportSummary | None = None
    profile_snapshot: ProfileSnapshot | None = None

    @model_validator(mode="after")
    def validate_observations(self):
        ids = [observation.feature_id for observation in self.observations]
        if len(ids) != 70 or set(ids) != set(FEATURES):
            raise ValueError("observations must contain each of the 70 features exactly once")

        for observation in self.observations:
            spec = FEATURES[observation.feature_id]
            if (
                observation.category != spec["category"]
                or observation.feature_name != spec["feature_name"]
                or observation.observed_value not in spec["allowed_values"]
            ):
                raise ValueError(f"invalid metadata or value for {observation.feature_id}")
            if observation.observed_value == "unknown":
                if observation.confidence != "low":
                    raise ValueError(f"unknown {observation.feature_id} must have low confidence")
                if observation.assessability == "assessable":
                    raise ValueError(f"unknown {observation.feature_id} cannot be assessable")
                if observation.evidence.coverage not in ("insufficient", "not_applicable"):
                    raise ValueError(f"unknown {observation.feature_id} needs insufficient evidence")
            if observation.assessability == "not_assessable":
                special_values = ("unknown", "indeterminate", "not_assessable")
                if observation.observed_value not in special_values:
                    raise ValueError(f"not-assessable {observation.feature_id} needs an allowed unknown value")
            if observation.assessability == "partially_assessable" and observation.confidence == "high":
                raise ValueError(f"partially assessable {observation.feature_id} cannot have high confidence")
        return self


def _unknown_observation(feature_id: str) -> dict:
    spec = FEATURES[feature_id]
    value = "indeterminate" if feature_id == "apparent_writing_speed" else (
        "not_assessable" if feature_id == "pen_lift_evidence" else "unknown"
    )
    return {
        "feature_id": feature_id,
        "category": spec["category"],
        "feature_name": spec["feature_name"],
        "observed_value": value,
        "confidence": "low",
        "assessability": "not_assessable",
        "evidence": {
            "description": "There is insufficient visible evidence to evaluate this feature reliably.",
            "supporting_letters": [],
            "coverage": "insufficient",
        },
    }


def unknown_report() -> HandwritingObservationReport:
    return HandwritingObservationReport(
        schema_version="2.0",
        image_assessment={
            "image_quality": "unknown",
            "handwriting_visibility": "unknown",
            "resolution": "unknown",
            "orientation": "unknown",
            "cropping": "unknown",
            "page_boundaries": "unknown",
            "script": "unknown",
            "sample_sufficiency": "unknown",
        },
        observations=[_unknown_observation(feature_id) for feature_id in FEATURES],
    )


def _feature_prompt() -> str:
    lines = []
    for category, rows in _CATEGORY_ROWS:
        lines.append(f"{CATEGORY_NAMES[category]} ({category}):")
        for row in rows:
            feature_id = row.split("|", 1)[0]
            spec = FEATURES[feature_id]
            letters = ", ".join(_LETTERS[feature_id])
            values = ", ".join(spec["allowed_values"])
            lines.append(
                f"- {feature_id} ({spec['feature_name']}): {_DEFINITIONS[feature_id]}; "
                f"values [{values}]; dependency: {_MINIMUM_EVIDENCE[feature_id]}; "
                f"inspect {letters} when relevant."
            )
    return "\n".join(lines)


_VISION_PROMPT = f"""
Examine the entire supplied image and return exactly one JSON object with only these
top-level keys: schema_version, image_assessment, observations. This is a visual
handwriting observation task only. Do not infer personality, psychology, health,
identity, or intent. Do not include recommendations or interpretation.

Set schema_version to "2.0". image_assessment must contain exactly:
image_quality (excellent/good/fair/poor/unknown),
handwriting_visibility (high/medium/low/none/unknown),
resolution (adequate/limited/poor/unknown),
orientation (upright/rotated_90/rotated_180/rotated_270/skewed/unknown),
cropping (complete/partial/severe/unknown),
page_boundaries (visible/partially_visible/not_visible/unknown),
script (latin/devanagari/arabic/cyrillic/other/mixed/unknown), and
sample_sufficiency (adequate/limited/insufficient/unknown).
Before observations, assess clarity, resolution, visibility, orientation, cropping,
lighting/contrast, background interference, page boundaries, quantity, handwriting
versus print, multiple styles, and scripts. Do not mistake print or image artifacts
for handwriting. Do not infer pressure from darkness or actual speed/pen lifts from
a static image. Do not estimate margins without visible page boundaries.

Return exactly 70 observations, one for each listed feature, with fields:
feature_id, category, feature_name, observed_value, confidence, assessability,
evidence. Evidence has description, supporting_letters (array), and coverage
(single_letter/single_word/multiple_words/single_line/multiple_lines/page_level/
insufficient/not_applicable). Use only values listed for each feature.

Apply the minimum evidence for each feature before observing it. If evidence is
insufficient or a required letter/page boundary is missing, use unknown (or the
feature's indeterminate/not_assessable value where appropriate), confidence low,
assessability partially_assessable or not_assessable, and coverage insufficient.
Every unknown observation must have low confidence. Never guess, invent strokes,
coordinates, writing speed, or pen lifts. Confidence is visual reliability only.
Use high confidence only when multiple clear examples are consistent; use medium
when evidence is reasonable but mildly ambiguous; use low when evidence is limited,
ambiguous, or affected by image quality. Keep evidence concise and describe only
visible handwriting. Note supporting letters only when actually present. Use
"indeterminate" for apparent_writing_speed when a static image cannot support a
pace estimate; use "not_assessable" for pen_lift_evidence when discontinuities
cannot establish possible lifts.

Feature catalog and minimum evidence:
{_feature_prompt()}
"""


def _image_mime_type(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _normalize_label(value):
    """Normalize harmless model formatting differences before enum validation."""
    if not isinstance(value, str):
        return value
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def extract_handwriting_observations(image_bytes: bytes) -> HandwritingObservationReport:
    """Run one grounded vision extraction and enforce the complete observation contract."""
    request = {
        "model": VISION_MODEL,
        "contents": [
            genai_types.Part.from_bytes(
                data=image_bytes,
                mime_type=_image_mime_type(image_bytes),
            ),
            _VISION_PROMPT,
        ],
        "config": genai_types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            max_output_tokens=16000,
        ),
    }
    try:
        response = get_gemini_client().models.generate_content(**request)
    except RuntimeError as exc:
        # A stale cached SDK client can survive a development reload. Recreate
        # it once so an old closed transport does not turn every result into an
        # error or a fallback report.
        if "client has been closed" not in str(exc).lower():
            raise
        logger.warning("Gemini client transport was closed; recreating it once.")
        get_gemini_client.cache_clear()
        response = get_gemini_client().models.generate_content(**request)
    if not response.text:
        raise RuntimeError("The vision model returned an empty observation response.")

    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip())
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("The vision model returned invalid JSON for handwriting observations.") from exc

    if not isinstance(data, dict):
        raise RuntimeError("The vision model response must be a JSON object.")

    raw_observations = data.get("observations")
    if not isinstance(raw_observations, list):
        raise RuntimeError("The vision model response is missing its observations array.")

    by_id = {}
    for item in raw_observations:
        if isinstance(item, dict) and isinstance(item.get("feature_id"), str):
            feature_id = item["feature_id"]
            if feature_id in FEATURES and feature_id not in by_id:
                by_id[feature_id] = item

    if len(by_id) != 70 or len(raw_observations) != 70:
        logger.warning(
            "Vision output contained %d valid unique features in %d entries; "
            "missing or duplicate features will be marked unknown.",
            len(by_id),
            len(raw_observations),
        )

    normalized = []
    for feature_id, spec in FEATURES.items():
        item = by_id.get(feature_id)
        if item is None:
            normalized.append(_unknown_observation(feature_id))
            continue
        evidence = item.get("evidence")
        value = _normalize_label(item.get("observed_value"))
        if value not in spec["allowed_values"]:
            normalized.append(_unknown_observation(feature_id))
            continue
        if not isinstance(evidence, dict):
            normalized.append(_unknown_observation(feature_id))
            continue
        letters = evidence.get("supporting_letters")
        description = evidence.get("description")
        coverage = _normalize_label(evidence.get("coverage"))
        if (
            not isinstance(description, str)
            or not description.strip()
            or not isinstance(letters, list)
            or any(not isinstance(letter, str) or not letter.strip() for letter in letters)
            or coverage not in _COVERAGE_VALUES
        ):
            normalized.append(_unknown_observation(feature_id))
            continue

        observation_value = value
        confidence = _normalize_label(item.get("confidence"))
        assessability = _normalize_label(item.get("assessability"))
        if observation_value == "unknown":
            confidence = "low"
            assessability = "not_assessable"
            coverage = "insufficient"
        elif observation_value in ("indeterminate", "not_assessable"):
            confidence = "low"
            assessability = "not_assessable"
            coverage = "insufficient"
        elif assessability == "not_assessable":
            normalized.append(_unknown_observation(feature_id))
            continue

        try:
            normalized.append(Observation.model_validate({
                **item,
                "feature_id": feature_id,
                "category": spec["category"],
                "feature_name": spec["feature_name"],
                "observed_value": observation_value,
                "confidence": confidence,
                "assessability": assessability,
                "evidence": {
                    "description": description.strip(),
                    "supporting_letters": list(dict.fromkeys(letters)),
                    "coverage": coverage,
                },
            }).model_dump())
        except Exception as exc:
            logger.warning("Invalid observation for %s; marking unknown: %s", feature_id, exc)
            normalized.append(_unknown_observation(feature_id))

    image_assessment = data.get("image_assessment")
    try:
        image_assessment = ImageAssessment.model_validate(image_assessment).model_dump()
    except Exception as exc:
        logger.warning("Invalid image assessment; using unknown values: %s", exc)
        image_assessment = unknown_report().image_assessment.model_dump()

    unavailable_features = set()
    if image_assessment["handwriting_visibility"] == "none":
        unavailable_features.update(FEATURES)
    if image_assessment["script"] not in ("latin", "mixed", "unknown"):
        unavailable_features.update(_LATIN_LETTER_FEATURES)
    if image_assessment["page_boundaries"] in ("not_visible", "unknown"):
        unavailable_features.update(_PAGE_BOUNDARY_FEATURES)
    normalized = [
        _unknown_observation(item["feature_id"])
        if item["feature_id"] in unavailable_features
        else item
        for item in normalized
    ]

    payload = {
        "schema_version": "2.0",
        "image_assessment": image_assessment,
        "observations": normalized,
    }
    try:
        return HandwritingObservationReport.model_validate(payload)
    except Exception as exc:
        raise RuntimeError("The vision response could not be normalized to the 70-feature schema.") from exc
