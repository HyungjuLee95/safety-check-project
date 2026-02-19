

## 2) `backend/app/services/checklists_service.py`
import datetime
from typing import Any, Dict, List

from app.storage.firestore_client import get_firestore_client


def _default_items(work_type: str) -> List[Dict[str, Any]]:
    return [
        {"id": "1", "text": f"[{work_type}] 안전 보호구를 착용했는가?", "order": 1},
        {"id": "2", "text": "작업 전 장비 상태는 양호한가?", "order": 2},
        {"id": "3", "text": "주변 통제 및 위험 요소가 제거되었는가?", "order": 3},
        {"id": "4", "text": "비상 연락망을 숙지하고 있는가?", "order": 4},
        {"id": "5", "text": "작업 종료 후 정리정돈 계획이 있는가?", "order": 5},
    ]


def _normalize_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for i, it in enumerate(items or []):
        _id = str(it.get("id") or (i + 1))
        text = str(it.get("text") or "").strip()
        if not text:
            continue
        order = int(it.get("order") or (i + 1))
        normalized.append({"id": _id, "text": text, "order": order})

    normalized.sort(key=lambda x: x["order"])
    return [{**it, "order": idx + 1} for idx, it in enumerate(normalized)]


def get_checklist(work_type: str) -> Dict[str, Any]:
    key = str(work_type)
    client = get_firestore_client()

    ref = client.collection("checklists").document(key)
    snap = ref.get()
    if not snap.exists:
        initial = {
            "workType": key,
            "version": 1,
            "items": _default_items(key),
            "updatedAt": datetime.datetime.now().isoformat(),
        }
        ref.set(initial)
        return initial

    data = snap.to_dict() or {}
    items = sorted((data.get("items") or []), key=lambda x: int(x.get("order") or 0))
    return {
        "workType": key,
        "version": int(data.get("version") or 1),
        "items": items,
        "updatedAt": data.get("updatedAt"),
    }


def update_checklist(admin_name: str, work_type: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    key = str(work_type)
    normalized = _normalize_items(items)
    now = datetime.datetime.now().isoformat()

    client = get_firestore_client()
    ref = client.collection("checklists").document(key)
    snap = ref.get()
    prev = snap.to_dict() if snap.exists else {}
    version = int((prev or {}).get("version") or 1)
    if prev and (prev.get("items") != normalized):
        version += 1

    ref.set(
        {
            "workType": key,
            "version": version,
            "items": normalized,
            "updatedAt": now,
            "updatedBy": admin_name,
        },
        merge=True,
    )
    return get_checklist(key)
