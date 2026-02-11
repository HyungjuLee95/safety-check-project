from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, List

from app.services.checklists_service import get_checklist, update_checklist

router = APIRouter(tags=["checklists"])


@router.get("/checklists/{work_type}")
def api_get_checklist(work_type: str):
    return get_checklist(work_type)


class ChecklistItem(BaseModel):
    id: str
    text: str
    order: int


class ChecklistUpdateRequest(BaseModel):
    adminName: str
    workType: str
    items: List[ChecklistItem]


@router.post("/checklists")
def api_update_checklists(body: ChecklistUpdateRequest):
    # Pydantic 모델을 dict로 변환
    items = [it.model_dump() for it in body.items]
    return update_checklist(body.adminName, body.workType, items)
