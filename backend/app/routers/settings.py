from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.services.settings_service import get_hospitals, update_hospitals

router = APIRouter(tags=["settings"])


class HospitalsUpdateRequest(BaseModel):
    adminName: str
    hospitals: List[str]


@router.get("/settings/hospitals")
def api_get_hospitals():
    return get_hospitals()


@router.post("/settings/hospitals")
def api_update_hospitals(body: HospitalsUpdateRequest):
    return update_hospitals(body.adminName, body.hospitals)
