import datetime
from typing import Any, Dict, List

from app.storage.memory_store import CHECKLISTS


def _default_items(work_type: str) -> List[Dict[str, Any]]:
    return [
        {"id": "1", "text": f"[{work_type}] 안전 보호구를 착용했는가?", "order": 1},
        {"id": "2", "text": "작업 전 장비 상태는 양호한가?", "order": 2},
        {"id": "3", "text": "주변 통제 및 위험 요소가 제거되었는가?", "order": 3},
        {"id": "4", "text": "비상 연락망을 숙지하고 있는가?", "order": 4},
        {"id": "5", "text": "작업 종료 후 정리정돈 계획이 있는가?", "order": 5},
    ]


def get_checklist(work_type: str) -> Dict[str, Any]:
    key = str(work_type)
    if key not in CHECKLISTS:
        CHECKLISTS[key] = {
            "workType": key,
            "version": 1,
            "items": _default_items(key),
            "updatedAt": datetime.datetime.now().isoformat(),
        }

    cl = CHECKLISTS[key]
    items = (cl.get("items") or [])
    items = sorted(items, key=lambda x: int(x.get("order") or 0))

    return {
        "workType": key,
        "version": cl.get("version", 1),
        "items": items,
        "updatedAt": cl.get("updatedAt"),
    }


def update_checklist(admin_name: str, work_type: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    key = str(work_type)
    normalized: List[Dict[str, Any]] = []
    for i, it in enumerate(items or []):
        _id = str(it.get("id") or (i + 1))
        text = str(it.get("text") or "").strip()
        if not text:
            continue
        order = int(it.get("order") or (i + 1))
        normalized.append({"id": _id, "text": text, "order": order})

    normalized.sort(key=lambda x: x["order"])
    # order 재부여
    normalized = [{**it, "order": idx + 1} for idx, it in enumerate(normalized)]

    prev = CHECKLISTS.get(key)
    version = int((prev or {}).get("version", 1))
    # 내용이 바뀌면 version 1 증가 (단순)
    if prev and (prev.get("items") != normalized):
        version += 1

    CHECKLISTS[key] = {
        "workType": key,
        "version": version,
        "items": normalized,
        "updatedAt": datetime.datetime.now().isoformat(),
        "updatedBy": admin_name,
    }

    return get_checklist(key)
