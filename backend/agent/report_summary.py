"""Build the reader-friendly report sections from normalized observations.

This module is intentionally deterministic. It never invents a cue: a summary
item is emitted only when its source observation is visible and assessable.
"""

from .observations import (
    ActionPlanItem,
    HandwritingObservationReport,
    Observation,
    ReportSummary,
    ShareableResultCard,
    SummaryItem,
)


def _usable(observation: Observation) -> bool:
    return observation.observed_value not in {"unknown", "indeterminate", "not_assessable"}


def _confidence(observation: Observation) -> str:
    return observation.confidence


def _evidence(observation: Observation) -> list[str]:
    cue = f"{observation.feature_name}: {observation.observed_value.replace('_', ' ')}"
    return [cue, observation.evidence.description]


def _item(title: str, description: str, observation: Observation) -> SummaryItem:
    return SummaryItem(
        title=title,
        description=description,
        evidence=_evidence(observation),
        confidence=_confidence(observation),
    )


def build_report_summary(report: HandwritingObservationReport) -> ReportSummary:
    by_id = {item.feature_id: item for item in report.observations}

    strength_rules = [
        ("legibility", {"very_legible", "legible"}, "Clear expression", "You may have a natural preference for making your ideas understandable and easy to follow."),
        ("overall_regularity", {"highly_consistent", "consistent"}, "Steady follow-through", "You may be someone who builds trust through consistency and dependable habits."),
        ("spatial_organization", {"highly_ordered", "ordered"}, "Practical organization", "You may be someone who likes structure, visible order, and a clear sense of what comes next."),
        ("stroke_flow", {"flowing", "mostly_flowing"}, "Natural momentum", "You may be able to keep ideas and actions moving without over-stopping to revise every step."),
        ("letter_connectivity", {"fully_connected", "mostly_connected"}, "Connecting the dots", "You may be someone who links information quickly and sees relationships between ideas."),
        ("baseline_direction", {"straight", "slightly_ascending"}, "Grounded optimism", "You may bring a steady or quietly forward-looking energy to everyday situations."),
        ("spacing_consistency", {"high"}, "Balanced boundaries", "You may be attentive to rhythm, boundaries, and making room for the important things."),
        ("letter_formation_consistency", {"high"}, "Reliable standards", "You may care about doing things in a way that feels coherent and recognizably your own."),
    ]
    blind_spot_rules = [
        ("overall_regularity", {"highly_irregular"}, "Variable follow-through", "When circumstances change, consistency may take more effort than usual."),
        ("spatial_organization", {"disorganized"}, "Too many open loops", "A busy mind or competing priorities may occasionally make it harder to choose a clean next step."),
        ("interword_spacing", {"very_narrow", "narrow"}, "Crowding your bandwidth", "You may sometimes move quickly enough that rest, distance, or reflection gets squeezed out."),
        ("interword_spacing", {"wide", "very_wide"}, "Holding too much distance", "You may sometimes create more distance than intended when protecting your space or processing a thought."),
        ("stroke_flow", {"interrupted", "fragmented"}, "Stop-start energy", "You may occasionally lose momentum when a task becomes uncertain or emotionally loaded."),
        ("slant_variability", {"high"}, "Shifting signals", "Your response style may change with the situation, which can feel adaptive internally but less predictable to others."),
        ("letter_connectivity", {"mostly_disconnected", "fully_disconnected"}, "Keeping ideas separate", "You may prefer careful, self-contained thinking, though it can sometimes slow collaboration or spontaneity."),
    ]

    def matching(rules):
        results = []
        for feature_id, values, title, description in rules:
            observation = by_id.get(feature_id)
            if observation and _usable(observation) and observation.observed_value in values:
                results.append(_item(title, description, observation))
        return results

    strengths = matching(strength_rules)[:5]
    blind_spots = matching(blind_spot_rules)[:5]

    may_be = []
    for item in strengths[:3]:
        may_be.append(item.description)
    if not may_be:
        may_be = [
            "You may be someone whose strongest patterns need a clearer or more complete handwriting sample before they can be described responsibly."
        ]

    assessable = [item for item in report.observations if item.assessability != "not_assessable"]
    high_confidence = [item for item in assessable if item.confidence == "high"]
    if len(assessable) >= 45 and len(high_confidence) >= 15:
        confidence = "Good visual coverage"
    elif len(assessable) >= 25:
        confidence = "Moderate visual coverage"
    else:
        confidence = "Limited visual coverage"

    plan = []
    for item in blind_spots[:3]:
        plan.append(ActionPlanItem(
            title=f"Work with {item.title.lower()}",
            action=f"For the next 10 days, pause once each day to name the priority, the next smallest action, and what can wait.",
            reason=item.description,
            timeframe="Days 1–10",
        ))
    plan.extend([
        ActionPlanItem(
            title="Use your strongest pattern deliberately",
            action="Choose one strength from this report and apply it to a meaningful task three times each week.",
            reason="A visible strength becomes more useful when it is practiced intentionally rather than treated as a fixed label.",
            timeframe="Days 11–20",
        ),
        ActionPlanItem(
            title="Review and adjust",
            action="At the end of the month, write three lines about what created momentum, what created friction, and one change to carry forward.",
            reason="Reflection helps separate a durable pattern from a temporary mood or writing context.",
            timeframe="Days 21–30",
        ),
    ])

    return ReportSummary(
        top_strengths=strengths,
        potential_blind_spots=blind_spots,
        you_may_be_someone_who=may_be,
        method_confidence= {
            "method": "A structured visual reading of 70 handwriting features, using only visible letter forms, spacing, alignment, stroke, and page-layout cues.",
            "confidence": confidence,
            "limitations": [
                "This is a reflective interpretation, not a scientific or psychological assessment.",
                "A static image cannot establish actual writing speed, physical pen pressure, or confirmed pen lifts.",
                "Unknown or weakly supported features are excluded rather than guessed.",
            ],
        },
        personalized_30_day_plan=plan[:5],
        shareable_result_card=ShareableResultCard(
            headline="Your handwriting has a pattern worth noticing.",
            supporting_line="A reflective snapshot of the visible habits in this sample.",
            highlights=[item.title for item in strengths[:3]] or ["More evidence is needed for a reliable highlight."],
            call_to_action="Keep the full report as a reflection tool, and revisit the 30-day plan after practicing it.",
        ),
    )
