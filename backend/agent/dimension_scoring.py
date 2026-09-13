"""
dimension_scoring.py — Deterministic scoring layer that turns extracted
HandwritingFeatures + rule_engine interpretations into a 7-dimension life
profile (Money Mindset, Health & Vitality, Thinking & Learning, Relationships,
Goals & Achievement, Emotional Balance, Personal & Inner Growth).

Design goal — accuracy and auditability:
  - Every score is a plain average of hand-authored, 0-100 lookup values keyed
    by the *actual observed* feature value. No LLM involvement in scoring.
  - Every "why we see it" evidence line is the interpretation string that
    rule_engine.apply_rules() already produced for that feature — never
    invented here, just organised and attributed per dimension.
  - A feature reported as "unknown" (the vision model couldn't extract it)
    contributes a neutral 50 and is never cited as evidence — we do not
    claim evidence for something that wasn't observed.

No external dependencies beyond the project's own models module.
"""

from models import HandwritingFeatures

# ---------------------------------------------------------------------------
# Dimension keys and display labels
# ---------------------------------------------------------------------------

DIMENSION_LABELS: dict[str, str] = {
    "emotional_balance": "Emotional Balance",
    "thinking_learning": "Thinking & Learning",
    "health_vitality": "Health & Vitality",
    "goals_achievement": "Goals & Achievement",
    "relationships": "Relationships",
    "money_mindset": "Money Mindset",
    "personal_growth": "Personal & Inner Growth",
}

# ---------------------------------------------------------------------------
# Dimension → contributing feature → observed value → 0-100 sub-score
# Value vocabulary matches rule_engine.GRAPHOLOGY_RULES exactly.
# ---------------------------------------------------------------------------

DIMENSION_RULES: dict[str, dict[str, dict[str, int]]] = {

    "emotional_balance": {
        "pressure": {"light": 55, "medium": 80, "heavy": 65, "very heavy": 50, "variable": 45},
        "slant": {"right": 75, "left": 55, "upright": 85, "vertical": 85, "mixed": 50, "far right": 55, "far left": 45},
        "baseline": {"straight": 90, "ascending": 70, "descending": 45, "wavy": 55, "irregular": 40, "convex": 55, "concave": 60},
    },

    "thinking_learning": {
        "letter_size": {"small": 80, "medium": 75, "large": 60, "very large": 55, "variable": 55},
        "connectivity": {"connected": 80, "disconnected": 65, "mixed": 75, "partially connected": 75},
        "legibility": {"very legible": 85, "moderately legible": 70, "illegible": 45, "variable": 55, "stylised": 65},
    },

    "health_vitality": {
        "pressure": {"light": 50, "medium": 70, "heavy": 80, "very heavy": 75, "variable": 55},
        "loop_style": {
            "large lower loops": 80, "inflated lower loops": 75, "small lower loops": 55,
            "large upper loops": 65, "small upper loops": 55, "loopless": 50,
            "narrow loops": 50, "variable": 55,
        },
        "connectivity": {"connected": 70, "disconnected": 60, "mixed": 65, "partially connected": 65},
    },

    "goals_achievement": {
        "letter_spacing": {"narrow": 60, "normal": 75, "wide": 70, "very wide": 50, "variable": 50},
        "baseline": {"straight": 80, "ascending": 85, "descending": 45, "wavy": 60, "irregular": 45, "convex": 55, "concave": 65},
        "connectivity": {"connected": 80, "disconnected": 55, "mixed": 70, "partially connected": 70},
    },

    "relationships": {
        "slant": {"right": 80, "left": 55, "upright": 65, "vertical": 65, "mixed": 60, "far right": 60, "far left": 45},
        "word_spacing": {"narrow": 70, "normal": 80, "wide": 55, "very wide": 40, "variable": 55},
        "connectivity": {"connected": 75, "disconnected": 55, "mixed": 70, "partially connected": 70},
    },

    "money_mindset": {
        "letter_spacing": {"narrow": 60, "normal": 75, "wide": 65, "very wide": 50, "variable": 50},
        "margin_usage": {
            "wide left": 55, "narrow left": 65, "wide right": 50, "narrow right": 65,
            "balanced": 80, "no margins": 45, "increasing left": 65, "decreasing left": 55,
        },
        "pressure": {"light": 55, "medium": 75, "heavy": 65, "very heavy": 55, "variable": 50},
    },

    "personal_growth": {
        "baseline": {"straight": 70, "ascending": 65, "descending": 50, "wavy": 55, "irregular": 45, "convex": 55, "concave": 60},
        "loop_style": {
            "large upper loops": 75, "small upper loops": 55, "large lower loops": 60,
            "small lower loops": 55, "inflated lower loops": 55, "loopless": 55,
            "narrow loops": 45, "variable": 50,
        },
        "legibility": {"very legible": 70, "moderately legible": 65, "illegible": 50, "variable": 50, "stylised": 65},
    },
}

# ---------------------------------------------------------------------------
# Band-based static copy — high (>=70) / medium (40-69) / low (<40).
# Deliberately not LLM-generated: this is the "personality" wording, but the
# personalisation that matters (score + evidence) is computed, not written.
# ---------------------------------------------------------------------------

DIMENSION_COPY: dict[str, dict[str, dict[str, str]]] = {

    "emotional_balance": {
        "high": {
            "essence": "You may bring notable steadiness and warmth to how you handle feelings and close relationships.",
            "strength": "Your strength may be staying composed while still noticing what people around you need.",
            "blind_spot": "When overused, steadiness can tip into carrying other people's emotions as your own responsibility.",
            "next_move": "Name what you feel, pause, then choose the response that is actually yours to make.",
        },
        "medium": {
            "essence": "You may handle emotions in a fairly balanced way, with some situations testing your composure more than others.",
            "strength": "Your strength may be adapting your emotional response to what a given moment actually needs.",
            "blind_spot": "Under real pressure, that balance could tip toward either over-control or a stronger reaction than usual.",
            "next_move": "Notice which situations most often unbalance you, and prepare one steadying habit for those.",
        },
        "low": {
            "essence": "Your profile suggests feelings may be intense or hard to predict in the moment.",
            "strength": "Your strength may be depth of feeling and honesty about what is actually going on for you.",
            "blind_spot": "Strong reactions can arrive before there is time to choose a considered response.",
            "next_move": "Build in a short pause — even one slow breath — before responding when emotions run high.",
        },
    },

    "thinking_learning": {
        "high": {
            "essence": "You tend to take in information carefully and think things through with real depth.",
            "strength": "Your strength may be combining logic, curiosity and practical judgement.",
            "blind_spot": "Careful thinking can become delay when every option must feel fully resolved before you act.",
            "next_move": "For real decisions, write: facts → options → next step. Then move.",
        },
        "medium": {
            "essence": "You may process information steadily, without a strong pull toward either fast instinct or deep analysis.",
            "strength": "Your strength may be flexibility — you can lean analytical or intuitive depending on what a task needs.",
            "blind_spot": "Without a clear default mode, decisions can sometimes drift rather than resolve.",
            "next_move": "Pick one simple rule for how you decide things, and default to it when unsure.",
        },
        "low": {
            "essence": "Your profile suggests a more intuitive, in-the-moment style of taking things in.",
            "strength": "Your strength may be quick, instinctive reads on a situation.",
            "blind_spot": "Fast conclusions can miss details that only show up with slower, careful review.",
            "next_move": "For anything important, give yourself one extra pass before deciding.",
        },
    },

    "health_vitality": {
        "high": {
            "essence": "The pattern suggests a natural pull toward movement, activity and energetic engagement.",
            "strength": "Your strength may be bringing energy and physical drive into what you do.",
            "blind_spot": "Energy can be spent faster than it is restored.",
            "next_move": "Build one repeatable movement or recovery habit and judge it by consistency, not intensity.",
        },
        "medium": {
            "essence": "Your profile suggests a moderate, situational relationship with activity and physical energy.",
            "strength": "Your strength may be pacing yourself rather than swinging between extremes.",
            "blind_spot": "Without a routine, activity levels can depend too heavily on mood or circumstance.",
            "next_move": "Anchor one small physical habit to a fixed time of day.",
        },
        "low": {
            "essence": "The pattern suggests energy may currently be more reserved or inward-directed.",
            "strength": "Your strength may be conserving energy for what matters most to you.",
            "blind_spot": "Low activity can quietly compound into low energy over time.",
            "next_move": "Start smaller than feels necessary — a short walk counts as a repeatable habit.",
        },
    },

    "goals_achievement": {
        "high": {
            "essence": "You approach goals with a steady style, using planning and persistence to move forward.",
            "strength": "Your strength may be staying calm while gathering information and keeping moving through change.",
            "blind_spot": "You may occasionally take on too much at once, making prioritisation harder under load.",
            "next_move": "For every important goal, define one next step, three must-do details, and one decision you own.",
        },
        "medium": {
            "essence": "Your profile suggests steady but situational follow-through on goals.",
            "strength": "Your strength may be adapting your pace to what a goal actually requires.",
            "blind_spot": "Momentum can stall when a goal feels ambiguous or the payoff is far away.",
            "next_move": "Break your current goal into one action you can finish today.",
        },
        "low": {
            "essence": "The pattern suggests goals may currently feel broad or hard to convert into steady action.",
            "strength": "Your strength may be openness to changing direction when something isn't working.",
            "blind_spot": "Without a narrow focus, effort can spread thin across too many priorities.",
            "next_move": "Pick one goal, drop the rest for now, and commit to a single next step.",
        },
    },

    "relationships": {
        "high": {
            "essence": "You tend to bring a warm, engaged presence to relationships, valuing connection and trust.",
            "strength": "Your strength may be creating trust through openness and genuine interest in others.",
            "blind_spot": "Warmth can sometimes make direct disagreement uncomfortable.",
            "next_move": "Before responding to a sensitive topic, ask yourself: \"what is another possibility?\"",
        },
        "medium": {
            "essence": "Your profile suggests a measured, situational approach to closeness and connection.",
            "strength": "Your strength may be adjusting how open you are depending on who you're with.",
            "blind_spot": "That caution can occasionally read as distance to people who want more openness.",
            "next_move": "Pick one relationship where you could share a little more than usual this week.",
        },
        "low": {
            "essence": "The pattern suggests a more reserved or independent style in relationships.",
            "strength": "Your strength may be comfort with solitude and clear personal boundaries.",
            "blind_spot": "Reserve can be read by others as disinterest, even when that isn't the intent.",
            "next_move": "Let one person know, in a single sentence, that you value the connection.",
        },
    },

    "money_mindset": {
        "high": {
            "essence": "Your profile suggests a fairly grounded, practical relationship with money.",
            "strength": "Your strength may be balancing security with a willingness to make timely decisions.",
            "blind_spot": "Confidence with money can occasionally tip into under-reviewing regular spending.",
            "next_move": "Automate one saving habit and review expenses on a fixed weekly schedule.",
        },
        "medium": {
            "essence": "The pattern suggests a cautious relationship with money, with some hesitation around bigger decisions.",
            "strength": "Your strength may be a preference for security over risk.",
            "blind_spot": "Avoiding a financial decision can become a decision of its own.",
            "next_move": "Automate a manageable monthly saving amount and keep the habit simple enough to sustain.",
        },
        "low": {
            "essence": "The pattern suggests money decisions may currently carry more hesitation or emotional weight than usual.",
            "strength": "Your strength may be taking financial choices seriously rather than treating them casually.",
            "blind_spot": "Waiting for perfect confidence can delay useful action just as much as impulsiveness can.",
            "next_move": "Start with one small, repeatable money habit rather than a full financial overhaul.",
        },
    },

    "personal_growth": {
        "high": {
            "essence": "You may have a clear, structured relationship with your own inner reflection and growth.",
            "strength": "Your strength may be turning reflection into deliberate, repeatable action.",
            "blind_spot": "Structure can tip into rigidity if a plan is followed past the point it's still useful.",
            "next_move": "Keep reviewing what's working every 30 days, and let the plan change with you.",
        },
        "medium": {
            "essence": "Your profile suggests an inner world that is active but not always easy to act on consistently.",
            "strength": "Your strength may be genuine self-awareness, even when it doesn't yet translate to action.",
            "blind_spot": "Reflection without a next step can start to feel like standing still.",
            "next_move": "Turn one recurring thought into a single small experiment this week.",
        },
        "low": {
            "essence": "This is likely your biggest growth opportunity: a deep inner world that can be harder to access clearly when thoughts turn heavy or repetitive.",
            "strength": "Your strength may be depth — you don't take your own experience at face value.",
            "blind_spot": "Self-analysis can become circular when it isn't paired with a decision or experiment.",
            "next_move": "Choose one small action outside your comfort zone each week and review what you learn.",
        },
    },
}

# ---------------------------------------------------------------------------
# Archetypes — deterministic, keyed by the single highest-scoring dimension.
# ---------------------------------------------------------------------------

ARCHETYPES: dict[str, dict[str, str]] = {
    "emotional_balance": {"name": "The Steady Heart", "tagline": "Calm, caring, and hard to rattle."},
    "thinking_learning": {"name": "The Strategist", "tagline": "Thinks it through before moving."},
    "health_vitality": {"name": "The Dynamo", "tagline": "Runs on movement and momentum."},
    "goals_achievement": {"name": "The Achiever", "tagline": "Persistent once truly committed."},
    "relationships": {"name": "The Connector", "tagline": "Builds trust through warmth and presence."},
    "money_mindset": {"name": "The Planner", "tagline": "Cautious, deliberate, security-minded."},
    "personal_growth": {"name": "The Seeker", "tagline": "Reflective, and still finding its footing."},
}

_INSUFFICIENT_MARKER = "insufficient handwriting data"


def _band(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def compute_dimension_scores(
    features: HandwritingFeatures,
    interpretations: dict[str, str],
) -> list[dict]:
    """
    Compute a scored, evidence-backed result for every dimension.

    Each result is a plain dict matching the models.DimensionScore fields, so
    callers can construct `DimensionScore(**result)` directly.
    """
    results: list[dict] = []

    for dimension_key, feature_rules in DIMENSION_RULES.items():
        sub_scores: list[int] = []
        evidence: list[str] = []

        for feature_name, value_scores in feature_rules.items():
            observed = (getattr(features, feature_name, "unknown") or "unknown").strip().lower()
            if observed == "unknown":
                continue

            sub_scores.append(value_scores.get(observed, 50))

            interpretation = interpretations.get(feature_name, "")
            if interpretation and _INSUFFICIENT_MARKER not in interpretation.lower():
                label = feature_name.replace("_", " ").title()
                evidence.append(f"{label} — observed \"{observed}\": {interpretation}")

        score = round(sum(sub_scores) / len(sub_scores)) if sub_scores else 50
        copy = DIMENSION_COPY[dimension_key][_band(score)]

        results.append({
            "key": dimension_key,
            "label": DIMENSION_LABELS[dimension_key],
            "score": score,
            "essence": copy["essence"],
            "evidence": evidence or [
                "Not enough clearly observed handwriting cues for this dimension yet — score shown is neutral."
            ],
            "strength": copy["strength"],
            "blind_spot": copy["blind_spot"],
            "next_move": copy["next_move"],
            "confidence": "high" if len(sub_scores) >= 2 else "low",
        })

    return results


def compute_overall_score(dimension_results: list[dict]) -> int:
    if not dimension_results:
        return 50
    return round(sum(r["score"] for r in dimension_results) / len(dimension_results))


def pick_archetype(dimension_results: list[dict]) -> dict:
    if not dimension_results:
        key = "personal_growth"
    else:
        key = max(dimension_results, key=lambda r: r["score"])["key"]

    info = ARCHETYPES[key]
    return {"key": key, "name": info["name"], "tagline": info["tagline"]}


def compute_confidence_note(features: HandwritingFeatures) -> str:
    field_names = list(features.model_fields)
    observed_count = sum(
        1 for name in field_names
        if (getattr(features, name, "unknown") or "unknown").strip().lower() != "unknown"
    )
    return (
        f"{observed_count} of {len(field_names)} handwriting cues were clearly "
        "observable in your sample."
    )
