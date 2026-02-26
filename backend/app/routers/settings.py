from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from app.services.settings_service import get_hospitals, update_hospitals, get_work_types, update_work_types

router = APIRouter(tags=["settings"])


class HospitalsUpdateRequest(BaseModel):
    adminName: str
    hospitals: List[str]


class WorkTypesUpdateRequest(BaseModel):
    adminName: str
    workTypes: List[str]


@router.get("/settings/hospitals")
def api_get_hospitals():
    return get_hospitals()


@router.post("/settings/hospitals")
def api_update_hospitals(body: HospitalsUpdateRequest):
    return update_hospitals(body.adminName, body.hospitals)


@router.get("/settings/work-types")
def api_get_work_types():
    return get_work_types()


@router.post("/settings/work-types")
def api_update_work_types(body: WorkTypesUpdateRequest):
    return update_work_types(body.adminName, body.workTypes)
