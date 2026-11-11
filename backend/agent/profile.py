"""Connect the 70-feature observation schema to the existing score config."""

from models import HandwritingFeatures
from .dimension_scoring import compute_dimension_scores, compute_overall_score, pick_archetype
from .observations import HandwritingObservationReport, ProfileDimension, ProfileSnapshot


def _value(report: HandwritingObservationReport, feature_id: str) -> str:
    item = next((row for row in report.observations if row.feature_id == feature_id), None)
    return item.observed_value if item else "unknown"


def _map_values(report: HandwritingObservationReport) -> HandwritingFeatures:
    slant = _value(report, "predominant_slant")
    baseline = _value(report, "baseline_direction")
    pressure = _value(report, "ink_darkness")
    letter_form = _value(report, "letter_roundedness")
    regularity = _value(report, "overall_regularity")
    speed = _value(report, "apparent_writing_speed")
    margin_left = _value(report, "left_margin")
    margin_right = _value(report, "right_margin")
    margin = margin_left if margin_left != "unknown" else margin_right
    return HandwritingFeatures(
        letter_size=_value(report, "lowercase_size"),
        slant=("left" if "left" in slant else "right" if "right" in slant else "upright" if slant == "upright" else slant),
        baseline=("ascending" if "ascending" in baseline else "descending" if "descending" in baseline else baseline),
        pressure=("light" if "light" in pressure else "heavy" if "dark" in pressure or "very_dark" in pressure else "medium"),
        letter_spacing=_value(report, "interletter_spacing"),
        word_spacing=_value(report, "interword_spacing"),
        connectivity=_value(report, "letter_connectivity"),
        margin_usage=margin,
        loop_style=_value(report, "upper_loop_size"),
        legibility=_value(report, "legibility"),
        t_bar_position=_value(report, "t_bar_height"),
        t_bar_length=_value(report, "t_bar_length"),
        i_dot=_value(report, "i_dot_shape"),
        line_spacing=_value(report, "interline_spacing"),
        writing_speed=("slow" if "slow" in speed else "fast" if "fast" in speed else "moderate"),
        letter_form=("rounded" if "rounded" in letter_form else "angular" if "angular" in letter_form else letter_form),
        regularity=("consistent" if "consistent" in regularity else "irregular"),
        ending_strokes=_value(report, "terminal_stroke_style"),
        capital_size=_value(report, "capital_size"),
        zone_emphasis=_value(report, "middle_zone_proportion"),
        stroke_quality=_value(report, "stroke_smoothness"),
    )


_CUE_NOTES = {
    "emotional_balance": "Reference cues: u – empathy, I – self-esteem, k – society.",
    "thinking_learning": "Reference cues: h – ambition, l – learning, b – intellect, n – thinking.",
    "goals_achievement": "Reference cues: g – desire, y – money handling, j – saving.",
    "health_vitality": "Reference cues: d – competitive drive, g – stamina, p – talent. Health & Vitality is a lifestyle reflection only.",
    "relationships": "The reading also considers retracement and connection cues where visible.",
    "money_mindset": "The reading also considers pastosity cues where visible; this is not financial advice.",
    "personal_growth": "The reading considers repeated patterns as a prompt for reflection, not a fixed trait.",
}


def _detailed_explanation(item: dict, cue_note: str, growth_shift: str) -> str:
    """Create the shared long-form explanation used by PDF and web reports."""
    evidence = ", ".join(item.get("evidence", [])[:4]) or "limited visible evidence"
    return (
        f"{item['label']} is best understood as a possible pattern of emphasis in this sample, not as a permanent label. "
        f"The profile currently places this dimension at {item['score']} out of 100. That number is a summary of visible "
        f"observations and should be read alongside the plain-language interpretation, the evidence, and the action below. "
        f"The profile suggests that {item['essence'].lower()} This may be useful when you are working in situations that "
        f"reward this tendency, but it may feel different when your purpose, pace, writing tool, environment, or emotional "
        f"state changes. The possible strength is that {item['strength'].lower()} The possible blind spot is that "
        f"{item['blind_spot'].lower()} These are not contradictions; a strength can become unhelpful when it is used "
        f"automatically or without enough flexibility. The suggested growth shift is {growth_shift.lower()} "
        f"A practical next move is {item['next_move'].lower()} You can test this by noticing one real situation where "
        f"the pattern helped, one where it created friction, and one where it was absent. Compare those examples before "
        f"deciding whether the interpretation fits. The visible evidence considered here includes {evidence}. {cue_note} "
        f"Use this explanation as a reflective prompt: keep what gives you a clearer choice, question what feels too broad, "
        f"and remember that a lower score can describe an area for practice or a different context rather than a personal flaw."
    )


def build_profile_snapshot(report: HandwritingObservationReport) -> ProfileSnapshot:
    features = _map_values(report)
    interpretations = {
        item.feature_id: item.evidence.description for item in report.observations
    }
    raw = compute_dimension_scores(features, interpretations, include_personal_growth=True)
    overall = compute_overall_score(raw)
    archetype = pick_archetype(raw)
    dimensions = []
    for item in raw:
        band = "higher" if item["score"] >= 70 else "developing" if item["score"] < 40 else "balanced"
        growth_shift = "Use the strength in this dimension deliberately, while watching for the tendency described as its blind spot."
        dimension_data = {key: value for key, value in item.items() if key != "evidence"}
        dimensions.append(ProfileDimension(
            **dimension_data,
            core_style=f"A {band} pattern in {item['label'].lower()}.",
            growth_shift=growth_shift,
            mindful_action=item["next_move"],
            evidence=item["evidence"][:4],
            cue_note=_CUE_NOTES.get(item["key"], "Visible handwriting cues are summarized in the original observation record."),
            detailed_explanation=_detailed_explanation(
                item,
                _CUE_NOTES.get(item["key"], "Visible handwriting cues are summarized in the original observation record."),
                growth_shift,
            ),
        ))
    ordered = sorted(dimensions, key=lambda item: item.score, reverse=True)
    return ProfileSnapshot(
        overall_score=overall,
        archetype=archetype["name"],
        archetype_tagline=archetype["tagline"],
        one_line_profile=f"{archetype['tagline']} Your strongest signal is {ordered[0].label.lower()}, with {ordered[-1].label.lower()} as a useful growth focus.",
        dimensions=ordered,
        strongest_focus=ordered[0].label,
        growth_focus=ordered[-1].label,
    )
