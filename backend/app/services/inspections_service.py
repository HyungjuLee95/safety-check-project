import datetime
import uuid
from typing import Any, Dict, List, Optional

from app.storage.firestore_client import get_firestore_client

# status
STATUS_PENDING = "PENDING"
STATUS_SUBMITTED = "SUBMITTED"
STATUS_REJECTED = "REJECTED"
STATUS_CANCELLED = "CANCELLED"


def _normalize_value(value: str) -> str:
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
        normalized_answers.append(
            {
                "itemId": a.get("itemId"),
                "question": a.get("question"),
                "value": val,
                "comment": a.get("comment") or "",
                "normalized": "OK" if val == "양호" else "IMPROVE" if val == "점검필요" else "NORMAL",
            }
        )

    c = _counts(normalized_answers)
    return {
        "id": f"rev-{uuid.uuid4().hex[:10]}",
        "createdAt": now,
        "answers": normalized_answers,
        "signatureBase64": signature_base64,
        **c,
    }


def _all_records() -> List[Dict[str, Any]]:
    client = get_firestore_client()
    docs = client.collection("inspections").stream()
    out = []
    for doc in docs:
        data = doc.to_dict() or {}
        data["id"] = doc.id
        out.append(data)
    return out


def _save_record(record: Dict[str, Any]) -> Dict[str, Any]:
    client = get_firestore_client()
    rec_id = str(record.get("id") or f"rec-{uuid.uuid4().hex[:10]}")
    payload = {**record, "id": rec_id}
    client.collection("inspections").document(rec_id).set(payload, merge=True)
    return payload


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
        "results": rev["answers"],
        "signatureBase64": signature,
        "resultCount": rev["resultCount"],
        "improveCount": rev["improveCount"],
    }
    return _save_record(record)


def list_admin_inspections(start_date: str, end_date: str, requester_role: Optional[str] = None, requester_categories: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    data = [r for r in _all_records() if start_date <= (r.get("date") or "") <= end_date]

    role = str(requester_role or "").strip().upper()
    category_set = {str(c).strip() for c in (requester_categories or []) if str(c).strip()}
    if role == "SUB_ADMIN" and category_set:
        data = [r for r in data if str(r.get("workType") or "") in category_set]

    data.sort(key=lambda r: (r.get("date") or "", r.get("updatedAt") or ""), reverse=True)
    out: List[Dict[str, Any]] = []
    for r in data:
        latest = r.get("latestRevision") or {}
        out.append(
            {
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
                "results": latest.get("answers") or [],
                "signatureBase64": latest.get("signatureBase64"),
                "subadminName": r.get("approvedBy"),
                "subadminSignatureBase64": r.get("subadminSignatureBase64"),
                "createdAt": r.get("createdAt"),
                "updatedAt": r.get("updatedAt"),
            }
        )
    return out


def can_subadmin_handle_inspection(inspection_id: str, categories: Optional[List[str]]) -> bool:
    allowed = {str(c).strip() for c in (categories or []) if str(c).strip()}
    if not allowed:
        return False

    for r in _all_records():
        if str(r.get("id")) != str(inspection_id):
            continue
        return str(r.get("workType") or "") in allowed
    return False


def list_my_inspections(user_name: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    data = [r for r in _all_records() if str(r.get("userName")) == str(user_name)]
    if start_date:
        data = [r for r in data if (r.get("date") or "") >= start_date]
    if end_date:
        data = [r for r in data if (r.get("date") or "") <= end_date]

    data.sort(key=lambda r: (r.get("date") or "", r.get("updatedAt") or ""), reverse=True)
    out: List[Dict[str, Any]] = []
    for r in data:
        latest = r.get("latestRevision") or {}
        out.append(
            {
                "id": r.get("id"),
                "date": r.get("date"),
                "hospital": r.get("hospital"),
                "equipmentName": r.get("equipmentName"),
                "workType": r.get("workType"),
                "status": r.get("status"),
                "improveCount": latest.get("improveCount"),
            }
        )
    return out


def _find_record(user_name: str, date: str, hospital: str, equipment_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    for r in _all_records():
        if str(r.get("userName")) != str(user_name):
            continue
        if str(r.get("date")) != str(date):
            continue
        if str(r.get("hospital")) != str(hospital):
            continue
        if equipment_name is not None and str(r.get("equipmentName") or "") != str(equipment_name or ""):
            continue
        return r
    return None


def get_my_inspection_detail(user_name: str, date: str, hospital: str, equipment_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    r = _find_record(user_name, date, hospital, equipment_name)
    if not r:
        return None

    return {
        "id": r.get("id"),
        "date": r.get("date"),
        "hospital": r.get("hospital"),
        "equipmentName": r.get("equipmentName"),
        "workType": r.get("workType"),
        "status": r.get("status"),
        "latestRevision": r.get("latestRevision"),
    }


def add_revision(user_name: str, date: str, hospital: str, equipment_name: Optional[str], answers: List[Dict[str, Any]], signature_base64: Optional[str]) -> Optional[Dict[str, Any]]:
    r = _find_record(user_name, date, hospital, equipment_name)
    if not r:
        return None

    rev = _make_revision(answers, signature_base64)
    r.setdefault("revisions", []).append(rev)
    r["latestRevision"] = rev
    r["results"] = rev["answers"]
    r["signatureBase64"] = signature_base64
    r["resultCount"] = rev["resultCount"]
    r["improveCount"] = rev["improveCount"]
    r["updatedAt"] = datetime.datetime.now().isoformat()
    r["status"] = STATUS_PENDING
    _save_record(r)
    return r


def cancel_my_inspection(user_name: str, date: str, hospital: str, equipment_name: Optional[str] = None) -> bool:
    r = _find_record(user_name, date, hospital, equipment_name)
    if not r:
        return False

    r["status"] = STATUS_CANCELLED
    r["updatedAt"] = datetime.datetime.now().isoformat()
    _save_record(r)
    return True


def approve_inspection(inspection_id: str, subadmin_name: Optional[str] = None, signature_base64: Optional[str] = None) -> Optional[Dict[str, Any]]:
    for r in _all_records():
        if str(r.get("id")) != str(inspection_id):
            continue
        r["status"] = STATUS_SUBMITTED
        r["approvedBy"] = subadmin_name
        r["approvedAt"] = datetime.datetime.now().isoformat()
        if signature_base64:
            r["subadminSignatureBase64"] = signature_base64
        r["updatedAt"] = datetime.datetime.now().isoformat()
        _save_record(r)
        return r
    return None


def reject_inspection(inspection_id: str, subadmin_name: Optional[str] = None, reason: str = "") -> Optional[Dict[str, Any]]:
    for r in _all_records():
        if str(r.get("id")) != str(inspection_id):
            continue
        r["status"] = STATUS_REJECTED
        r["rejectedBy"] = subadmin_name
        r["rejectedAt"] = datetime.datetime.now().isoformat()
        r["rejectReason"] = reason
        r["updatedAt"] = datetime.datetime.now().isoformat()
        _save_record(r)
        return r
    return None
