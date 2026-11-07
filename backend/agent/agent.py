"""Direct image-to-observation pipeline."""

import logging

from .observations import HandwritingObservationReport, extract_handwriting_observations

logger = logging.getLogger(__name__)


async def run_graphology_pipeline(image_bytes: bytes) -> HandwritingObservationReport:
    """Extract the complete, evidence-based handwriting observation payload."""
    logger.info("Starting 70-feature handwriting observation extraction.")
    report = extract_handwriting_observations(image_bytes)
    logger.info(
        "Observation extraction complete: %d features, %d assessable.",
        len(report.observations),
        sum(item.assessability != "not_assessable" for item in report.observations),
    )
    return report
