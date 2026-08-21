import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from appointments.schemas import AppointmentCreate, AppointmentRead
from database import get_mysql_db, Appointment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post(
    "/",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Book a new appointment",
)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_mysql_db),
):
    appointment = Appointment(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        preferred_datetime=payload.preferred_datetime,
        message=payload.message,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    logger.info(
        "New appointment booked — id=%d email=%s",
        appointment.id,
        appointment.email,
    )
    return appointment