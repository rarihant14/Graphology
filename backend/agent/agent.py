"""Direct image-to-observation pipeline."""

import logging

from .observations import HandwritingObservationReport, extract_handwriting_observations
from .report_summary import build_report_summary
from .profile import build_profile_snapshot

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
    return HandwritingObservationReport.model_validate({
        **report.model_dump(),
        "schema_version": "2.1",
        "report_summary": build_report_summary(report).model_dump(),
        "profile_snapshot": build_profile_snapshot(report).model_dump(),
    })
