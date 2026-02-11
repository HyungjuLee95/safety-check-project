from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import io

from app.schemas.inspection import InspectionSubmission
from app.services.excel_export_service import build_export_filename, build_inspections_excel_bytes
from app.services.inspections_service import (
    create_inspection_record,
    list_admin_inspections,
    list_my_inspections,
    get_my_inspection_detail,
    add_revision,
    cancel_my_inspection,
    approve_inspection,
    reject_inspection,
)

router = APIRouter(tags=["inspections"])


@router.post("/inspections")
def submit_inspection(data: InspectionSubmission):
    record = create_inspection_record(data.model_dump())
    return {"status": "success", "id": record["id"]}


@router.get("/inspections")
def admin_list_inspections(admin_name: str, start_date: str, end_date: str):
    return list_admin_inspections(start_date, end_date)


@router.get("/inspections/export")
def export_inspections(admin_name: str, start_date: str, end_date: str):
    data = list_admin_inspections(start_date, end_date)

    template_path = "backend/templates/EHS_Checklist_HB.xlsx"
    try:
        excel_bytes = build_inspections_excel_bytes(data, template_path=template_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"excel export failed: {exc}")

    stream = io.BytesIO(excel_bytes)
    stream.seek(0)

    filename = build_export_filename(start_date, end_date)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/me/inspections")
def me_list_inspections(userName: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return list_my_inspections(userName, start_date, end_date)


@router.get("/me/inspections/detail")
def me_inspection_detail(userName: str, date: str, hospital: str, equipmentName: Optional[str] = None):
    detail = get_my_inspection_detail(userName, date, hospital, equipmentName)
    if not detail:
        raise HTTPException(status_code=404, detail="inspection not found")
    return detail


class CancelRequest(BaseModel):
    userName: str
    date: str
    hospital: str
    equipmentName: Optional[str] = None


@router.post("/me/inspections/cancel")
def me_cancel(body: CancelRequest):
    ok = cancel_my_inspection(body.userName, body.date, body.hospital, body.equipmentName)
    if not ok:
        raise HTTPException(status_code=404, detail="inspection not found")
    return {"status": "ok"}


# --- Subadmin approve/reject ---

class ApproveRequest(BaseModel):
    subadminName: str
    signatureBase64: str


@router.post("/inspections/{inspection_id}/approve")
def approve(inspection_id: str, body: ApproveRequest):
    if not body.signatureBase64 or len(body.signatureBase64.strip()) < 50:
        raise HTTPException(status_code=400, detail="signatureBase64 is required")
    if not body.subadminName or not body.subadminName.strip():
        raise HTTPException(status_code=400, detail="subadminName is required")

    r = approve_inspection(inspection_id, body.subadminName, body.signatureBase64)
    if not r:
        raise HTTPException(status_code=404, detail="inspection not found")
    return {"status": "ok"}


class RejectRequest(BaseModel):
    subadminName: Optional[str] = None
    reason: Optional[str] = ""


@router.post("/inspections/{inspection_id}/reject")
def reject(inspection_id: str, body: RejectRequest):
    r = reject_inspection(inspection_id, body.subadminName, body.reason or "")
    if not r:
        raise HTTPException(status_code=404, detail="inspection not found")
    return {"status": "ok"}


class ResubmitRequest(BaseModel):
    userName: str
    date: str
    hospital: str
    equipmentName: Optional[str] = None
    answers: List[Dict[str, Any]]
    signatureBase64: Optional[str] = None


@router.post("/me/inspections/resubmit")
def me_resubmit(body: ResubmitRequest):
    r = add_revision(body.userName, body.date, body.hospital, body.equipmentName, body.answers, body.signatureBase64)
    if not r:
        raise HTTPException(status_code=404, detail="inspection not found")
    return {"status": "ok"}
