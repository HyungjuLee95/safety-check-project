from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import io
import datetime
from pathlib import Path
from urllib.parse import quote

from app.schemas.inspection import InspectionSubmission
from app.services.excel_export_service import build_export_filename, build_inspections_excel_bytes
from app.services.pdf_export_service import build_export_pdf_filename, build_inspections_pdf_bytes
from app.services.inspections_service import (
    create_inspection_record,
    list_admin_inspections,
    can_subadmin_handle_inspection,
    list_my_inspections,
    get_my_inspection_detail,
    add_revision,
    cancel_my_inspection,
    approve_inspection,
    reject_inspection,
)
from app.storage.firestore_client import get_firestore_client

router = APIRouter(tags=["inspections"])


def _content_disposition(filename: str, mode: str = "attachment") -> str:
    """
    모바일/브라우저 호환을 위해 filename* 포함 (UTF-8)
    mode: attachment | inline
    """
    safe = filename.replace('"', "")
    disposition = "inline" if str(mode or "").lower() == "inline" else "attachment"
    return f'{disposition}; filename="{safe}"; filename*=UTF-8\'\'{quote(safe)}'


def _parse_categories(categories_str: Optional[str]) -> List[str]:
    return [c.strip() for c in str(categories_str or "").split(",") if c.strip()]


def _fetch_inspection_export_shape(inspection_id: str) -> Dict[str, Any]:
    """
    Firestore 원본 레코드를 가져와서 pdf_export_service가 기대하는 shape로 변환.
    (list_admin_inspections()가 만드는 shape와 최대한 동일)
    """
    client = get_firestore_client()
    snap = client.collection("inspections").document(inspection_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="inspection not found")

    r = snap.to_dict() or {}
    r["id"] = snap.id

    latest = r.get("latestRevision") or {}
    answers = latest.get("answers") or r.get("results") or []

    return {
        "id": r.get("id"),
        "name": r.get("name"),
        "userName": r.get("userName"),
        "date": r.get("date"),
        "hospital": r.get("hospital"),
        "equipmentName": r.get("equipmentName"),
        "workType": r.get("workType"),
        "status": r.get("status"),
        "resultCount": latest.get("resultCount") or r.get("resultCount"),
        "improveCount": latest.get("improveCount") or r.get("improveCount"),
        "rejectReason": r.get("rejectReason") or "",
        "results": answers,
        "signatureBase64": latest.get("signatureBase64") or r.get("signatureBase64"),
        "subadminName": r.get("approvedBy"),
        "subadminSignatureBase64": r.get("subadminSignatureBase64"),
        "createdAt": r.get("createdAt"),
        "updatedAt": r.get("updatedAt"),
    }


@router.post("/inspections")
def submit_inspection(data: InspectionSubmission):
    record = create_inspection_record(data.model_dump())
    return {"status": "success", "id": record["id"]}


@router.get("/inspections")
def admin_list_inspections(
    admin_name: str,
    start_date: str,
    end_date: str,
    requester_role: Optional[str] = None,
    requester_categories: Optional[str] = None,
):
    categories = _parse_categories(requester_categories)
    return list_admin_inspections(
        start_date,
        end_date,
        requester_role=requester_role,
        requester_categories=categories,
    )


@router.get("/inspections/export")
def export_inspections(
    admin_name: str,
    start_date: str,
    end_date: str,
    requester_role: Optional[str] = None,
    requester_categories: Optional[str] = None,
):
    categories = _parse_categories(requester_categories)
    data = list_admin_inspections(
        start_date,
        end_date,
        requester_role=requester_role,
        requester_categories=categories,
    )

    backend_root = Path(__file__).resolve().parents[2]
    template_path = backend_root / "templates" / "EHS_Checklist_HB.xlsx"
    if not template_path.exists():
        raise HTTPException(status_code=500, detail=f"excel template not found: {template_path}")

    try:
        excel_bytes = build_inspections_excel_bytes(data, template_path=str(template_path))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"excel export failed: {exc}")

    stream = io.BytesIO(excel_bytes)
    stream.seek(0)

    filename = build_export_filename(start_date, end_date)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": _content_disposition(filename, mode="attachment")},
    )


@router.get("/inspections/export-pdf")
def export_inspections_pdf(
    admin_name: str,
    start_date: str,
    end_date: str,
    requester_role: Optional[str] = None,
    requester_categories: Optional[str] = None,
    mode: Optional[str] = "attachment",
):
    categories = _parse_categories(requester_categories)
    data = list_admin_inspections(
        start_date,
        end_date,
        requester_role=requester_role,
        requester_categories=categories,
    )

    try:
        pdf_bytes = build_inspections_pdf_bytes(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"pdf export failed: {exc}")

    stream = io.BytesIO(pdf_bytes)
    stream.seek(0)

    filename = build_export_pdf_filename(start_date, end_date)
    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(filename, mode=mode or "attachment")},
    )


# NEW: 단건 PDF 다운로드
@router.get("/inspections/{inspection_id}/export-pdf")
def export_single_inspection_pdf(
    inspection_id: str,
    admin_name: str,
    requester_role: Optional[str] = None,
    requester_categories: Optional[str] = None,
):
    """
    MASTER_ADMIN 상세 화면에서 단건 PDF 다운로드 용도.
    SUB_ADMIN일 경우 카테고리 제한을 동일하게 적용(카테고리 밖이면 403).
    """
    categories = _parse_categories(requester_categories)

    role = str(requester_role or "").strip().upper()
    if role == "SUB_ADMIN" and categories:
        if not can_subadmin_handle_inspection(inspection_id, categories):
            raise HTTPException(status_code=403, detail="subadmin cannot access this category")

    record = _fetch_inspection_export_shape(inspection_id)

    try:
        pdf_bytes = build_inspections_pdf_bytes([record])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"pdf export failed: {exc}")

    stream = io.BytesIO(pdf_bytes)
    stream.seek(0)

    filename = f"inspection_{inspection_id}.pdf"
    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(filename, mode="attachment")},
    )


class ExportSelectedPdfRequest(BaseModel):
    inspectionIds: List[str]
    requester_role: Optional[str] = None
    requester_categories: Optional[str] = None


# NEW: 선택 다건 PDF 다운로드 (체크박스 선택)
@router.post("/inspections/export-pdf-selected")
def export_selected_inspections_pdf(
    body: ExportSelectedPdfRequest,
    admin_name: str,
):
    """
    MASTER_ADMIN 리스트 화면에서 체크된 항목들만 PDF로 묶어 다로드.
    """
    ids = [str(i).strip() for i in (body.inspectionIds or []) if str(i).strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="inspectionIds is required")

    categories = _parse_categories(body.requester_categories)
    role = str(body.requester_role or "").strip().upper()

    records: List[Dict[str, Any]] = []
    for inspection_id in ids:
        if role == "SUB_ADMIN" and categories:
            if not can_subadmin_handle_inspection(inspection_id, categories):
                raise HTTPException(status_code=403, detail="subadmin cannot access this category")
        records.append(_fetch_inspection_export_shape(inspection_id))

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"safety_reports_selected_{ts}.pdf"

    try:
        pdf_bytes = build_inspections_pdf_bytes(records)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"pdf export failed: {exc}")

    stream = io.BytesIO(pdf_bytes)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(filename, mode="attachment")},
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
    subadminCategories: Optional[List[str]] = []


@router.post("/inspections/{inspection_id}/approve")
def approve(inspection_id: str, body: ApproveRequest):
    if not body.signatureBase64 or len(body.signatureBase64.strip()) < 50:
        raise HTTPException(status_code=400, detail="signatureBase64 is required")
    if not body.subadminName or not body.subadminName.strip():
        raise HTTPException(status_code=400, detail="subadminName is required")

    if body.subadminCategories is not None and len(body.subadminCategories) > 0:
        if not can_subadmin_handle_inspection(inspection_id, body.subadminCategories):
            raise HTTPException(status_code=403, detail="subadmin cannot approve this category")

    r = approve_inspection(inspection_id, body.subadminName, body.signatureBase64)
    if not r:
        raise HTTPException(status_code=404, detail="inspection not found")
    return {"status": "ok"}


class RejectRequest(BaseModel):
    subadminName: Optional[str] = None
    reason: Optional[str] = ""
    subadminCategories: Optional[List[str]] = []


@router.post("/inspections/{inspection_id}/reject")
def reject(inspection_id: str, body: RejectRequest):
    if body.subadminCategories is not None and len(body.subadminCategories) > 0:
        if not can_subadmin_handle_inspection(inspection_id, body.subadminCategories):
            raise HTTPException(status_code=403, detail="subadmin cannot reject this category")

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
