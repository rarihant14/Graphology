"""
extended_rules.py — interpretation rules and dimension-score contributions for
the additional handwriting features (t-bars, i-dots, line spacing, speed, ...).

Merged into rule_engine.GRAPHOLOGY_RULES and dimension_scoring.DIMENSION_RULES
at import time, so those modules stay the single lookup point.
"""

EXTRA_RULES: dict[str, dict[str, str]] = {
    "t_bar_position": {
        "high": "may suggest high goals, idealism, and a strong drive to aim above the ordinary",
        "middle": "is often associated with realistic goals and steady, balanced self-confidence",
        "low": "could indicate modesty, caution, or lower self-expectation in pursuing goals",
    },
    "t_bar_length": {
        "short": "may suggest reserved willpower or a tendency to hold back energy and enthusiasm",
        "medium": "is often associated with measured determination and dependable follow-through",
        "long": "could indicate strong willpower, enthusiasm, and a forceful drive toward goals",
    },
    "i_dot": {
        "round": "may suggest a playful, creative, or somewhat youthful disposition",
        "high": "could indicate imagination, idealism, or a tendency to aim for lofty ideas",
        "close": "is often associated with attention to detail, organisation, and careful thinking",
        "dash": "may suggest impatience, energy, or a quick, impulsive working style",
        "absent": "could indicate haste, absent-mindedness, or a relaxed attitude toward detail",
    },
    "line_spacing": {
        "narrow": "may suggest a need to use time and space economically, or a crowded, busy mind",
        "normal": "is often associated with clear thinking and well-organised priorities",
        "wide": "could indicate a need for clarity and independence, or a preference for keeping perspective",
    },
    "writing_speed": {
        "slow": "may suggest deliberateness, caution, and a careful, controlled approach to tasks",
        "moderate": "is often associated with a balanced pace between thought and action",
        "fast": "could indicate quick thinking, impatience, or an energetic, spontaneous nature",
    },
    "letter_form": {
        "rounded": "may suggest a gentle, receptive, and diplomatic temperament with artistic leanings",
        "angular": "could indicate a firm, analytical, and determined character with strong personal standards",
        "mixed": "is often associated with adaptability, drawing on both empathy and firmness as needed",
    },
    "regularity": {
        "consistent": "may suggest dependability, self-discipline, and emotional steadiness over time",
        "irregular": "could indicate changeable moods, spontaneity, or difficulty sustaining a consistent rhythm",
    },
    "ending_strokes": {
        "abrupt": "may suggest decisiveness, reserve, or a tendency to close conversations and matters cleanly",
        "tapering": "could indicate tact, diplomacy, or a tendency to avoid confrontation",
        "extended": "is often associated with generosity, a wish to connect, or a forward-reaching outlook",
    },
    "capital_size": {
        "small": "may suggest modesty or a lower need for self-display",
        "medium": "is often associated with a healthy, proportionate sense of self-worth",
        "large": "could indicate pride, confidence, or a strong wish for recognition",
    },
    "zone_emphasis": {
        "upper": "may suggest a focus on ideas, aspirations, and intellectual or spiritual interests",
        "middle": "is often associated with a focus on everyday matters, social life, and the present",
        "lower": "could indicate emphasis on physical drives, material concerns, and practical instincts",
        "balanced": "may suggest a well-integrated balance between thought, daily life, and instinct",
    },
    "stroke_quality": {
        "smooth": "is often associated with physical ease, calm nerves, and self-assurance",
        "tremulous": "could indicate tension, fatigue, or nervousness at the time of writing (or simply writing conditions)",
    },
}

# Dimension -> feature -> observed value -> 0-100 sub-score (merged into DIMENSION_RULES).
EXTRA_DIMENSION_RULES: dict[str, dict[str, dict[str, int]]] = {
    "emotional_balance": {
        "regularity": {"consistent": 85, "irregular": 45},
        "stroke_quality": {"smooth": 80, "tremulous": 40},
        "letter_form": {"rounded": 75, "angular": 60, "mixed": 70},
    },
    "thinking_learning": {
        "i_dot": {"close": 80, "round": 65, "high": 65, "dash": 60, "absent": 45},
        "zone_emphasis": {"upper": 75, "middle": 70, "lower": 55, "balanced": 80},
        "line_spacing": {"narrow": 55, "normal": 80, "wide": 70},
    },
    "health_vitality": {
        "writing_speed": {"slow": 55, "moderate": 70, "fast": 80},
        "stroke_quality": {"smooth": 75, "tremulous": 40},
    },
    "goals_achievement": {
        "t_bar_position": {"high": 80, "middle": 75, "low": 50},
        "t_bar_length": {"short": 50, "medium": 70, "long": 85},
        "ending_strokes": {"abrupt": 75, "tapering": 55, "extended": 70},
    },
    "relationships": {
        "letter_form": {"rounded": 80, "angular": 55, "mixed": 70},
        "ending_strokes": {"abrupt": 50, "tapering": 70, "extended": 80},
        "line_spacing": {"narrow": 60, "normal": 75, "wide": 60},
    },
    "money_mindset": {
        "zone_emphasis": {"upper": 55, "middle": 70, "lower": 75, "balanced": 80},
        "line_spacing": {"narrow": 65, "normal": 75, "wide": 60},
        "regularity": {"consistent": 80, "irregular": 50},
    },
    "personal_growth": {
        "capital_size": {"small": 60, "medium": 75, "large": 60},
        "zone_emphasis": {"upper": 75, "middle": 65, "lower": 55, "balanced": 75},
        "t_bar_position": {"high": 75, "middle": 70, "low": 50},
    },
}
