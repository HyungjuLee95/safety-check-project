import datetime
import uuid
from typing import Any, Dict, List, Optional

from app.storage.memory_store import INSPECTIONS

# status
STATUS_PENDING = "PENDING"          # 점검자 1차 제출 후 (승인 대기)
STATUS_SUBMITTED = "SUBMITTED"      # 서브관리자 승인 완료
STATUS_REJECTED = "REJECTED"        # 서브관리자 반려
STATUS_CANCELLED = "CANCELLED"      # 점검자 취소


def _normalize_value(value: str) -> str:
    """양호/보통/점검필요 또는 레거시 YES/NO를 표준화한다."""
    if value is None:
        return ""
    v = str(value).strip()
    if not v:
        return ""
    up = v.upper()
    if up == "YES":
        return "양호"
    if up == "NO":
        return "점검필요"
    # 이미 한글...
    return v


def _counts(answers: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(answers or [])
    ok = 0
    improve = 0
    for a in answers or []:
        val = _normalize_value(a.get("value"))
        if val == "양호":
            ok += 1
        if val == "점검필요":
            improve += 1
    return {
        "total": total,
        "ok": ok,
        "improve": improve,
        "resultCount": f"{ok}/{total}" if total else "0/0",
        "improveCount": improve,
    }


def _make_revision(answers: List[Dict[str, Any]], signature_base64: Optional[str]) -> Dict[str, Any]:
    now = datetime.datetime.now().isoformat()
    normalized_answers = []
    for a in answers or []:
        val = _normalize_value(a.get("value"))
        normalized_answers.append({
            "itemId": a.get("itemId"),
            "question": a.get("question"),
            "value": val,
            "comment": a.get("comment") or "",
            "normalized": "OK" if val == "양호" else "IMPROVE" if val == "점검필요" else "NORMAL",
        })

    c = _counts(normalized_answers)
    return {
        "id": f"rev-{uuid.uuid4().hex[:10]}",
        "createdAt": now,
        "answers": normalized_answers,
        "signatureBase64": signature_base64,
        **c,
    }


def create_inspection_record(payload: Dict[str, Any]) -> Dict[str, Any]:
    rec_id = f"rec-{uuid.uuid4().hex[:10]}"
    now = datetime.datetime.now().isoformat()

    answers = payload.get("answers") or []
    signature = payload.get("signatureBase64")
    rev = _make_revision(answers, signature)

    record = {
        "id": rec_id,
        "name": payload.get("userName"),
        "userName": payload.get("userName"),
        "date": payload.get("date"),
        "hospital": payload.get("hospital"),
        "equipmentName": payload.get("equipmentName") or "",
        "workType": payload.get("workType"),
        "checklistVersion": payload.get("checklistVersion", 1),
        "status": STATUS_PENDING,
        "createdAt": now,
        "updatedAt": now,
        "revisions": [rev],
        "latestRevision": rev,
        # admin list 용 필드(기존 프론트 호환)
        "results": rev["answers"],
        "signatureBase64": signature,
        "resultCount": rev["resultCount"],
        "improveCount": rev["improveCount"],
    }

    INSPECTIONS.append(record)
    return record


def list_admin_inspections(start_date: str, end_date: str) -> List[Dict[str, Any]]:
    data = [r for r in INSPECTIONS if start_date <= (r.get("date") or "") <= end_date]
    data.sort(key=lambda r: (r.get("date") or "", r.get("updatedAt") or ""), reverse=True)
    # summary 형태
    out: List[Dict[str, Any]] = []
    for r in data:
        latest = r.get("latestRevision") or {}
        out.append({
            "id": r.get("id"),
            "name": r.get("name"),
            "userName": r.get("userName"),
            "date": r.get("date"),
            "hospital": r.get("hospital"),
            "equipmentName": r.get("equipmentName"),
            "workType": r.get("workType"),
            "status": r.get("status"),
            "resultCount": latest.get("resultCount"),
            "improveCount": latest.get("improveCount"),
            # detail 용으로도 바로 쓸 수 있게 포함
            "results": latest.get("answers") or [],
            "signatureBase64": latest.get("signatureBase64"),
            "createdAt": r.get("createdAt"),
            "updatedAt": r.get("updatedAt"),
        })
    return out


def list_my_inspections(user_name: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    data = [r for r in INSPECTIONS if str(r.get("userName")) == str(user_name)]
    if start_date:
        data = [r for r in data if (r.get("date") or "") >= start_date]
    if end_date:
        data = [r for r in data if (r.get("date") or "") <= end_date]

    data.sort(key=lambda r: (r.get("date") or "", r.get("updatedAt") or ""), reverse=True)
    out: List[Dict[str, Any]] = []
    for r in data:
        latest = r.get("latestRevision") or {}
        out.append({
            "id": r.get("id"),
            "date": r.get("date"),
            "hospital": r.get("hospital"),
            "equipmentName": r.get("equipmentName"),
            "workType": r.get("workType"),
            "status": r.get("status"),
            "improveCount": latest.get("improveCount"),
        })
    return out


def get_my_inspection_detail(user_name: str, date: str, hospital: str, equipment_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    for r in INSPECTIONS:
        if str(r.get("userName")) != str(user_name):
            continue
        if str(r.get("date")) != str(date):
            continue
        if str(r.get("hospital")) != str(hospital):
            continue
        if equipment_name is not None and str(r.get("equipmentName") or "") != str(equipment_name or ""):
            continue

        return {
            "id": r.get("id"),
            "date": r.get("date"),
            "hospital": r.get("hospital"),
            "equipmentName": r.get("equipmentName"),
            "workType": r.get("workType"),
            "status": r.get("status"),
            "latestRevision": r.get("latestRevision"),
        }
    return None


def add_revision(user_name: str, date: str, hospital: str, equipment_name: Optional[str], answers: List[Dict[str, Any]], signature_base64: Optional[str]) -> Optional[Dict[str, Any]]:
    for r in INSPECTIONS:
        if str(r.get("userName")) != str(user_name):
            continue
        if str(r.get("date")) != str(date):
            continue
        if str(r.get("hospital")) != str(hospital):
            continue
        if equipment_name is not None and str(r.get("equipmentName") or "") != str(equipment_name or ""):
            continue

        rev = _make_revision(answers, signature_base64)
        r.setdefault("revisions", []).append(rev)
        r["latestRevision"] = rev
        r["results"] = rev["answers"]
        r["signatureBase64"] = signature_base64
        r["resultCount"] = rev["resultCount"]
        r["improveCount"] = rev["improveCount"]
        r["updatedAt"] = datetime.datetime.now().isoformat()
        # 재제출 시 승인 흐름으로 다시
        r["status"] = STATUS_PENDING
        return r
    return None


def cancel_my_inspection(user_name: str, date: str, hospital: str, equipment_name: Optional[str] = None) -> bool:
    for r in INSPECTIONS:
        if str(r.get("userName")) != str(user_name):
            continue
        if str(r.get("date")) != str(date):
            continue
        if str(r.get("hospital")) != str(hospital):
            continue
        if equipment_name is not None and str(r.get("equipmentName") or "") != str(equipment_name or ""):
            continue

        r["status"] = STATUS_CANCELLED
        r["updatedAt"] = datetime.datetime.now().isoformat()
        return True
    return False


def approve_inspection(inspection_id: str, subadmin_name: Optional[str] = None, signature_base64: Optional[str] = None) -> Optional[Dict[str, Any]]:
    for r in INSPECTIONS:
        if str(r.get("id")) != str(inspection_id):
            continue
        r["status"] = STATUS_SUBMITTED
        r["approvedBy"] = subadmin_name
        r["approvedAt"] = datetime.datetime.now().isoformat()
        # 필요시 서브관리자 서명 저장
        if signature_base64:
            r["subadminSignatureBase64"] = signature_base64
        r["updatedAt"] = datetime.datetime.now().isoformat()
        return r
    return None


def reject_inspection(inspection_id: str, subadmin_name: Optional[str] = None, reason: str = "") -> Optional[Dict[str, Any]]:
    for r in INSPECTIONS:
        if str(r.get("id")) != str(inspection_id):
            continue
        r["status"] = STATUS_REJECTED
        r["rejectedBy"] = subadmin_name
        r["rejectedAt"] = datetime.datetime.now().isoformat()
        r["rejectReason"] = reason
        r["updatedAt"] = datetime.datetime.now().isoformat()
        return r
    return None
